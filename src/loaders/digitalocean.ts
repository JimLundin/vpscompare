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
export async function fetchDigitalOceanPlans() {
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