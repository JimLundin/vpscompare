import { describe, it, expect, beforeAll } from 'vitest';
import { fetchDigitalOceanPlans } from './digitalocean';

describe('DigitalOcean E2E Tests', () => {
  const apiKey = process.env.DIGITALOCEAN_API_KEY;

  beforeAll(() => {
    if (!apiKey) {
      console.warn(
        '⚠️  DIGITALOCEAN_API_KEY not set. E2E tests will be skipped.\n' +
        '   To run these tests, set the DIGITALOCEAN_API_KEY environment variable.'
      );
    }
  });

  describe('API Integration', () => {
    it('should fetch real data from DigitalOcean API', async () => {
      if (!apiKey) {
        console.log('Skipping: No API key provided');
        return;
      }

      const plans = await fetchDigitalOceanPlans();

      // Should return an array
      expect(Array.isArray(plans)).toBe(true);

      // Should have plans (DigitalOcean typically has 10+ droplet sizes)
      expect(plans.length).toBeGreaterThan(0);

      console.log(`✓ Fetched ${plans.length} plans from DigitalOcean API`);
    });

    it('should return valid plan structure', async () => {
      if (!apiKey) {
        console.log('Skipping: No API key provided');
        return;
      }

      const plans = await fetchDigitalOceanPlans();

      if (plans.length === 0) {
        throw new Error('No plans returned from API');
      }

      const firstPlan = plans[0]!;

      // Validate required fields
      expect(firstPlan.id).toBeDefined();
      expect(firstPlan.provider).toBe('DigitalOcean');
      expect(firstPlan.name).toBeDefined();
      expect(typeof firstPlan.name).toBe('string');

      // Validate price structure
      expect(firstPlan.price).toBeDefined();
      expect(firstPlan.price.monthly).toBeGreaterThan(0);
      expect(firstPlan.price.currency).toBe('USD');

      // Validate specs structure
      expect(firstPlan.specs).toBeDefined();
      expect(firstPlan.specs.cpu).toBeDefined();
      expect(firstPlan.specs.cpu.cores).toBeGreaterThan(0);
      expect(firstPlan.specs.cpu.type).toBeDefined();

      expect(firstPlan.specs.ram).toBeDefined();
      expect(firstPlan.specs.ram.amount).toBeGreaterThanOrEqual(0.5); // Minimum 512MB
      expect(['MB', 'GB']).toContain(firstPlan.specs.ram.unit);

      expect(firstPlan.specs.storage).toBeDefined();
      expect(firstPlan.specs.storage.amount).toBeGreaterThan(0);
      expect(['GB', 'TB']).toContain(firstPlan.specs.storage.unit);
      expect(firstPlan.specs.storage.type).toBeDefined();

      expect(firstPlan.specs.bandwidth).toBeDefined();

      // Validate arrays
      expect(Array.isArray(firstPlan.features)).toBe(true);
      expect(firstPlan.features.length).toBeGreaterThan(0);

      expect(Array.isArray(firstPlan.locations)).toBe(true);
      expect(firstPlan.locations.length).toBeGreaterThan(0);

      // Validate uptime
      expect(firstPlan.uptime).toBeDefined();
      expect(firstPlan.uptime.percentage).toBeGreaterThan(0);
      expect(firstPlan.uptime.percentage).toBeLessThanOrEqual(100);
      expect(typeof firstPlan.uptime.sla).toBe('boolean');

      // Validate support and website
      expect(firstPlan.support).toBeDefined();
      expect(firstPlan.website).toBeDefined();
      expect(firstPlan.website).toMatch(/^https?:\/\//);

      console.log(`✓ Plan structure validated: ${firstPlan.name}`);
    });

    it('should filter out plans with less than 512MB RAM', async () => {
      if (!apiKey) {
        console.log('Skipping: No API key provided');
        return;
      }

      const plans = await fetchDigitalOceanPlans();

      for (const plan of plans) {
        const ramInMB = plan.specs.ram.unit === 'GB'
          ? plan.specs.ram.amount * 1024
          : plan.specs.ram.amount;

        expect(ramInMB).toBeGreaterThanOrEqual(512);
      }

      console.log('✓ All plans have at least 512MB RAM');
    });

    it('should have consistent pricing data', async () => {
      if (!apiKey) {
        console.log('Skipping: No API key provided');
        return;
      }

      const plans = await fetchDigitalOceanPlans();

      for (const plan of plans) {
        // Monthly price should be positive
        expect(plan.price.monthly).toBeGreaterThan(0);

        // If yearly price exists, it should be less per month than monthly
        if (plan.price.yearly) {
          const yearlyMonthly = plan.price.yearly / 12;
          expect(yearlyMonthly).toBeLessThan(plan.price.monthly);
        }

        // Currency should be USD
        expect(plan.price.currency).toBe('USD');
      }

      console.log('✓ Pricing data is consistent across all plans');
    });

    it('should have valid location data', async () => {
      if (!apiKey) {
        console.log('Skipping: No API key provided');
        return;
      }

      const plans = await fetchDigitalOceanPlans();

      if (plans.length === 0) {
        throw new Error('No plans returned from API');
      }

      const firstPlan = plans[0]!;

      // Should have locations
      expect(firstPlan.locations.length).toBeGreaterThan(0);

      // Should not exceed 10 locations (as per loader logic)
      expect(firstPlan.locations.length).toBeLessThanOrEqual(10);

      // Each location should be a non-empty string
      for (const location of firstPlan.locations) {
        expect(typeof location).toBe('string');
        expect(location.length).toBeGreaterThan(0);
      }

      console.log(`✓ Location data validated (${firstPlan.locations.length} locations)`);
    });

    it('should assign appropriate tags based on specs', async () => {
      if (!apiKey) {
        console.log('Skipping: No API key provided');
        return;
      }

      const plans = await fetchDigitalOceanPlans();

      for (const plan of plans) {
        if (plan.tags && plan.tags.length > 0) {
          // Tags should be non-empty strings
          for (const tag of plan.tags) {
            expect(typeof tag).toBe('string');
            expect(tag.length).toBeGreaterThan(0);
          }
        }
      }

      console.log('✓ Tags are properly formatted');
    });

    it('should handle API errors gracefully', async () => {
      // Test with invalid API key
      const originalKey = process.env.DIGITALOCEAN_API_KEY;
      process.env.DIGITALOCEAN_API_KEY = 'invalid_key_12345';

      const plans = await fetchDigitalOceanPlans();

      // Should return empty array on error
      expect(Array.isArray(plans)).toBe(true);
      expect(plans.length).toBe(0);

      // Restore original key
      process.env.DIGITALOCEAN_API_KEY = originalKey;

      console.log('✓ API errors handled gracefully');
    });

    it('should handle missing API key gracefully', async () => {
      const originalKey = process.env.DIGITALOCEAN_API_KEY;
      delete process.env.DIGITALOCEAN_API_KEY;

      const plans = await fetchDigitalOceanPlans();

      // Should return empty array when no API key
      expect(Array.isArray(plans)).toBe(true);
      expect(plans.length).toBe(0);

      // Restore original key
      if (originalKey) {
        process.env.DIGITALOCEAN_API_KEY = originalKey;
      }

      console.log('✓ Missing API key handled gracefully');
    });
  });

  describe('Data Transformation', () => {
    it('should correctly transform DigitalOcean API response format', async () => {
      if (!apiKey) {
        console.log('Skipping: No API key provided');
        return;
      }

      const plans = await fetchDigitalOceanPlans();

      if (plans.length === 0) {
        throw new Error('No plans returned from API');
      }

      // Find a plan with specific characteristics to test transformation
      const smallPlan = plans.find(p => p.specs.ram.amount <= 2);

      if (smallPlan) {
        // Small plans should have specific features
        expect(smallPlan.features).toBeDefined();
        expect(smallPlan.features.length).toBeGreaterThan(0);

        console.log(`✓ Data transformation verified for: ${smallPlan.name}`);
      } else {
        console.log('⚠️  No small plans found for transformation test');
      }
    });
  });

  describe('API Performance', () => {
    it('should fetch data within reasonable time', async () => {
      if (!apiKey) {
        console.log('Skipping: No API key provided');
        return;
      }

      const startTime = Date.now();
      const plans = await fetchDigitalOceanPlans();
      const endTime = Date.now();

      const duration = endTime - startTime;

      // Should complete within 20 seconds
      expect(duration).toBeLessThan(20000);

      console.log(`✓ Fetched ${plans.length} plans in ${duration}ms`);
    });
  });
});
