import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchKamateraPlans } from './kamatera';

describe('Kamatera Loader', () => {
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
      delete process.env.KAMATERA_CLIENT_ID;
      delete process.env.KAMATERA_SECRET;
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await fetchKamateraPlans();

      expect(result.length).toBeGreaterThan(0);
      expect(consoleWarnSpy).toHaveBeenCalledWith('KAMATERA credentials not set, using static Kamatera plans');
    });

    it('should return static plans when only client ID is set', async () => {
      process.env.KAMATERA_CLIENT_ID = 'test-id';
      delete process.env.KAMATERA_SECRET;
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await fetchKamateraPlans();

      expect(result.length).toBeGreaterThan(0);
      expect(consoleWarnSpy).toHaveBeenCalledWith('KAMATERA credentials not set, using static Kamatera plans');
    });
  });

  describe('Static Plans', () => {
    it('should return valid static plans with correct structure', async () => {
      delete process.env.KAMATERA_CLIENT_ID;
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await fetchKamateraPlans();

      expect(result.length).toBe(8);

      for (const plan of result) {
        expect(plan.provider).toBe('Kamatera');
        expect(plan.id).toMatch(/^kamatera-/);
        expect(plan.price.monthly).toBeGreaterThan(0);
        expect(plan.price.currency).toBe('USD');
        expect(plan.specs.cpu.cores).toBeGreaterThan(0);
        expect(plan.specs.ram.amount).toBeGreaterThan(0);
        expect(plan.specs.storage.amount).toBeGreaterThan(0);
        expect(plan.features.length).toBeGreaterThan(0);
        expect(plan.locations.length).toBeGreaterThan(0);
        expect(plan.website).toMatch(/^https?:\/\//);
      }
    });

    it('should have increasing prices for larger plans', async () => {
      delete process.env.KAMATERA_CLIENT_ID;
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await fetchKamateraPlans();

      for (let i = 1; i < result.length; i++) {
        expect(result[i]!.price.monthly).toBeGreaterThan(result[i - 1]!.price.monthly);
      }
    });

    it('should have increasing core counts for larger plans', async () => {
      delete process.env.KAMATERA_CLIENT_ID;
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await fetchKamateraPlans();

      for (let i = 1; i < result.length; i++) {
        expect(result[i]!.specs.cpu.cores).toBeGreaterThanOrEqual(result[i - 1]!.specs.cpu.cores);
      }
    });

    it('should have increasing RAM for larger plans', async () => {
      delete process.env.KAMATERA_CLIENT_ID;
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await fetchKamateraPlans();

      for (let i = 1; i < result.length; i++) {
        expect(result[i]!.specs.ram.amount).toBeGreaterThan(result[i - 1]!.specs.ram.amount);
      }
    });

    it('should mark entry-level plans as featured', async () => {
      delete process.env.KAMATERA_CLIENT_ID;
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await fetchKamateraPlans();

      // Plans with <= 2 cores and <= 4GB RAM should be featured
      const featuredPlans = result.filter(p => p.featured);
      const nonFeaturedPlans = result.filter(p => !p.featured);

      expect(featuredPlans.length).toBeGreaterThan(0);
      expect(nonFeaturedPlans.length).toBeGreaterThan(0);

      for (const plan of featuredPlans) {
        expect(plan.specs.cpu.cores).toBeLessThanOrEqual(2);
        expect(plan.specs.ram.amount).toBeLessThanOrEqual(4);
      }
    });

    it('should assign correct tags based on specs', async () => {
      delete process.env.KAMATERA_CLIENT_ID;
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await fetchKamateraPlans();

      // First plan (cheapest) should have budget tag
      expect(result[0]!.tags).toContain('budget');
      expect(result[0]!.tags).toContain('ultra-budget');

      // Large plans should have high-performance tags
      const largePlan = result.find(p => p.specs.cpu.cores >= 8);
      expect(largePlan!.tags).toContain('high-performance');
      expect(largePlan!.tags).toContain('high-memory');
    });

    it('should include CPU type in plan name', async () => {
      delete process.env.KAMATERA_CLIENT_ID;
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await fetchKamateraPlans();

      for (const plan of result) {
        expect(plan.name).toMatch(/Type [AB]/);
      }
    });

    it('should use SSD storage type for all plans', async () => {
      delete process.env.KAMATERA_CLIENT_ID;
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await fetchKamateraPlans();

      for (const plan of result) {
        expect(plan.specs.storage.type).toBe('SSD');
      }
    });
  });

  describe('Authentication Flow', () => {
    it('should fall back to static plans when auth fails', async () => {
      process.env.KAMATERA_CLIENT_ID = 'test-id';
      process.env.KAMATERA_SECRET = 'test-secret';
      vi.spyOn(console, 'error').mockImplementation(() => {});

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized'
      } as unknown as Response);

      const result = await fetchKamateraPlans();

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]!.provider).toBe('Kamatera');
    });

    it('should fall back to static plans on network error', async () => {
      process.env.KAMATERA_CLIENT_ID = 'test-id';
      process.env.KAMATERA_SECRET = 'test-secret';
      vi.spyOn(console, 'error').mockImplementation(() => {});

      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await fetchKamateraPlans();

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]!.provider).toBe('Kamatera');
    });
  });

  describe('Plan Data Validation', () => {
    it('should have valid uptime configuration', async () => {
      delete process.env.KAMATERA_CLIENT_ID;
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await fetchKamateraPlans();

      for (const plan of result) {
        expect(plan.uptime.percentage).toBeGreaterThan(0);
        expect(plan.uptime.percentage).toBeLessThanOrEqual(100);
        expect(typeof plan.uptime.sla).toBe('boolean');
      }
    });

    it('should have valid bandwidth configuration', async () => {
      delete process.env.KAMATERA_CLIENT_ID;
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await fetchKamateraPlans();

      for (const plan of result) {
        expect(plan.specs.bandwidth.amount).toBeGreaterThan(0);
        expect(plan.specs.bandwidth.unit).toBe('TB');
      }
    });
  });
});
