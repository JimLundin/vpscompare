import { defineCollection, z } from 'astro:content';

// Define the VPS plan schema with comprehensive validation
const vpsSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  provider: z.string().min(1, 'Provider name is required'),
  name: z.string().min(1, 'Plan name is required'),
  price: z.object({
    monthly: z.number().positive('Monthly price must be positive'),
    yearly: z.number().positive('Yearly price must be positive').optional(),
    currency: z.enum(['USD', 'EUR', 'GBP'], {
      errorMap: () => ({ message: 'Currency must be USD, EUR, or GBP' })
    })
  }),
  specs: z.object({
    cpu: z.object({
      cores: z.number().int().positive('CPU cores must be a positive integer'),
      type: z.enum(['vCPU', 'CPU', 'Core']).default('vCPU')
    }),
    ram: z.object({
      amount: z.number().positive('RAM amount must be positive'),
      unit: z.enum(['MB', 'GB', 'TB']).default('GB')
    }),
    storage: z.object({
      amount: z.number().positive('Storage amount must be positive'),
      unit: z.enum(['GB', 'TB']).default('GB'),
      type: z.enum(['SSD', 'NVMe', 'HDD', 'EBS']).default('SSD')
    }),
    bandwidth: z.object({
      amount: z.number().nonnegative('Bandwidth amount must be non-negative').optional(),
      unit: z.enum(['GB', 'TB']).default('TB'),
      unlimited: z.boolean().default(false)
    })
  }),
  features: z.array(z.string()).min(1, 'At least one feature is required'),
  locations: z.array(z.string()).min(1, 'At least one location is required'),
  uptime: z.object({
    percentage: z.number().min(0).max(100, 'Uptime percentage must be between 0 and 100'),
    sla: z.boolean().default(false)
  }),
  support: z.string().min(1, 'Support information is required'),
  website: z.string().url('Website must be a valid URL'),
  // Optional fields for future extensibility
  tags: z.array(z.string()).optional(),
  description: z.string().optional(),
  featured: z.boolean().default(false),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
});

// DigitalOcean API Types
interface DOSize {
  slug: string;
  available: boolean;
  memory: number;
  vcpus: number;
  disk: number;
  transfer: number;
  price_monthly: number;
  regions: string[];
  description?: string;
}

interface DORegion {
  slug: string;
  name: string;
  available: boolean;
}

interface DOSizesResponse {
  sizes: DOSize[];
}

interface DORegionsResponse {
  regions: DORegion[];
}

// Helper function to fetch DigitalOcean plans
async function fetchDigitalOceanPlans() {
  const apiKey = process.env.DIGITALOCEAN_API_KEY;
  if (!apiKey) {
    console.warn('DIGITALOCEAN_API_KEY not set, skipping DigitalOcean plans');
    return [];
  }

  try {
    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };

    // Fetch sizes and regions
    const [sizesResponse, regionsResponse] = await Promise.all([
      fetch('https://api.digitalocean.com/v2/sizes', { headers }),
      fetch('https://api.digitalocean.com/v2/regions', { headers })
    ]);

    if (!sizesResponse.ok || !regionsResponse.ok) {
      throw new Error('Failed to fetch DigitalOcean data');
    }

    const [sizesData, regionsData] = await Promise.all([
      sizesResponse.json() as Promise<DOSizesResponse>,
      regionsResponse.json() as Promise<DORegionsResponse>
    ]);

    const sizes = sizesData.sizes || [];
    const regions = regionsData.regions || [];

    return sizes
      .filter((size: DOSize) => size.available && size.memory >= 512)
      .map((size: DOSize) => {
        const availableRegions = regions
          .filter((region: DORegion) => region.available && size.regions.includes(region.slug))
          .map((region: DORegion) => region.name);

        return {
          id: `digitalocean-${size.slug}`,
          provider: 'DigitalOcean',
          name: size.description || `${size.memory}MB / ${size.vcpus} vCPU`,
          price: {
            monthly: size.price_monthly,
            currency: 'USD'
          },
          specs: {
            cpu: {
              cores: size.vcpus,
              type: 'vCPU'
            },
            ram: {
              amount: size.memory >= 1024 ? size.memory / 1024 : size.memory,
              unit: size.memory >= 1024 ? 'GB' : 'MB'
            },
            storage: {
              amount: size.disk,
              unit: 'GB',
              type: 'SSD'
            },
            bandwidth: {
              amount: size.transfer,
              unit: 'TB',
              unlimited: false
            }
          },
          features: [
            'SSD Storage',
            'IPv6',
            'Monitoring',
            'Firewalls',
            'Private Networking',
            'Load Balancers',
            'Snapshots',
            'Backups'
          ],
          locations: availableRegions.slice(0, 10),
          uptime: {
            percentage: 99.99,
            sla: false
          },
          support: '24/7 Community & Ticket Support',
          website: 'https://digitalocean.com',
          featured: ['s-1vcpu-1gb', 's-2vcpu-2gb'].includes(size.slug),
          tags: (() => {
            const tags = ['cloud', 'scalable', 'developer-friendly', 'popular'];
            if (size.price_monthly <= 10) tags.push('budget');
            if (size.vcpus >= 4) tags.push('high-performance');
            if (size.memory >= 8192) tags.push('high-memory');
            return tags;
          })()
        };
      });
  } catch (error) {
    console.error('Failed to fetch DigitalOcean plans:', error);
    return [];
  }
}

