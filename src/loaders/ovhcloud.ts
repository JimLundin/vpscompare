// OVHcloud VPS Provider Loader
// API Documentation: https://eu.api.ovh.com/console/
// Uses public catalog endpoint - no authentication required

interface OVHPricing {
  duration: string;
  pricingMode: string;
  price: number;
}

interface OVHPlan {
  planCode: string;
  invoiceName: string;
  product: string;
  pricings: OVHPricing[];
  configurations?: {
    name: string;
    values: string[];
  }[];
}

interface OVHAddon {
  planCode: string;
  invoiceName: string;
  product: string;
  pricings: OVHPricing[];
}

interface OVHCatalogResponse {
  catalogId: number;
  locale: {
    currencyCode: string;
    subsidiary: string;
    taxRate: number;
  };
  plans: OVHPlan[];
  addons: OVHAddon[];
}

/**
 * Fetches VPS plans from OVHcloud public catalog API.
 * No authentication required - uses public catalog endpoint.
 */
export async function fetchOVHcloudPlans() {
  const subsidiary = process.env.OVH_SUBSIDIARY || 'IE';

  try {
    const response = await fetch(
      `https://eu.api.ovh.com/v1/order/catalog/public/vps?ovhSubsidiary=${subsidiary}`,
      {
        headers: {
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`OVHcloud catalog API error ${response.status}: ${body.slice(0, 200)}`);
    }

    const data: OVHCatalogResponse = await response.json();
    const currency = data.locale?.currencyCode || 'EUR';
    const plans = data.plans || [];

    return plans
      .filter(plan => {
        // Only include VPS plans (filter out legacy or non-VPS items)
        const code = plan.planCode.toLowerCase();
        return code.includes('vps') && !code.includes('legacy');
      })
      .map(plan => {
        // Extract monthly pricing (prefer default pricing mode with P1M duration)
        const monthlyPricing = plan.pricings.find(
          p => p.duration === 'P1M' && p.pricingMode === 'default'
        ) || plan.pricings.find(p => p.duration === 'P1M') || plan.pricings[0];

        const monthlyPrice = monthlyPricing ? monthlyPricing.price / 100000000 : 0;

        // Try to extract specs from plan code or invoice name
        const specs = parseOVHSpecs(plan.planCode, plan.invoiceName);

        // Determine tags
        const tags: string[] = ['europe', 'established'];
        if (monthlyPrice <= 10) tags.push('budget');
        if (monthlyPrice <= 5) tags.push('ultra-budget');
        if (specs.ram >= 8) tags.push('high-memory');
        if (specs.cores >= 4) tags.push('high-performance');

        return {
          id: `ovhcloud-${plan.planCode}`,
          provider: 'OVHcloud',
          name: plan.invoiceName || plan.planCode,
          price: {
            monthly: Math.round(monthlyPrice * 100) / 100,
            currency: currency as 'USD' | 'EUR' | 'GBP'
          },
          specs: {
            cpu: {
              cores: specs.cores,
              type: 'vCPU' as const
            },
            ram: {
              amount: specs.ram,
              unit: 'GB' as const
            },
            storage: {
              amount: specs.storage,
              unit: 'GB' as const,
              type: specs.storageType as 'SSD' | 'NVMe'
            },
            bandwidth: {
              amount: specs.bandwidth,
              unit: 'TB' as const,
              unlimited: specs.unlimitedBandwidth
            }
          },
          features: [
            'Anti-DDoS Protection',
            'KVM/VNC Console',
            'IPv6 Support',
            'Automated Backups',
            'Monitoring',
            'API Access',
            'Snapshot',
            'SLA Guarantee'
          ],
          locations: ['Gravelines, France', 'Strasbourg, France', 'Beauharnois, Canada', 'Singapore', 'Sydney, Australia', 'London, UK', 'Frankfurt, Germany', 'Warsaw, Poland'],
          uptime: {
            percentage: 99.9,
            sla: true
          },
          support: '24/7 Support',
          website: 'https://www.ovhcloud.com/en/vps/',
          featured: plan.planCode.includes('starter') || plan.planCode.includes('value'),
          tags
        };
      })
      .filter(plan => plan.price.monthly > 0);
  } catch (error) {
    console.error('Failed to fetch OVHcloud plans:', error);
    return [];
  }
}

/**
 * Parse VPS specs from OVH plan code and invoice name.
 * OVH plan codes follow patterns like "vps-starter-1-2-20" or "vps-value-2-4-80".
 */
function parseOVHSpecs(planCode: string, invoiceName: string) {
  const defaults = { cores: 1, ram: 2, storage: 20, storageType: 'SSD', bandwidth: 1, unlimitedBandwidth: false };

  // Try to extract specs from invoice name (e.g., "VPS Starter - 1 vCPU - 2 GB RAM - 20 GB SSD")
  const coreMatch = invoiceName.match(/(\d+)\s*v?cpu/i);
  const ramMatch = invoiceName.match(/(\d+)\s*gb\s*ram/i);
  const storageMatch = invoiceName.match(/(\d+)\s*gb\s*(ssd|nvme)/i);

  if (coreMatch || ramMatch || storageMatch) {
    return {
      cores: coreMatch?.[1] ? parseInt(coreMatch[1], 10) : defaults.cores,
      ram: ramMatch?.[1] ? parseInt(ramMatch[1], 10) : defaults.ram,
      storage: storageMatch?.[1] ? parseInt(storageMatch[1], 10) : defaults.storage,
      storageType: storageMatch && storageMatch[2] ? storageMatch[2].toUpperCase() : 'SSD',
      bandwidth: defaults.bandwidth,
      unlimitedBandwidth: invoiceName.toLowerCase().includes('unlimited') || invoiceName.toLowerCase().includes('unmetered')
    };
  }

  // Try to extract from plan code (e.g., "vps-starter-1-2-20")
  const codeMatch = planCode.match(/(\d+)-(\d+)-(\d+)$/);
  if (codeMatch) {
    return {
      cores: parseInt(codeMatch[1]!, 10),
      ram: parseInt(codeMatch[2]!, 10),
      storage: parseInt(codeMatch[3]!, 10),
      storageType: 'SSD',
      bandwidth: defaults.bandwidth,
      unlimitedBandwidth: false
    };
  }

  // Infer from plan tier name
  const code = planCode.toLowerCase();
  if (code.includes('elite') || code.includes('essential-8')) {
    return { cores: 8, ram: 32, storage: 640, storageType: 'NVMe', bandwidth: 2, unlimitedBandwidth: false };
  } else if (code.includes('comfort') || code.includes('essential-4')) {
    return { cores: 4, ram: 8, storage: 160, storageType: 'SSD', bandwidth: 2, unlimitedBandwidth: false };
  } else if (code.includes('value') || code.includes('essential-2')) {
    return { cores: 2, ram: 4, storage: 80, storageType: 'SSD', bandwidth: 1, unlimitedBandwidth: false };
  }

  return defaults;
}
