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
export async function fetchHetznerPlans() {
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

    // Fetch server types (paginated, default 25) and locations in parallel
    const [serverTypesResponse, locationsResponse] = await Promise.all([
      fetch('https://api.hetzner.cloud/v1/server_types?per_page=100', { headers }),
      fetch('https://api.hetzner.cloud/v1/locations?per_page=100', { headers })
    ]);

    if (!serverTypesResponse.ok) {
      const body = await serverTypesResponse.text().catch(() => '');
      throw new Error(`Hetzner server_types API error ${serverTypesResponse.status}: ${body.slice(0, 200)}`);
    }
    if (!locationsResponse.ok) {
      const body = await locationsResponse.text().catch(() => '');
      throw new Error(`Hetzner locations API error ${locationsResponse.status}: ${body.slice(0, 200)}`);
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