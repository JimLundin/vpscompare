import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchContaboPlans } from './contabo';

describe('Contabo Loader', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('API Key Validation', () => {
    it('should return static plans when credentials are not set', async () => {
      delete process.env.CONTABO_CLIENT_ID;
      delete process.env.CONTABO_CLIENT_SECRET;
      delete process.env.CONTABO_API_USER;
      delete process.env.CONTABO_API_PASSWORD;
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await fetchContaboPlans();

      expect(result.length).toBeGreaterThan(0);
      expect(consoleWarnSpy).toHaveBeenCalledWith('CONTABO credentials not set, using static Contabo plans');
    });

    it('should return static plans when only some credentials are set', async () => {
      process.env.CONTABO_CLIENT_ID = 'test-id';
      delete process.env.CONTABO_CLIENT_SECRET;
      delete process.env.CONTABO_API_USER;
      delete process.env.CONTABO_API_PASSWORD;
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await fetchContaboPlans();

      expect(result.length).toBeGreaterThan(0);
      expect(consoleWarnSpy).toHaveBeenCalledWith('CONTABO credentials not set, using static Contabo plans');
    });
  });

  describe('Static Plans', () => {
    it('should return valid static plans with correct structure', async () => {
      delete process.env.CONTABO_CLIENT_ID;
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await fetchContaboPlans();

      expect(result.length).toBe(4);

      for (const plan of result) {
        expect(plan.provider).toBe('Contabo');
        expect(plan.id).toMatch(/^contabo-vps-/);
        expect(plan.price.monthly).toBeGreaterThan(0);
        expect(plan.price.currency).toBe('EUR');
        expect(plan.specs.cpu.cores).toBeGreaterThan(0);
        expect(plan.specs.ram.amount).toBeGreaterThan(0);
        expect(plan.specs.storage.amount).toBeGreaterThan(0);
        expect(plan.features.length).toBeGreaterThan(0);
        expect(plan.locations.length).toBeGreaterThan(0);
        expect(plan.website).toMatch(/^https?:\/\//);
      }
    });

    it('should have correct plan ordering (S, M, L, XL)', async () => {
      delete process.env.CONTABO_CLIENT_ID;
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await fetchContaboPlans();

      expect(result[0]!.name).toBe('VPS S');
      expect(result[1]!.name).toBe('VPS M');
      expect(result[2]!.name).toBe('VPS L');
      expect(result[3]!.name).toBe('VPS XL');
    });

    it('should have increasing prices for larger plans', async () => {
      delete process.env.CONTABO_CLIENT_ID;
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await fetchContaboPlans();

      for (let i = 1; i < result.length; i++) {
        expect(result[i]!.price.monthly).toBeGreaterThan(result[i - 1]!.price.monthly);
      }
    });

    it('should have increasing specs for larger plans', async () => {
      delete process.env.CONTABO_CLIENT_ID;
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await fetchContaboPlans();

      for (let i = 1; i < result.length; i++) {
        expect(result[i]!.specs.cpu.cores).toBeGreaterThanOrEqual(result[i - 1]!.specs.cpu.cores);
        expect(result[i]!.specs.ram.amount).toBeGreaterThan(result[i - 1]!.specs.ram.amount);
        expect(result[i]!.specs.storage.amount).toBeGreaterThan(result[i - 1]!.specs.storage.amount);
      }
    });

    it('should mark entry-level plans as featured', async () => {
      delete process.env.CONTABO_CLIENT_ID;
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await fetchContaboPlans();

      expect(result[0]!.featured).toBe(true);
      expect(result[1]!.featured).toBe(true);
      expect(result[2]!.featured).toBe(false);
      expect(result[3]!.featured).toBe(false);
    });

    it('should include NVMe storage type for all plans', async () => {
      delete process.env.CONTABO_CLIENT_ID;
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await fetchContaboPlans();

      for (const plan of result) {
        expect(plan.specs.storage.type).toBe('NVMe');
      }
    });

    it('should assign correct tags based on specs', async () => {
      delete process.env.CONTABO_CLIENT_ID;
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await fetchContaboPlans();

      // VPS S should have budget tags
      expect(result[0]!.tags).toContain('budget');
      expect(result[0]!.tags).toContain('ultra-budget');

      // VPS L should have high-performance and high-memory tags
      expect(result[2]!.tags).toContain('high-performance');
      expect(result[2]!.tags).toContain('high-memory');
    });
  });

  describe('OAuth2 Authentication', () => {
    it('should fall back to static plans when auth fails', async () => {
      process.env.CONTABO_CLIENT_ID = 'test-id';
      process.env.CONTABO_CLIENT_SECRET = 'test-secret';
      process.env.CONTABO_API_USER = 'test-user';
      process.env.CONTABO_API_PASSWORD = 'test-pass';
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401
      } as Response);

      const result = await fetchContaboPlans();

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]!.provider).toBe('Contabo');
    });

    it('should fall back to static plans on network error', async () => {
      process.env.CONTABO_CLIENT_ID = 'test-id';
      process.env.CONTABO_CLIENT_SECRET = 'test-secret';
      process.env.CONTABO_API_USER = 'test-user';
      process.env.CONTABO_API_PASSWORD = 'test-pass';
      vi.spyOn(console, 'error').mockImplementation(() => {});

      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await fetchContaboPlans();

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]!.provider).toBe('Contabo');
    });
  });
});
