#!/usr/bin/env npx tsx
/**
 * Provider connectivity check script.
 * Tests each VPS provider's API to verify credentials and connectivity.
 *
 * Usage:
 *   npm run check:providers
 *
 * API keys are read from environment variables.
 * In CI, these come from GitHub Actions secrets.
 *
 * Required GitHub secrets:
 *   DIGITALOCEAN_API_KEY, HETZNER_API_KEY, VULTR_API_KEY,
 *   UPCLOUD_USERNAME, UPCLOUD_PASSWORD, SCALEWAY_API_KEY
 */

interface ProviderCheck {
  name: string;
  check: () => Promise<{ ok: boolean; plans: number; message: string }>;
}

const providers: ProviderCheck[] = [
  {
    name: 'Linode',
    async check() {
      const res = await fetch('https://api.linode.com/v4/linode/types', {
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) return { ok: false, plans: 0, message: `HTTP ${res.status}` };
      const data = await res.json();
      const count = data.data?.length ?? 0;
      return { ok: true, plans: count, message: 'No API key required' };
    }
  },
  {
    name: 'DigitalOcean',
    async check() {
      const key = process.env.DIGITALOCEAN_API_KEY;
      if (!key || key.includes('your_')) return { ok: false, plans: 0, message: 'DIGITALOCEAN_API_KEY not set' };
      const res = await fetch('https://api.digitalocean.com/v2/sizes?per_page=1', {
        headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        return { ok: false, plans: 0, message: `HTTP ${res.status}: ${body.slice(0, 100)}` };
      }
      const data = await res.json();
      const total = data.meta?.total ?? data.sizes?.length ?? 0;
      return { ok: true, plans: total, message: 'Authenticated' };
    }
  },
  {
    name: 'Hetzner',
    async check() {
      const key = process.env.HETZNER_API_KEY;
      if (!key || key.includes('your_')) return { ok: false, plans: 0, message: 'HETZNER_API_KEY not set' };
      const res = await fetch('https://api.hetzner.cloud/v1/server_types?per_page=1', {
        headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        return { ok: false, plans: 0, message: `HTTP ${res.status}: ${body.slice(0, 100)}` };
      }
      const data = await res.json();
      const total = data.meta?.pagination?.total_entries ?? data.server_types?.length ?? 0;
      return { ok: true, plans: total, message: 'Authenticated' };
    }
  },
  {
    name: 'Vultr',
    async check() {
      const key = process.env.VULTR_API_KEY;
      if (!key || key.includes('your_')) return { ok: false, plans: 0, message: 'VULTR_API_KEY not set' };
      const res = await fetch('https://api.vultr.com/v2/plans?per_page=1', {
        headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        return { ok: false, plans: 0, message: `HTTP ${res.status}: ${body.slice(0, 100)}` };
      }
      const data = await res.json();
      const total = data.meta?.total ?? data.plans?.length ?? 0;
      return { ok: true, plans: total, message: 'Authenticated' };
    }
  },
  {
    name: 'UpCloud',
    async check() {
      const username = process.env.UPCLOUD_USERNAME;
      const password = process.env.UPCLOUD_PASSWORD;
      if (!username || username.includes('your_') || !password || password.includes('your_')) {
        return { ok: false, plans: 0, message: 'UPCLOUD_USERNAME or UPCLOUD_PASSWORD not set' };
      }
      const auth = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
      const res = await fetch('https://api.upcloud.com/1.3/plan', {
        headers: { 'Authorization': auth, 'Content-Type': 'application/json' }
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        return { ok: false, plans: 0, message: `HTTP ${res.status}: ${body.slice(0, 100)}` };
      }
      const data = await res.json();
      const count = data.plans?.plan?.length ?? 0;
      return { ok: true, plans: count, message: 'Authenticated' };
    }
  },
  {
    name: 'Scaleway',
    async check() {
      const key = process.env.SCALEWAY_API_KEY;
      if (!key || key.includes('your_')) return { ok: false, plans: 0, message: 'SCALEWAY_API_KEY not set' };
      const res = await fetch('https://api.scaleway.com/instance/v1/zones/fr-par-1/products/servers', {
        headers: { 'X-Auth-Token': key, 'Content-Type': 'application/json' }
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        return { ok: false, plans: 0, message: `HTTP ${res.status}: ${body.slice(0, 100)}` };
      }
      const data = await res.json();
      const count = Object.keys(data.servers ?? {}).length;
      return { ok: true, plans: count, message: 'Authenticated' };
    }
  }
];

async function main() {
  console.log('VPS Provider Connectivity Check');
  console.log('================================\n');

  let allOk = true;

  for (const provider of providers) {
    process.stdout.write(`  ${provider.name.padEnd(15)}`);
    try {
      const result = await provider.check();
      if (result.ok) {
        console.log(`OK    ${String(result.plans).padStart(4)} plans    ${result.message}`);
      } else {
        console.log(`FAIL                 ${result.message}`);
        allOk = false;
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.log(`ERR                  ${msg.slice(0, 60)}`);
      allOk = false;
    }
  }

  console.log('\n================================');
  if (allOk) {
    console.log('All providers connected successfully!');
  } else {
    console.log('Some providers failed. Ensure the required environment variables are set.');
    console.log('In GitHub Actions, add them as repository secrets.');
  }

  process.exit(allOk ? 0 : 1);
}

main();
