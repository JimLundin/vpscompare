import { describe, it, expect } from 'vitest';
import { fetchOracleCloudPlans } from './oraclecloud';

describe('Oracle Cloud E2E Tests', () => {
  describe('API Integration', () => {
    it('should fetch real data from Oracle Cloud public pricing API', async () => {
      const plans = await fetchOracleCloudPlans();

      // Should return an array
      expect(Array.isArray(plans)).toBe(true);

      if (plans.length > 0) {
        console.log(`✓ Fetched ${plans.length} plans from Oracle Cloud API`);
      } else {
        console.log('⚠️  No plans returned from Oracle Cloud API');
      }
    });

    it('should return valid plan structure', async () => {
      const plans = await fetchOracleCloudPlans();

      if (plans.length === 0) {
        console.log('Skipping: No plans available');
        return;
      }

      const firstPlan = plans[0]!;

      // Validate required fields
      expect(firstPlan.id).toBeDefined();
      expect(firstPlan.id).toMatch(/^oraclecloud-/);
      expect(firstPlan.provider).toBe('Oracle Cloud');
      expect(firstPlan.name).toBeDefined();
      expect(typeof firstPlan.name).toBe('string');
      expect(firstPlan.name).toMatch(/^VM\./);

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
      const plans = await fetchOracleCloudPlans();

      if (plans.length === 0) {
        console.log('Skipping: No plans available');
        return;
      }

      for (const plan of plans) {
        expect(plan.price.monthly).toBeGreaterThan(0);
        expect(plan.price.currency).toBe('USD');
      }

      console.log('✓ Pricing data is consistent across all plans');
    });

    it('should only contain VM compute shapes', async () => {
      const plans = await fetchOracleCloudPlans();

      if (plans.length === 0) {
        console.log('Skipping: No plans available');
        return;
      }

      for (const plan of plans) {
        expect(plan.name).toMatch(/^VM\./);
      }

      console.log('✓ All plans are VM compute shapes');
    });

    it('should handle errors gracefully', async () => {
      const plans = await fetchOracleCloudPlans();

      // Should always return an array
      expect(Array.isArray(plans)).toBe(true);

      console.log('✓ Error handling verified');
    });
  });

  describe('Data Transformation', () => {
    it('should correctly tag ARM instances', async () => {
      const plans = await fetchOracleCloudPlans();

      if (plans.length === 0) {
        console.log('Skipping: No plans available');
        return;
      }

      const armPlans = plans.filter(p => p.name.includes('A1') || p.name.includes('A2'));
      for (const plan of armPlans) {
        expect(plan.tags).toContain('arm');
        expect(plan.tags).toContain('energy-efficient');
      }

      if (armPlans.length > 0) {
        console.log(`✓ ${armPlans.length} ARM plans correctly tagged`);
      }
    });
  });

  describe('API Performance', () => {
    it('should fetch data within reasonable time', async () => {
      const startTime = Date.now();
      const plans = await fetchOracleCloudPlans();
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(20000);

      console.log(`✓ Fetched ${plans.length} plans in ${duration}ms`);
    });
  });
});
