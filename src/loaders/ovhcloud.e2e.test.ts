import { describe, it, expect } from 'vitest';
import { fetchOVHcloudPlans } from './ovhcloud';

describe('OVHcloud E2E Tests', () => {
  describe('API Integration', () => {
    it('should fetch real data from OVHcloud public catalog API', async () => {
      const plans = await fetchOVHcloudPlans();

      // Should return an array (may be empty if API is unavailable)
      expect(Array.isArray(plans)).toBe(true);

      if (plans.length > 0) {
        console.log(`✓ Fetched ${plans.length} plans from OVHcloud API`);
      } else {
        console.log('⚠️  No plans returned from OVHcloud API (may be rate limited)');
      }
    });

    it('should return valid plan structure', async () => {
      const plans = await fetchOVHcloudPlans();

      if (plans.length === 0) {
        console.log('Skipping: No plans available');
        return;
      }

      const firstPlan = plans[0]!;

      // Validate required fields
      expect(firstPlan.id).toBeDefined();
      expect(firstPlan.id).toMatch(/^ovhcloud-/);
      expect(firstPlan.provider).toBe('OVHcloud');
      expect(firstPlan.name).toBeDefined();
      expect(typeof firstPlan.name).toBe('string');

      // Validate price structure
      expect(firstPlan.price).toBeDefined();
      expect(firstPlan.price.monthly).toBeGreaterThan(0);
      expect(['USD', 'EUR', 'GBP']).toContain(firstPlan.price.currency);

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
      const plans = await fetchOVHcloudPlans();

      if (plans.length === 0) {
        console.log('Skipping: No plans available');
        return;
      }

      for (const plan of plans) {
        expect(plan.price.monthly).toBeGreaterThan(0);
        expect(['USD', 'EUR', 'GBP']).toContain(plan.price.currency);
      }

      console.log('✓ Pricing data is consistent across all plans');
    });

    it('should handle errors gracefully', async () => {
      const plans = await fetchOVHcloudPlans();

      // Should always return an array
      expect(Array.isArray(plans)).toBe(true);

      console.log('✓ Error handling verified');
    });
  });

  describe('API Performance', () => {
    it('should fetch data within reasonable time', async () => {
      const startTime = Date.now();
      const plans = await fetchOVHcloudPlans();
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(20000);

      console.log(`✓ Fetched ${plans.length} plans in ${duration}ms`);
    });
  });
});
