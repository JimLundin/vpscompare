// Oracle Cloud Infrastructure VPS/Compute Provider Loader
// API Documentation: https://docs.oracle.com/en-us/iaas/Content/Compute/References/computeshapes.htm
// Uses public pricing API - no authentication required

interface OraclePrice {
  model: string;
  value: number;
}

interface OracleCurrencyPricing {
  currencyCode: string;
  prices: OraclePrice[];
}

interface OracleProduct {
  partNumber: string;
  displayName: string;
  metricName: string;
  serviceCategory: string;
  prices: OracleCurrencyPricing[];
}

interface OraclePricingResponse {
  items: OracleProduct[];
}

// Known OCI compute shapes and their specs
const OCI_SHAPES: Record<string, { cores: number; ram: number; storage: number; storageType: string; cpuType: string }> = {
  'VM.Standard.A1.Flex': { cores: 4, ram: 24, storage: 200, storageType: 'NVMe', cpuType: 'vCPU' },
  'VM.Standard.E5.Flex': { cores: 2, ram: 32, storage: 200, storageType: 'NVMe', cpuType: 'vCPU' },
  'VM.Standard.E4.Flex': { cores: 2, ram: 32, storage: 200, storageType: 'NVMe', cpuType: 'vCPU' },
  'VM.Standard3.Flex': { cores: 2, ram: 32, storage: 200, storageType: 'NVMe', cpuType: 'vCPU' },
  'VM.Optimized3.Flex': { cores: 2, ram: 16, storage: 200, storageType: 'NVMe', cpuType: 'vCPU' },
  'VM.Standard.A2.Flex': { cores: 4, ram: 24, storage: 200, storageType: 'NVMe', cpuType: 'vCPU' },
};

/**
 * Fetches compute instance pricing from Oracle Cloud's public pricing API.
 * No authentication required.
 */
export async function fetchOracleCloudPlans() {
  const currency = process.env.ORACLE_CURRENCY || 'USD';

  try {
    const response = await fetch(
      `https://apexapps.oracle.com/pls/apex/cetools/api/v1/products/?serviceCategory=Compute%20-%20Virtual%20Machine&currencyCode=${currency}`,
      {
        headers: {
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Oracle Cloud pricing API error ${response.status}: ${body.slice(0, 200)}`);
    }

    const data: OraclePricingResponse = await response.json();
    const products = data.items || [];

    // Filter for VM compute products (OCPU pricing)
    const vmProducts = products.filter(product =>
      product.serviceCategory === 'Compute - Virtual Machine' &&
      product.metricName?.includes('OCPU') &&
      product.displayName?.startsWith('VM.')
    );

    return vmProducts
      .map(product => {
        // Get hourly (pay-as-you-go) and monthly prices
        const currencyPricing = product.prices.find(p => p.currencyCode === currency);
        if (!currencyPricing) return null;

        const hourlyPrice = currencyPricing.prices.find(p => p.model === 'PAY_AS_YOU_GO');
        const monthlyCommit = currencyPricing.prices.find(p => p.model === 'MONTHLY_COMMIT');

        if (!hourlyPrice && !monthlyCommit) return null;

        // Calculate monthly price (730 hours/month for hourly, or use monthly commit)
        const pricePerOcpuHour = hourlyPrice?.value || 0;
        const shapeSpecs = getShapeSpecs(product.displayName);
        const monthlyPrice = monthlyCommit?.value
          ? monthlyCommit.value * shapeSpecs.cores
          : pricePerOcpuHour * 730 * shapeSpecs.cores;

        if (monthlyPrice <= 0) return null;

        const isArm = product.displayName.includes('A1') || product.displayName.includes('A2');
        const tags: string[] = ['cloud', 'enterprise', 'flexible'];
        if (isArm) tags.push('arm', 'energy-efficient');
        if (monthlyPrice <= 20) tags.push('budget');
        if (shapeSpecs.cores >= 4) tags.push('high-performance');
        if (shapeSpecs.ram >= 16) tags.push('high-memory');

        return {
          id: `oraclecloud-${product.partNumber.toLowerCase()}`,
          provider: 'Oracle Cloud',
          name: product.displayName,
          price: {
            monthly: Math.round(monthlyPrice * 100) / 100,
            currency: currency as 'USD' | 'EUR' | 'GBP'
          },
          specs: {
            cpu: {
              cores: shapeSpecs.cores,
              type: shapeSpecs.cpuType as 'vCPU' | 'CPU'
            },
            ram: {
              amount: shapeSpecs.ram,
              unit: 'GB' as const
            },
            storage: {
              amount: shapeSpecs.storage,
              unit: 'GB' as const,
              type: shapeSpecs.storageType as 'SSD' | 'NVMe'
            },
            bandwidth: {
              amount: 10,
              unit: 'TB' as const,
              unlimited: false
            }
          },
          features: [
            'Always Free Tier Available',
            'NVMe Storage',
            'Flexible Shapes',
            'Secure Boot',
            'Live Migration',
            'Monitoring',
            'Virtual Networking',
            'DDoS Protection'
          ],
          locations: [
            'Ashburn, USA',
            'Phoenix, USA',
            'San Jose, USA',
            'Toronto, Canada',
            'London, UK',
            'Frankfurt, Germany',
            'Amsterdam, Netherlands',
            'Tokyo, Japan',
            'Seoul, South Korea',
            'Sydney, Australia'
          ],
          uptime: {
            percentage: 99.99,
            sla: true
          },
          support: 'Basic Support Included',
          website: 'https://www.oracle.com/cloud/compute/',
          featured: product.displayName.includes('A1') || product.displayName.includes('E5'),
          tags
        };
      })
      .filter((plan): plan is NonNullable<typeof plan> => plan !== null);
  } catch (error) {
    console.error('Failed to fetch Oracle Cloud plans:', error);
    return [];
  }
}

/**
 * Get specs for a known OCI compute shape.
 * Returns defaults for unknown shapes.
 */
function getShapeSpecs(displayName: string) {
  // Try exact match first
  const shapeName = displayName.split(' ')[0] || displayName;
  if (OCI_SHAPES[shapeName]) {
    return OCI_SHAPES[shapeName];
  }

  // Try partial match
  for (const [key, value] of Object.entries(OCI_SHAPES)) {
    if (displayName.includes(key)) {
      return value;
    }
  }

  // Default specs for unknown shapes
  return { cores: 2, ram: 16, storage: 200, storageType: 'NVMe', cpuType: 'vCPU' };
}
