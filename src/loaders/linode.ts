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
export async function fetchLinodePlans() {
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