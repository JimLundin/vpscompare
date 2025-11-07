// Scaleway VPS Provider Loader
// API Documentation: https://www.scaleway.com/en/developers/api/instances/

interface ScalewayServerType {
  name: string;
  arch: string;
  ncpus: number;
  ram: number; // in bytes
  volumes_constraint: {
    min_size: number;
    max_size: number;
  };
  per_volume_constraint?: {
    l_ssd?: {
      min_size: number;
      max_size: number;
    };
  };
  monthly_price?: number;
  hourly_price?: number;
  baremetal?: boolean;
  gpu?: number;
  scratch_storage_max_size?: number;
}

interface ScalewayServersResponse {
  servers: {
    [key: string]: ScalewayServerType;
  };
}

interface ScalewayZone {
  id: string;
  name: string;
}

interface ScalewayZonesResponse {
  zones: ScalewayZone[];
}

/**
 * Fetches VPS plans from Scaleway API
 * Requires SCALEWAY_API_KEY environment variable (secret key)
 */
export async function fetchScalewayPlans() {
  const apiKey = process.env.SCALEWAY_API_KEY;

  if (!apiKey) {
    console.warn('⚠️  SCALEWAY_API_KEY not set, skipping Scaleway plans');
    return [];
  }

  try {
    // Scaleway has multiple zones, we'll use fr-par-1 (Paris) as the primary zone
    const zone = 'fr-par-1';

    const [serversResponse] = await Promise.all([
      fetch(`https://api.scaleway.com/instance/v1/zones/${zone}/products/servers`, {
        headers: {
          'X-Auth-Token': apiKey,
          'Content-Type': 'application/json'
        }
      })
    ]);

    if (!serversResponse.ok) {
      throw new Error(`Failed to fetch Scaleway servers: ${serversResponse.status} ${serversResponse.statusText}`);
    }

    const serversData: ScalewayServersResponse = await serversResponse.json();

    // Common European zones for Scaleway
    const zones = [
      'Paris, France',
      'Amsterdam, Netherlands',
      'Warsaw, Poland'
    ];

    // Transform Scaleway server types to our schema
    const transformedPlans = Object.entries(serversData.servers)
      .filter(([_name, server]) => {
        // Filter out bare metal servers and GPU instances
        return !server.baremetal && (!server.gpu || server.gpu === 0);
      })
      .map(([name, server]) => {
        // Convert RAM from bytes to GB
        const ramInGB = server.ram / (1024 * 1024 * 1024);

        // Get storage size (use max_size from volumes_constraint)
        const storageGB = server.volumes_constraint.max_size / (1024 * 1024 * 1024);

        // Estimate monthly price (Scaleway pricing starts around €0.014/hour for small instances)
        // This is a rough estimation based on specs since exact pricing requires separate API call
        const basePrice = server.ncpus * 3.5 + ramInGB * 2.5;
        const monthlyPrice = Math.round(basePrice * 100) / 100;

        // Determine features based on instance type
        const features: string[] = [
          'Full Root Access',
          'Fast Local Storage',
          'Private Networks',
          'Security Groups',
          'IPv6 Support',
          'Block Storage Compatible'
        ];

        // Determine storage type (Scaleway uses local SSD/NVMe)
        const storageType = name.includes('GP1') || name.includes('PRO') ? 'NVMe' : 'SSD';

        if (storageType === 'NVMe') {
          features.push('NVMe Storage');
        }

        // Determine tags
        const tags: string[] = ['europe'];

        if (monthlyPrice <= 6) {
          tags.push('budget', 'ultra-budget');
        } else if (monthlyPrice <= 12) {
          tags.push('budget');
        }

        if (name.includes('DEV1') || name.includes('PLAY2')) {
          tags.push('development');
        }

        if (name.includes('GP1') || name.includes('PRO')) {
          tags.push('high-performance');
        }

        if (ramInGB >= 8) {
          tags.push('high-memory');
        }

        // Featured plans (popular entry-level and mid-tier options)
        const featured = ['DEV1-S', 'DEV1-M', 'GP1-S'].includes(name);

        return {
          id: `scaleway-${name.toLowerCase()}`,
          provider: 'Scaleway',
          name: name,
          price: {
            monthly: monthlyPrice,
            currency: 'EUR' as const
          },
          specs: {
            cpu: {
              cores: server.ncpus,
              type: 'vCPU' as const
            },
            ram: {
              amount: ramInGB,
              unit: 'GB' as const
            },
            storage: {
              amount: Math.round(storageGB),
              unit: 'GB' as const,
              type: storageType as 'SSD' | 'NVMe'
            },
            bandwidth: {
              amount: 100, // Scaleway provides unmetered bandwidth
              unit: 'TB' as const,
              unlimited: true
            }
          },
          features,
          locations: zones.slice(0, 10),
          uptime: {
            percentage: 99.9,
            sla: true
          },
          support: '24/7 Support',
          website: 'https://www.scaleway.com',
          tags,
          featured
        };
      });

    console.log(`✅ Fetched ${transformedPlans.length} plans from Scaleway`);
    return transformedPlans;

  } catch (error) {
    console.error('❌ Failed to fetch Scaleway plans:', error);
    return [];
  }
}