// Linode API Types
interface LinodeType {
  id: string;
  label: string;
  class: string;
  vcpus: number;
  memory: number;
  disk: number;
  transfer: number;
  price: {
    monthly: number;
  };
}

interface LinodeRegion {
  status: string;
  label: string;
}

interface LinodeTypesResponse {
  data: LinodeType[];
}

interface LinodeRegionsResponse {
  data: LinodeRegion[];
}

// Helper function to fetch Linode plans
async function fetchLinodePlans() {
  try {
    // Fetch types and regions in parallel - these endpoints don't require API keys
    const [typesResponse, regionsResponse] = await Promise.all([
      fetch('https://api.linode.com/v4/linode/types', {
        headers: { 'Accept': 'application/json' }
      }),
      fetch('https://api.linode.com/v4/regions', {
        headers: { 'Accept': 'application/json' }
      })
    ]);

    if (!typesResponse.ok || !regionsResponse.ok) {
      throw new Error('Failed to fetch Linode data');
    }

    const [typesData, regionsData] = await Promise.all([
      typesResponse.json() as Promise<LinodeTypesResponse>,
      regionsResponse.json() as Promise<LinodeRegionsResponse>
    ]);

    const types = typesData.data || [];
    const regions = regionsData.data || [];

    return types
      .filter((type: LinodeType) => type.class !== 'gpu' && type.class !== 'accelerated') // Filter out GPU/accelerated plans for now
      .map((type: LinodeType) => {
        // Get available regions
        const availableRegions = regions
          .filter((region: LinodeRegion) => region.status === 'ok')
          .map((region: LinodeRegion) => region.label)
          .slice(0, 10); // Limit to first 10 regions

        // Determine class-specific features
        const getClassFeatures = (planClass: string) => {
          const baseFeatures = [
            'SSD Storage',
            'IPv6',
            'Private Networking',
            'DDoS Protection',
            'Monitoring',
            'Backup Service',
            'API Access',
            'Cloud Firewall'
          ];

          switch (planClass) {
            case 'nanode':
              return [...baseFeatures, 'Shared CPU'];
            case 'standard':
              return [...baseFeatures, 'Shared CPU', 'Burstable Performance'];
            case 'dedicated':
              return [...baseFeatures, 'Dedicated CPU', 'Sustained Performance'];
            case 'highmem':
              return [...baseFeatures, 'High Memory', 'Optimized for Memory-Intensive Applications'];
            case 'premium':
              return [...baseFeatures, 'Premium Hardware', 'Enhanced Performance', 'Advanced Networking'];
            default:
              return baseFeatures;
          }
        };

        // Get plan type name
        const getTypeName = (planClass: string) => {
          switch (planClass) {
            case 'nanode': return 'Nanode';
            case 'standard': return 'Standard';
            case 'dedicated': return 'Dedicated CPU';
            case 'highmem': return 'High Memory';
            case 'premium': return 'Premium';
            default: return planClass.charAt(0).toUpperCase() + planClass.slice(1);
          }
        };

        return {
          id: `linode-${type.id}`,
          provider: 'Linode',
          name: `${getTypeName(type.class)} ${type.label}`,
          price: {
            monthly: type.price.monthly,
            currency: 'USD'
          },
          specs: {
            cpu: {
              cores: type.vcpus,
              type: type.class === 'dedicated' ? 'CPU' : 'vCPU'
            },
            ram: {
              amount: type.memory >= 1024 ? type.memory / 1024 : type.memory,
              unit: type.memory >= 1024 ? 'GB' : 'MB'
            },
            storage: {
              amount: type.disk >= 1024 ? type.disk / 1024 : type.disk,
              unit: type.disk >= 1024 ? 'GB' : 'MB',
              type: 'SSD'
            },
            bandwidth: {
              amount: type.transfer >= 1024 ? type.transfer / 1024 : type.transfer,
              unit: type.transfer >= 1024 ? 'TB' : 'GB',
              unlimited: false
            }
          },
          features: getClassFeatures(type.class),
          locations: availableRegions,
          uptime: {
            percentage: 99.9,
            sla: true
          },
          support: '24/7 Support',
          website: 'https://linode.com',
          featured: ['g6-nanode-1', 'g6-standard-1', 'g6-standard-2'].includes(type.id),
          tags: (() => {
            const tags = ['reliable', 'developer-friendly'];
            if (type.price.monthly <= 10) tags.push('budget');
            if (type.class === 'dedicated') tags.push('high-performance', 'dedicated');
            if (type.class === 'highmem') tags.push('high-memory');
            if (type.class === 'premium') tags.push('premium', 'enhanced');
            if (type.class === 'nanode') tags.push('entry-level');
            return tags;
          })()
        };
      });
  } catch (error) {
    console.error('Failed to fetch Linode plans:', error);
    return [];
  }
}

