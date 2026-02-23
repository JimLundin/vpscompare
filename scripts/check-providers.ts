#!/usr/bin/env npx tsx
/**
 * Provider connectivity check script.
 * Tests each VPS provider's API to verify credentials and connectivity.
 *
 * Usage:
 *   npx tsx scripts/check-providers.ts
 *   npm run check:providers
 *
 * Set API keys in .env (copy from .env.example) before running.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env file manually (no extra deps needed)
function loadEnv() {
  try {
    const envPath = resolve(process.cwd(), '.env');
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env file doesn't exist, rely on environment variables
  }
}

loadEnv();

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
    console.log('Some providers failed. Check your .env file.');
    console.log('Copy .env.example to .env and fill in your API keys.');
  }

  process.exit(allOk ? 0 : 1);
}

main();
