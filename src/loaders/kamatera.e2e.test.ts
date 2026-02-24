import { describe, it, expect, beforeAll } from 'vitest';
import { fetchKamateraPlans } from './kamatera';

describe('Kamatera E2E Tests', () => {
  const hasCredentials = !!(
    process.env.KAMATERA_CLIENT_ID &&
    process.env.KAMATERA_SECRET
  );

  beforeAll(() => {
    if (!hasCredentials) {
      console.warn(
        '⚠️  KAMATERA credentials not set. E2E tests will use static plans.\n' +
        '   To test with real API, set KAMATERA_CLIENT_ID and KAMATERA_SECRET.'
      );
    }
  });

  describe('API Integration', () => {
    it('should return plans (static or API-fetched)', async () => {
      const plans = await fetchKamateraPlans();

      expect(Array.isArray(plans)).toBe(true);
      expect(plans.length).toBeGreaterThan(0);

      console.log(`✓ Fetched ${plans.length} plans from Kamatera (${hasCredentials ? 'API' : 'static'})`);
    });

    it('should return valid plan structure', async () => {
      const plans = await fetchKamateraPlans();

      if (plans.length === 0) {
        throw new Error('No plans returned');
      }

      const firstPlan = plans[0]!;

      // Validate required fields
      expect(firstPlan.id).toBeDefined();
      expect(firstPlan.id).toMatch(/^kamatera-/);
      expect(firstPlan.provider).toBe('Kamatera');
      expect(firstPlan.name).toBeDefined();
      expect(typeof firstPlan.name).toBe('string');

      // Validate price structure
      expect(firstPlan.price).toBeDefined();
      expect(firstPlan.price.monthly).toBeGreaterThan(0);
      expect(firstPlan.price.currency).toBe('USD');

      // Validate specs structure
      expect(firstPlan.specs).toBeDefined();
      expect(firstPlan.specs.cpu.cores).toBeGreaterThan(0);
      expect(firstPlan.specs.ram.amount).toBeGreaterThan(0);
      expect(firstPlan.specs.storage.amount).toBeGreaterThan(0);

      // Validate arrays
      expect(Array.isArray(firstPlan.features)).toBe(true);
      expect(firstPlan.features.length).toBeGreaterThan(0);
      expect(Array.isArray(firstPlan.locations)).toBe(true);
      expect(firstPlan.locations.length).toBeGreaterThan(0);

      // Validate uptime
      expect(firstPlan.uptime.percentage).toBeGreaterThan(0);
      expect(firstPlan.uptime.percentage).toBeLessThanOrEqual(100);

      // Validate website
      expect(firstPlan.website).toMatch(/^https?:\/\//);

      console.log(`✓ Plan structure validated: ${firstPlan.name}`);
    });

    it('should have consistent pricing data', async () => {
      const plans = await fetchKamateraPlans();

      for (const plan of plans) {
        expect(plan.price.monthly).toBeGreaterThan(0);
        expect(plan.price.currency).toBe('USD');
      }

      console.log('✓ Pricing data is consistent across all plans');
    });

    it('should have proper plan range from entry-level to enterprise', async () => {
      const plans = await fetchKamateraPlans();

      const minPrice = Math.min(...plans.map(p => p.price.monthly));
      const maxPrice = Math.max(...plans.map(p => p.price.monthly));
      const minRam = Math.min(...plans.map(p => p.specs.ram.amount));
      const maxRam = Math.max(...plans.map(p => p.specs.ram.amount));

      // Should have a good range of pricing
      expect(minPrice).toBeLessThan(10);
      expect(maxPrice).toBeGreaterThan(100);

      // Should have a good range of RAM
      expect(minRam).toBeLessThanOrEqual(2);
      expect(maxRam).toBeGreaterThanOrEqual(64);

      console.log(`✓ Plan range: $${minPrice}-$${maxPrice}/mo, ${minRam}GB-${maxRam}GB RAM`);
    });
  });

  describe('Data Transformation', () => {
    it('should have correct Kamatera-specific attributes', async () => {
      const plans = await fetchKamateraPlans();

      for (const plan of plans) {
        expect(plan.features).toBeDefined();
        expect(plan.features.length).toBeGreaterThan(0);
        expect(plan.specs.storage.type).toBe('SSD');
        expect(plan.name).toContain('Type');
      }

      console.log('✓ Kamatera-specific attributes verified');
    });
  });

  describe('API Performance', () => {
    it('should return plans within reasonable time', async () => {
      const startTime = Date.now();
      const plans = await fetchKamateraPlans();
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(20000);

      console.log(`✓ Fetched ${plans.length} plans in ${duration}ms`);
    });
  });
});