// Hetzner API Types
interface HetznerPrice {
  price_monthly: {
    gross: string;
  };
}

interface HetznerServerType {
  name: string;
  description?: string;
  cores: number;
  memory: number;
  disk: number;
  deprecated: boolean;
  architecture: string;
  cpu_type: string;
  storage_type: string;
  prices: HetznerPrice[];
}

interface HetznerLocation {
  city: string;
  country: string;
}

interface HetznerServerTypesResponse {
  server_types: HetznerServerType[];
}

interface HetznerLocationsResponse {
  locations: HetznerLocation[];
}

// Helper function to fetch Hetzner plans
async function fetchHetznerPlans() {
  const apiKey = process.env.HETZNER_API_KEY;
  if (!apiKey) {
    console.warn('HETZNER_API_KEY not set, skipping Hetzner plans');
    return [];
  }

  try {
    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };

    // Fetch server types and locations
    const [serverTypesResponse, locationsResponse] = await Promise.all([
      fetch('https://api.hetzner.cloud/v1/server_types', { headers }),
      fetch('https://api.hetzner.cloud/v1/locations', { headers })
    ]);

    if (!serverTypesResponse.ok || !locationsResponse.ok) {
      throw new Error('Failed to fetch Hetzner data');
    }

    const [serverTypesData, locationsData] = await Promise.all([
      serverTypesResponse.json() as Promise<HetznerServerTypesResponse>,
      locationsResponse.json() as Promise<HetznerLocationsResponse>
    ]);

    const serverTypes = serverTypesData.server_types || [];
    const locations = locationsData.locations || [];

    return serverTypes
      .filter((serverType: HetznerServerType) => !serverType.deprecated)
      .filter((serverType: HetznerServerType) => serverType.architecture === 'x86' || process.env.HETZNER_INCLUDE_ARM === 'true')
      .map((serverType: HetznerServerType) => {
        const cheapestPrice = serverType.prices.reduce((min: HetznerPrice, current: HetznerPrice) => {
          const currentPrice = parseFloat(current.price_monthly.gross);
          const minPrice = parseFloat(min.price_monthly.gross);
          return currentPrice < minPrice ? current : min;
        });

        const monthlyPrice = parseFloat(cheapestPrice.price_monthly.gross);

        return {
          id: `hetzner-${serverType.name.toLowerCase()}`,
          provider: 'Hetzner',
          name: serverType.name,
          description: serverType.description,
          price: {
            monthly: monthlyPrice,
            currency: 'EUR'
          },
          specs: {
            cpu: {
              cores: serverType.cores,
              type: serverType.cpu_type === 'shared' ? 'vCPU' : 'CPU'
            },
            ram: {
              amount: serverType.memory,
              unit: 'GB'
            },
            storage: {
              amount: serverType.disk,
              unit: 'GB',
              type: serverType.storage_type === 'local' ? 'SSD' : 'NVMe'
            },
            bandwidth: {
              amount: 20,
              unit: 'TB',
              unlimited: false
            }
          },
          features: [
            'SSD Storage',
            'IPv6',
            'Private Networking',
            'Snapshots',
            'Backups',
            'Load Balancers',
            'Floating IPs',
            'DDoS Protection'
          ],
          locations: locations.map((loc: HetznerLocation) => `${loc.city}, ${loc.country}`),
          uptime: {
            percentage: 99.9,
            sla: false
          },
          support: 'Business Hours Support',
          website: 'https://hetzner.com',
          featured: ['cx11', 'cx21', 'cx31'].includes(serverType.name.toLowerCase()),
          tags: (() => {
            const tags = ['europe', 'budget', 'high-bandwidth'];
            if (monthlyPrice <= 5) tags.push('ultra-budget');
            if (serverType.cores >= 4) tags.push('high-performance');
            if (serverType.memory >= 16) tags.push('high-memory');
            if (serverType.architecture === 'arm64') tags.push('arm', 'energy-efficient');
            return tags;
          })()
        };
      });
  } catch (error) {
    console.error('Failed to fetch Hetzner plans:', error);
    return [];
  }
}

// Define collections with inline loaders
const vpsPlans = defineCollection({
  loader: async () => {
    console.log('🚀 Fetching VPS plans from providers...');

    // Fetch from all providers in parallel
    const [digitalOceanPlans, hetznerPlans, linodePlans] = await Promise.all([
      fetchDigitalOceanPlans(),
      fetchHetznerPlans(),
      fetchLinodePlans()
    ]);

    // Combine all plans
    const allPlans = [
      ...digitalOceanPlans,
      ...hetznerPlans,
      ...linodePlans
    ];

    console.log(`✅ Fetched ${allPlans.length} VPS plans total`);
    console.log(`   - DigitalOcean: ${digitalOceanPlans.length} plans`);
    console.log(`   - Hetzner: ${hetznerPlans.length} plans`);
    console.log(`   - Linode: ${linodePlans.length} plans`);

    return allPlans;
  },
  schema: vpsSchema
});

// Export collections
export const collections = {
  vpsPlans
};
