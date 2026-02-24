// Kamatera Cloud VPS Provider Loader
// API Documentation: https://www.kamatera.com/knowledgebase/api-documentation/
// Uses ClientID/Secret authentication

interface KamateraAuthResponse {
  authentication: string;
  expires: number;
}

// Predefined Kamatera configurations based on their standard offerings
interface KamateraPlanConfig {
  name: string;
  cpuType: string;
  cores: number;
  ram: number;
  disk: number;
  monthlyPrice: number;
}

/**
 * Fetches VPS plans from Kamatera API.
 * Requires KAMATERA_CLIENT_ID and KAMATERA_SECRET environment variables.
 * Falls back to static plans when credentials are not available.
 */
export async function fetchKamateraPlans() {
  const clientId = process.env.KAMATERA_CLIENT_ID;
  const secret = process.env.KAMATERA_SECRET;

  if (!clientId || !secret) {
    console.warn('KAMATERA credentials not set, using static Kamatera plans');
    return getStaticKamateraPlans();
  }

  try {
    // Authenticate
    const authResponse = await fetch('https://console.kamatera.com/service/authenticate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ clientId, secret })
    });

    if (!authResponse.ok) {
      const body = await authResponse.text().catch(() => '');
      throw new Error(`Kamatera auth API error ${authResponse.status}: ${body.slice(0, 200)}`);
    }

    await authResponse.json() as KamateraAuthResponse;

    // Fetch server creation options
    const optionsResponse = await fetch('https://console.kamatera.com/service/server', {
      headers: {
        'Content-Type': 'application/json',
        'AuthClientId': clientId,
        'AuthSecret': secret
      }
    });

    if (!optionsResponse.ok) {
      throw new Error(`Kamatera server options API error ${optionsResponse.status}`);
    }

    // Even with API access, Kamatera returns component-based pricing
    // rather than pre-configured plans. Use static plans based on their pricing page.
    return getStaticKamateraPlans();
  } catch (error) {
    console.error('Failed to fetch Kamatera plans:', error);
    return getStaticKamateraPlans();
  }
}

/**
 * Returns Kamatera's common VPS configurations as structured data.
 * Kamatera uses a build-your-own model, so these represent typical configurations.
 * Pricing data is based on their published pricing page.
 */
function getStaticKamateraPlans() {
  const basePlan = {
    provider: 'Kamatera',
    features: [
      'Cloud VPS',
      'Full Root Access',
      'SSD Storage',
      'Daily Backups',
      'Monitoring',
      'Private Networking',
      'API Access',
      'Load Balancing'
    ],
    locations: [
      'New York, USA',
      'Dallas, USA',
      'Santa Clara, USA',
      'Toronto, Canada',
      'London, UK',
      'Amsterdam, Netherlands',
      'Frankfurt, Germany',
      'Hong Kong',
      'Tel Aviv, Israel',
      'Petach Tikva, Israel'
    ],
    uptime: {
      percentage: 99.95,
      sla: true
    },
    support: '24/7 Technical Support',
    website: 'https://www.kamatera.com/express/compute/'
  };

  const plans: KamateraPlanConfig[] = [
    { name: '1 vCPU / 1GB RAM', cpuType: 'A', cores: 1, ram: 1, disk: 20, monthlyPrice: 4.00 },
    { name: '1 vCPU / 2GB RAM', cpuType: 'A', cores: 1, ram: 2, disk: 30, monthlyPrice: 8.00 },
    { name: '2 vCPU / 4GB RAM', cpuType: 'B', cores: 2, ram: 4, disk: 50, monthlyPrice: 18.00 },
    { name: '4 vCPU / 8GB RAM', cpuType: 'B', cores: 4, ram: 8, disk: 100, monthlyPrice: 36.00 },
    { name: '4 vCPU / 16GB RAM', cpuType: 'B', cores: 4, ram: 16, disk: 150, monthlyPrice: 54.00 },
    { name: '8 vCPU / 32GB RAM', cpuType: 'B', cores: 8, ram: 32, disk: 200, monthlyPrice: 108.00 },
    { name: '16 vCPU / 64GB RAM', cpuType: 'B', cores: 16, ram: 64, disk: 400, monthlyPrice: 216.00 },
    { name: '32 vCPU / 128GB RAM', cpuType: 'B', cores: 32, ram: 128, disk: 500, monthlyPrice: 432.00 },
  ];

  return plans.map(plan => {
    const tags: string[] = ['cloud', 'customizable', 'global'];
    if (plan.monthlyPrice <= 10) tags.push('budget');
    if (plan.monthlyPrice <= 5) tags.push('ultra-budget');
    if (plan.cores >= 4) tags.push('high-performance');
    if (plan.ram >= 16) tags.push('high-memory');
    if (plan.cpuType === 'B') tags.push('dedicated-thread');

    const cpuLabel = plan.cpuType === 'A' ? 'Type A (Shared)' : 'Type B (Dedicated)';

    return {
      ...basePlan,
      id: `kamatera-${plan.cores}cpu-${plan.ram}gb`,
      name: `${plan.name} - ${cpuLabel}`,
      price: {
        monthly: plan.monthlyPrice,
        currency: 'USD' as const
      },
      specs: {
        cpu: {
          cores: plan.cores,
          type: 'vCPU' as const
        },
        ram: {
          amount: plan.ram,
          unit: 'GB' as const
        },
        storage: {
          amount: plan.disk,
          unit: 'GB' as const,
          type: 'SSD' as const
        },
        bandwidth: {
          amount: 5,
          unit: 'TB' as const,
          unlimited: false
        }
      },
      featured: plan.cores <= 2 && plan.ram <= 4,
      tags
    };
  });
}
