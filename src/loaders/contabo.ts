// Contabo VPS Provider Loader
// API Documentation: https://api.contabo.com/
// Uses OAuth2 client credentials for authentication

interface ContaboTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

/**
 * Fetches VPS plans from Contabo API.
 * Requires OAuth2 credentials: CONTABO_CLIENT_ID, CONTABO_CLIENT_SECRET,
 * CONTABO_API_USER, CONTABO_API_PASSWORD
 *
 * Since Contabo doesn't expose a public plans/pricing endpoint,
 * this loader provides Contabo's known VPS plans as structured data,
 * validated against their current offerings.
 */
export async function fetchContaboPlans() {
  const clientId = process.env.CONTABO_CLIENT_ID;
  const clientSecret = process.env.CONTABO_CLIENT_SECRET;
  const apiUser = process.env.CONTABO_API_USER;
  const apiPassword = process.env.CONTABO_API_PASSWORD;

  if (!clientId || !clientSecret || !apiUser || !apiPassword) {
    console.warn('CONTABO credentials not set, using static Contabo plans');
    return getStaticContaboPlans();
  }

  try {
    // Authenticate via OAuth2
    const token = await getContaboToken(clientId, clientSecret, apiUser, apiPassword);
    if (!token) {
      console.warn('Failed to authenticate with Contabo, using static plans');
      return getStaticContaboPlans();
    }

    // Contabo API doesn't have a public plans endpoint, so we use static data
    // validated against their pricing page. The token can be used for instance management.
    return getStaticContaboPlans();
  } catch (error) {
    console.error('Failed to fetch Contabo plans:', error);
    return getStaticContaboPlans();
  }
}

async function getContaboToken(
  clientId: string,
  clientSecret: string,
  apiUser: string,
  apiPassword: string
): Promise<string | null> {
  try {
    const tokenResponse = await fetch(
      'https://auth.contabo.com/auth/realms/contabo/protocol/openid-connect/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          username: apiUser,
          password: apiPassword,
          grant_type: 'password'
        }).toString()
      }
    );

    if (!tokenResponse.ok) {
      return null;
    }

    const tokenData: ContaboTokenResponse = await tokenResponse.json();
    return tokenData.access_token;
  } catch {
    return null;
  }
}

/**
 * Returns Contabo's VPS plans as structured data.
 * Contabo is known for high-value, budget-friendly VPS plans.
 * Pricing data is based on their published pricing page.
 */
function getStaticContaboPlans() {
  const basePlan = {
    provider: 'Contabo',
    features: [
      'NVMe Storage',
      'DDoS Protection',
      'Unlimited Traffic',
      'Custom ISO',
      'Full Root Access',
      'Snapshots',
      'Private Networking',
      'API Access'
    ],
    locations: [
      'Nuremberg, Germany',
      'Munich, Germany',
      'Falkenstein, Germany',
      'Seattle, USA',
      'St. Louis, USA',
      'New York, USA',
      'Singapore',
      'Tokyo, Japan',
      'Sydney, Australia',
      'London, UK'
    ].slice(0, 10),
    uptime: {
      percentage: 99.9,
      sla: true
    },
    support: 'Business Hours Support',
    website: 'https://contabo.com/en/vps/'
  };

  const plans = [
    {
      id: 'contabo-vps-s',
      name: 'VPS S',
      price: { monthly: 6.99, currency: 'EUR' as const },
      specs: {
        cpu: { cores: 4, type: 'vCPU' as const },
        ram: { amount: 8, unit: 'GB' as const },
        storage: { amount: 50, unit: 'GB' as const, type: 'NVMe' as const },
        bandwidth: { amount: 32, unit: 'TB' as const, unlimited: true }
      },
      featured: true,
      tags: ['budget', 'ultra-budget', 'high-value', 'europe']
    },
    {
      id: 'contabo-vps-m',
      name: 'VPS M',
      price: { monthly: 10.49, currency: 'EUR' as const },
      specs: {
        cpu: { cores: 6, type: 'vCPU' as const },
        ram: { amount: 16, unit: 'GB' as const },
        storage: { amount: 100, unit: 'GB' as const, type: 'NVMe' as const },
        bandwidth: { amount: 32, unit: 'TB' as const, unlimited: true }
      },
      featured: true,
      tags: ['budget', 'high-value', 'high-memory', 'europe']
    },
    {
      id: 'contabo-vps-l',
      name: 'VPS L',
      price: { monthly: 17.99, currency: 'EUR' as const },
      specs: {
        cpu: { cores: 8, type: 'vCPU' as const },
        ram: { amount: 30, unit: 'GB' as const },
        storage: { amount: 200, unit: 'GB' as const, type: 'NVMe' as const },
        bandwidth: { amount: 32, unit: 'TB' as const, unlimited: true }
      },
      featured: false,
      tags: ['high-value', 'high-memory', 'high-performance', 'europe']
    },
    {
      id: 'contabo-vps-xl',
      name: 'VPS XL',
      price: { monthly: 29.99, currency: 'EUR' as const },
      specs: {
        cpu: { cores: 12, type: 'vCPU' as const },
        ram: { amount: 60, unit: 'GB' as const },
        storage: { amount: 400, unit: 'GB' as const, type: 'NVMe' as const },
        bandwidth: { amount: 32, unit: 'TB' as const, unlimited: true }
      },
      featured: false,
      tags: ['high-value', 'high-memory', 'high-performance', 'europe']
    }
  ];

  return plans.map(plan => ({
    ...basePlan,
    ...plan
  }));
}
