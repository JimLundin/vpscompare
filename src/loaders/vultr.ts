// Vultr VPS Provider Loader
// API Documentation: https://www.vultr.com/api/

interface VultrPlan {
  id: string;
  vcpu_count: number;
  ram: number; // in MB
  disk: number; // in GB
  bandwidth: number; // in GB
  monthly_cost: number; // in USD
  type: string;
  locations: string[];
}

interface VultrRegion {
  id: string;
  city: string;
  country: string;
  continent: string;
  options: string[];
}

interface VultrPlansResponse {
  plans: VultrPlan[];
  meta?: {
    total: number;
  };
}

interface VultrRegionsResponse {
  regions: VultrRegion[];
}

/**
 * Fetches VPS plans from Vultr API
 * Requires VULTR_API_KEY environment variable
 */
export async function fetchVultrPlans() {
  const apiKey = process.env.VULTR_API_KEY;

  if (!apiKey) {
    console.warn('⚠️  VULTR_API_KEY not set, skipping Vultr plans');
    return [];
  }

  try {
    // Fetch plans and regions in parallel
    const [plansResponse, regionsResponse] = await Promise.all([
      fetch('https://api.vultr.com/v2/plans', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }),
      fetch('https://api.vultr.com/v2/regions', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      })
    ]);

    if (!plansResponse.ok) {
      throw new Error(`Failed to fetch Vultr plans: ${plansResponse.status} ${plansResponse.statusText}`);
    }

    if (!regionsResponse.ok) {
      throw new Error(`Failed to fetch Vultr regions: ${regionsResponse.status} ${regionsResponse.statusText}`);
    }

    const plansData: VultrPlansResponse = await plansResponse.json();
    const regionsData: VultrRegionsResponse = await regionsResponse.json();

    // Create a map of region IDs to formatted names
    const regionMap = new Map<string, string>();
    regionsData.regions.forEach(region => {
      regionMap.set(region.id, `${region.city}, ${region.country}`);
    });

    // Transform Vultr plans to our schema
    const transformedPlans = plansData.plans
      .filter(plan => {
        // Filter out plans that might not be general compute instances
        // Keep vc2 (Cloud Compute), vhf (High Frequency), vhp (High Performance)
        return ['vc2', 'vhf', 'vhp', 'vdc'].includes(plan.type);
      })
      .map(plan => {
        // Convert RAM from MB to GB
        const ramInGB = plan.ram / 1024;

        // Get location names (limit to 10)
        const locations = plan.locations
          .slice(0, 10)
          .map(locId => regionMap.get(locId) || locId);

        // Determine features based on plan type
        const features: string[] = [];

        if (plan.type === 'vc2') {
          features.push('Cloud Compute', 'DDoS Protection', '100% SSD Storage');
        } else if (plan.type === 'vhf') {
          features.push('High Frequency', '3 GHz+ CPU', 'NVMe Storage', 'DDoS Protection');
        } else if (plan.type === 'vhp') {
          features.push('High Performance', 'Latest CPU', 'NVMe Storage', 'DDoS Protection');
        } else if (plan.type === 'vdc') {
          features.push('Dedicated CPU', '100% Dedicated Resources', 'NVMe Storage');
        }

        features.push('Full Root Access', 'IPv6 Support');

        // Determine storage type based on plan type
        const storageType = (plan.type === 'vhf' || plan.type === 'vhp' || plan.type === 'vdc') ? 'NVMe' : 'SSD';

        // Determine CPU type
        const cpuType = plan.type === 'vdc' ? 'CPU' : 'vCPU';

        // Determine tags
        const tags: string[] = ['global'];

        if (plan.monthly_cost <= 6) {
          tags.push('budget', 'ultra-budget');
        } else if (plan.monthly_cost <= 12) {
          tags.push('budget');
        }

        if (plan.type === 'vhf' || plan.type === 'vhp') {
          tags.push('high-performance');
        }

        if (plan.type === 'vdc') {
          tags.push('dedicated', 'high-performance');
        }

        if (ramInGB >= 8) {
          tags.push('high-memory');
        }

        if (plan.bandwidth >= 2048) { // 2TB+
          tags.push('high-bandwidth');
        }

        // Featured plans (popular entry-level and mid-tier options)
        const featured = ['vc2-1c-1gb', 'vc2-1c-2gb', 'vc2-2c-4gb'].includes(plan.id);

        return {
          id: `vultr-${plan.id}`,
          provider: 'Vultr',
          name: plan.id.toUpperCase(),
          price: {
            monthly: plan.monthly_cost,
            currency: 'USD' as const
          },
          specs: {
            cpu: {
              cores: plan.vcpu_count,
              type: cpuType as 'vCPU' | 'CPU'
            },
            ram: {
              amount: ramInGB,
              unit: 'GB' as const
            },
            storage: {
              amount: plan.disk,
              unit: 'GB' as const,
              type: storageType as 'SSD' | 'NVMe'
            },
            bandwidth: {
              amount: plan.bandwidth / 1024, // Convert GB to TB
              unit: 'TB' as const,
              unlimited: false
            }
          },
          features,
          locations,
          uptime: {
            percentage: 99.99,
            sla: true // Vultr offers 100% uptime SLA
          },
          support: '24/7 Support',
          website: 'https://www.vultr.com',
          tags,
          featured
        };
      });

    console.log(`✅ Fetched ${transformedPlans.length} plans from Vultr`);
    return transformedPlans;

  } catch (error) {
    console.error('❌ Failed to fetch Vultr plans:', error);
    return [];
  }
}
