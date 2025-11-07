// UpCloud VPS Provider Loader
// API Documentation: https://developers.upcloud.com/

interface UpCloudPlan {
  core_number: number;
  memory_amount: number; // in MB
  name: string;
  public_traffic_out: number; // in GB
  storage_size: number; // in GB
  storage_tier: string;
}

interface UpCloudPlansResponse {
  plans: {
    plan: UpCloudPlan[];
  };
}

interface UpCloudPricing {
  prices: {
    zone: {
      [key: string]: {
        [key: string]: {
          price: string; // price per hour
        };
      };
    };
  };
}

interface UpCloudZone {
  id: string;
  description: string;
}

interface UpCloudZonesResponse {
  zones: {
    zone: UpCloudZone[];
  };
}

/**
 * Fetches VPS plans from UpCloud API
 * Requires UPCLOUD_USERNAME and UPCLOUD_PASSWORD environment variables
 */
export async function fetchUpCloudPlans() {
  const username = process.env.UPCLOUD_USERNAME;
  const password = process.env.UPCLOUD_PASSWORD;

  if (!username || !password) {
    console.warn('⚠️  UPCLOUD_USERNAME or UPCLOUD_PASSWORD not set, skipping UpCloud plans');
    return [];
  }

  try {
    // Create Basic Auth header
    const authHeader = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');

    // Fetch plans, pricing, and zones in parallel
    const [plansResponse, pricingResponse, zonesResponse] = await Promise.all([
      fetch('https://api.upcloud.com/1.3/plan', {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      }),
      fetch('https://api.upcloud.com/1.3/price', {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      }),
      fetch('https://api.upcloud.com/1.3/zone', {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      })
    ]);

    if (!plansResponse.ok) {
      throw new Error(`Failed to fetch UpCloud plans: ${plansResponse.status} ${plansResponse.statusText}`);
    }

    if (!pricingResponse.ok) {
      throw new Error(`Failed to fetch UpCloud pricing: ${pricingResponse.status} ${pricingResponse.statusText}`);
    }

    if (!zonesResponse.ok) {
      throw new Error(`Failed to fetch UpCloud zones: ${zonesResponse.status} ${zonesResponse.statusText}`);
    }

    const plansData: UpCloudPlansResponse = await plansResponse.json();
    const pricingData: UpCloudPricing = await pricingResponse.json();
    const zonesData: UpCloudZonesResponse = await zonesResponse.json();

    // Get list of zones
    const zones = zonesData.zones.zone.map(z => z.description);

    // Transform UpCloud plans to our schema
    const transformedPlans = plansData.plans.plan.map(plan => {
      // Convert RAM from MB to GB
      const ramInGB = plan.memory_amount / 1024;

      // Get pricing from first available zone (pricing may vary by zone)
      const firstZone = Object.keys(pricingData.prices.zone)[0];
      const planPricing = pricingData.prices.zone[firstZone]?.[`server_plan_${plan.name}`];

      // Calculate monthly price from hourly (hourly * 730 hours/month)
      const hourlyPrice = planPricing ? parseFloat(planPricing.price) : 0;
      const monthlyPrice = Math.round(hourlyPrice * 730 * 100) / 100;

      // Determine features
      const features: string[] = [
        'MaxIOPS Storage',
        'Full Root Access',
        'DDoS Protection',
        '100% Uptime SLA',
        'Private Networking',
        'Firewall',
        'IPv6 Support'
      ];

      if (plan.storage_tier === 'maxiops') {
        features.push('NVMe Storage');
      }

      // Determine tags
      const tags: string[] = ['europe', 'high-performance'];

      if (monthlyPrice <= 6) {
        tags.push('budget', 'ultra-budget');
      } else if (monthlyPrice <= 12) {
        tags.push('budget');
      }

      if (ramInGB >= 8) {
        tags.push('high-memory');
      }

      if (plan.public_traffic_out >= 2048) { // 2TB+
        tags.push('high-bandwidth');
      }

      if (plan.storage_tier === 'maxiops') {
        tags.push('nvme-storage');
      }

      // Featured plans (popular entry-level and mid-tier options)
      const featured = ['1xCPU-2GB', '2xCPU-4GB', '4xCPU-8GB'].includes(plan.name);

      return {
        id: `upcloud-${plan.name.toLowerCase()}`,
        provider: 'UpCloud',
        name: plan.name,
        price: {
          monthly: monthlyPrice,
          currency: 'USD' as const
        },
        specs: {
          cpu: {
            cores: plan.core_number,
            type: 'vCPU' as const
          },
          ram: {
            amount: ramInGB,
            unit: 'GB' as const
          },
          storage: {
            amount: plan.storage_size,
            unit: 'GB' as const,
            type: plan.storage_tier === 'maxiops' ? 'NVMe' : 'SSD' as 'NVMe' | 'SSD'
          },
          bandwidth: {
            amount: plan.public_traffic_out / 1024, // Convert GB to TB
            unit: 'TB' as const,
            unlimited: false
          }
        },
        features,
        locations: zones.slice(0, 10), // Limit to 10 locations
        uptime: {
          percentage: 100,
          sla: true // UpCloud offers 100% uptime SLA
        },
        support: '24/7 Support',
        website: 'https://upcloud.com',
        tags,
        featured
      };
    });

    console.log(`✅ Fetched ${transformedPlans.length} plans from UpCloud`);
    return transformedPlans;

  } catch (error) {
    console.error('❌ Failed to fetch UpCloud plans:', error);
    return [];
  }
}
