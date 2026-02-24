import { describe, it, expect, beforeAll } from 'vitest';
import { fetchContaboPlans } from './contabo';

describe('Contabo E2E Tests', () => {
  const hasCredentials = !!(
    process.env.CONTABO_CLIENT_ID &&
    process.env.CONTABO_CLIENT_SECRET &&
    process.env.CONTABO_API_USER &&
    process.env.CONTABO_API_PASSWORD
  );

  beforeAll(() => {
    if (!hasCredentials) {
      console.warn(
        '⚠️  CONTABO credentials not set. E2E tests will use static plans.\n' +
        '   To test with real API, set CONTABO_CLIENT_ID, CONTABO_CLIENT_SECRET, CONTABO_API_USER, CONTABO_API_PASSWORD.'
      );
    }
  });

  describe('API Integration', () => {
    it('should return plans (static or API-fetched)', async () => {
      const plans = await fetchContaboPlans();

      expect(Array.isArray(plans)).toBe(true);
      expect(plans.length).toBeGreaterThan(0);

      console.log(`✓ Fetched ${plans.length} plans from Contabo (${hasCredentials ? 'API' : 'static'})`);
    });

    it('should return valid plan structure', async () => {
      const plans = await fetchContaboPlans();

      if (plans.length === 0) {
        throw new Error('No plans returned');
      }

      const firstPlan = plans[0]!;

      // Validate required fields
      expect(firstPlan.id).toBeDefined();
      expect(firstPlan.id).toMatch(/^contabo-/);
      expect(firstPlan.provider).toBe('Contabo');
      expect(firstPlan.name).toBeDefined();
      expect(typeof firstPlan.name).toBe('string');

      // Validate price structure
      expect(firstPlan.price).toBeDefined();
      expect(firstPlan.price.monthly).toBeGreaterThan(0);
      expect(firstPlan.price.currency).toBe('EUR');

      // Validate specs structure
      expect(firstPlan.specs).toBeDefined();
      expect(firstPlan.specs.cpu.cores).toBeGreaterThan(0);
      expect(firstPlan.specs.ram.amount).toBeGreaterThan(0);
      expect(firstPlan.specs.storage.amount).toBeGreaterThan(0);
      expect(firstPlan.specs.storage.type).toBe('NVMe');

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
      const plans = await fetchContaboPlans();

      for (const plan of plans) {
        expect(plan.price.monthly).toBeGreaterThan(0);
        expect(plan.price.currency).toBe('EUR');
      }

      console.log('✓ Pricing data is consistent across all plans');
    });

    it('should have increasing specs for plan tiers', async () => {
      const plans = await fetchContaboPlans();

      for (let i = 1; i < plans.length; i++) {
        expect(plans[i]!.specs.ram.amount).toBeGreaterThan(plans[i - 1]!.specs.ram.amount);
      }

      console.log('✓ Plan tiers have increasing specs');
    });
  });

  describe('Data Transformation', () => {
    it('should have correct Contabo-specific attributes', async () => {
      const plans = await fetchContaboPlans();

      for (const plan of plans) {
        expect(plan.features).toBeDefined();
        expect(plan.features.length).toBeGreaterThan(0);

        // Contabo plans should reference NVMe storage
        expect(plan.specs.storage.type).toBe('NVMe');
      }

      console.log('✓ Contabo-specific attributes verified');
    });
  });

  describe('API Performance', () => {
    it('should return plans within reasonable time', async () => {
      const startTime = Date.now();
      const plans = await fetchContaboPlans();
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(20000);

      console.log(`✓ Fetched ${plans.length} plans in ${duration}ms`);
    });
  });
});
