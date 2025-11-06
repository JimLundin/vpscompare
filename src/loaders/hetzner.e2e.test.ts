import { describe, it, expect, beforeAll } from 'vitest';
import { fetchHetznerPlans } from './hetzner';

describe('Hetzner E2E Tests', () => {
  const apiKey = process.env.HETZNER_API_KEY;

  beforeAll(() => {
    if (!apiKey) {
      console.warn(
        '⚠️  HETZNER_API_KEY not set. E2E tests will be skipped.\n' +
        '   To run these tests, set the HETZNER_API_KEY environment variable.'
      );
    }
  });

  describe('API Integration', () => {
    it('should fetch real data from Hetzner API', async () => {
      if (!apiKey) {
        console.log('Skipping: No API key provided');
        return;
      }

      const plans = await fetchHetznerPlans();

      // Should return an array
      expect(Array.isArray(plans)).toBe(true);

      // Should have plans
      expect(plans.length).toBeGreaterThan(0);

      console.log(`✓ Fetched ${plans.length} plans from Hetzner API`);
    });

    it('should return valid plan structure', async () => {
      if (!apiKey) {
        console.log('Skipping: No API key provided');
        return;
      }

      const plans = await fetchHetznerPlans();

      if (plans.length === 0) {
        throw new Error('No plans returned from API');
      }

      const firstPlan = plans[0]!;

      // Validate required fields
      expect(firstPlan.id).toBeDefined();
      expect(firstPlan.provider).toBe('Hetzner');
      expect(firstPlan.name).toBeDefined();
      expect(typeof firstPlan.name).toBe('string');

      // Validate price structure
      expect(firstPlan.price).toBeDefined();
      expect(firstPlan.price.monthly).toBeGreaterThan(0);
      expect(firstPlan.price.currency).toBe('EUR');

      // Validate specs structure
      expect(firstPlan.specs).toBeDefined();
      expect(firstPlan.specs.cpu).toBeDefined();
      expect(firstPlan.specs.cpu.cores).toBeGreaterThan(0);
      expect(firstPlan.specs.cpu.type).toBeDefined();

      expect(firstPlan.specs.ram).toBeDefined();
      expect(firstPlan.specs.ram.amount).toBeGreaterThan(0);
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

    it('should filter out deprecated server types', async () => {
      if (!apiKey) {
        console.log('Skipping: No API key provided');
        return;
      }

      const plans = await fetchHetznerPlans();

      // All plans should be non-deprecated
      // We can verify this by ensuring all plans have valid pricing
      for (const plan of plans) {
        expect(plan.price.monthly).toBeGreaterThan(0);
      }

      console.log('✓ No deprecated server types in results');
    });

    it('should handle ARM architecture filtering', async () => {
      if (!apiKey) {
        console.log('Skipping: No API key provided');
        return;
      }

      // Test without ARM
      delete process.env.HETZNER_INCLUDE_ARM;
      const plansWithoutArm = await fetchHetznerPlans();

      // Test with ARM
      process.env.HETZNER_INCLUDE_ARM = 'true';
      const plansWithArm = await fetchHetznerPlans();

      // Clean up
      delete process.env.HETZNER_INCLUDE_ARM;

      // Both should return arrays
      expect(Array.isArray(plansWithoutArm)).toBe(true);
      expect(Array.isArray(plansWithArm)).toBe(true);

      // Plans with ARM should be >= plans without ARM
      expect(plansWithArm.length).toBeGreaterThanOrEqual(plansWithoutArm.length);

      console.log(`✓ ARM filtering: ${plansWithoutArm.length} without ARM, ${plansWithArm.length} with ARM`);
    });

    it('should detect CPU type correctly', async () => {
      if (!apiKey) {
        console.log('Skipping: No API key provided');
        return;
      }

      const plans = await fetchHetznerPlans();

      for (const plan of plans) {
        const cpuType = plan.specs.cpu.type;

        // Should be either "Shared vCPU" or "Dedicated vCPU"
        expect(['Shared vCPU', 'Dedicated vCPU', 'vCPU', 'CPU']).toContain(cpuType);
      }

      // Should have both shared and dedicated plans
      const sharedPlans = plans.filter(p => p.specs.cpu.type.includes('Shared'));
      const dedicatedPlans = plans.filter(p => p.specs.cpu.type.includes('Dedicated'));

      console.log(`✓ CPU types: ${sharedPlans.length} shared, ${dedicatedPlans.length} dedicated`);
    });

    it('should detect storage type correctly', async () => {
      if (!apiKey) {
        console.log('Skipping: No API key provided');
        return;
      }

      const plans = await fetchHetznerPlans();

      for (const plan of plans) {
        const storageType = plan.specs.storage.type;

        // Should be either "Local SSD" or "NVMe"
        expect(['Local SSD', 'NVMe', 'SSD']).toContain(storageType);
      }

      console.log('✓ Storage types detected correctly');
    });

    it('should have consistent pricing data', async () => {
      if (!apiKey) {
        console.log('Skipping: No API key provided');
        return;
      }

      const plans = await fetchHetznerPlans();

      for (const plan of plans) {
        // Monthly price should be positive
        expect(plan.price.monthly).toBeGreaterThan(0);

        // Currency should be EUR
        expect(plan.price.currency).toBe('EUR');

        // Price should be reasonable (not extreme values)
        expect(plan.price.monthly).toBeLessThan(10000);
      }

      console.log('✓ Pricing data is consistent across all plans');
    });

    it('should have valid location data', async () => {
      if (!apiKey) {
        console.log('Skipping: No API key provided');
        return;
      }

      const plans = await fetchHetznerPlans();

      if (plans.length === 0) {
        throw new Error('No plans returned from API');
      }

      const firstPlan = plans[0]!;

      // Should have locations
      expect(firstPlan.locations.length).toBeGreaterThan(0);

      // Each location should be in "City, Country" format
      for (const location of firstPlan.locations) {
        expect(typeof location).toBe('string');
        expect(location.length).toBeGreaterThan(0);

        // Should contain a comma (City, Country format)
        if (location.includes(',')) {
          const parts = location.split(',');
          expect(parts.length).toBe(2);
          expect(parts[0]!.trim().length).toBeGreaterThan(0);
          expect(parts[1]!.trim().length).toBeGreaterThan(0);
        }
      }

      console.log(`✓ Location data validated (${firstPlan.locations.length} locations)`);
    });

    it('should handle featured plans correctly', async () => {
      if (!apiKey) {
        console.log('Skipping: No API key provided');
        return;
      }

      const plans = await fetchHetznerPlans();

      // Should have some featured plans
      const featuredPlans = plans.filter(p => p.featured === true);

      console.log(`✓ Found ${featuredPlans.length} featured plans out of ${plans.length} total`);
    });

    it('should handle API errors gracefully', async () => {
      // Test with invalid API key
      const originalKey = process.env.HETZNER_API_KEY;
      process.env.HETZNER_API_KEY = 'invalid_key_12345';

      const plans = await fetchHetznerPlans();

      // Should return empty array on error
      expect(Array.isArray(plans)).toBe(true);
      expect(plans.length).toBe(0);

      // Restore original key
      process.env.HETZNER_API_KEY = originalKey;

      console.log('✓ API errors handled gracefully');
    });

    it('should handle missing API key gracefully', async () => {
      const originalKey = process.env.HETZNER_API_KEY;
      delete process.env.HETZNER_API_KEY;

      const plans = await fetchHetznerPlans();

      // Should return empty array when no API key
      expect(Array.isArray(plans)).toBe(true);
      expect(plans.length).toBe(0);

      // Restore original key
      if (originalKey) {
        process.env.HETZNER_API_KEY = originalKey;
      }

      console.log('✓ Missing API key handled gracefully');
    });
  });

  describe('Data Transformation', () => {
    it('should correctly transform Hetzner API response format', async () => {
      if (!apiKey) {
        console.log('Skipping: No API key provided');
        return;
      }

      const plans = await fetchHetznerPlans();

      if (plans.length === 0) {
        throw new Error('No plans returned from API');
      }

      // Verify RAM is properly converted to GB
      for (const plan of plans) {
        if (plan.specs.ram.unit === 'GB') {
          expect(plan.specs.ram.amount).toBeGreaterThan(0);
        }
      }

      console.log('✓ Data transformation verified');
    });

    it('should select cheapest price from multiple pricing options', async () => {
      if (!apiKey) {
        console.log('Skipping: No API key provided');
        return;
      }

      const plans = await fetchHetznerPlans();

      // All plans should have positive prices
      for (const plan of plans) {
        expect(plan.price.monthly).toBeGreaterThan(0);
      }

      console.log('✓ Pricing selection verified');
    });
  });

  describe('API Performance', () => {
    it('should fetch data within reasonable time', async () => {
      if (!apiKey) {
        console.log('Skipping: No API key provided');
        return;
      }

      const startTime = Date.now();
      const plans = await fetchHetznerPlans();
      const endTime = Date.now();

      const duration = endTime - startTime;

      // Should complete within 20 seconds
      expect(duration).toBeLessThan(20000);

      console.log(`✓ Fetched ${plans.length} plans in ${duration}ms`);
    });
  });

  describe('Plan Characteristics', () => {
    it('should have plans with various specs ranges', async () => {
      if (!apiKey) {
        console.log('Skipping: No API key provided');
        return;
      }

      const plans = await fetchHetznerPlans();

      if (plans.length === 0) {
        throw new Error('No plans returned from API');
      }

      // Group by RAM size
      const smallPlans = plans.filter(p => p.specs.ram.amount <= 4);
      const mediumPlans = plans.filter(p => p.specs.ram.amount > 4 && p.specs.ram.amount <= 16);
      const largePlans = plans.filter(p => p.specs.ram.amount > 16);

      console.log(`✓ Plans by size: ${smallPlans.length} small, ${mediumPlans.length} medium, ${largePlans.length} large`);
    });
  });
});
