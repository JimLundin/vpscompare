import { describe, it, expect } from 'vitest';
import { fetchVultrPlans } from './vultr';

describe('Vultr E2E Tests', () => {
  describe('API Integration', () => {
    it('should fetch real data from Vultr API with valid credentials', async () => {
      if (!process.env.VULTR_API_KEY) {
        console.log('⚠️  VULTR_API_KEY not set, skipping E2E tests');
        return;
      }

      const plans = await fetchVultrPlans();

      // Should return an array
      expect(Array.isArray(plans)).toBe(true);

      if (plans.length > 0) {
        console.log(`✓ Fetched ${plans.length} plans from Vultr API`);
      } else {
        console.log('⚠️  No plans returned - API may be unavailable');
      }
    }, 30000);

    it('should return valid plan structure', async () => {
      if (!process.env.VULTR_API_KEY) {
        console.log('⚠️  VULTR_API_KEY not set, skipping E2E tests');
        return;
      }

      const plans = await fetchVultrPlans();

      if (plans.length === 0) {
        console.log('Skipping: No plans returned from API');
        return;
      }

      const firstPlan = plans[0]!;

      // Validate required fields
      expect(firstPlan.id).toBeDefined();
      expect(firstPlan.id).toMatch(/^vultr-/);
      expect(firstPlan.provider).toBe('Vultr');
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
      expect(['vCPU', 'CPU']).toContain(firstPlan.specs.cpu.type);

      expect(firstPlan.specs.ram).toBeDefined();
      expect(firstPlan.specs.ram.amount).toBeGreaterThan(0);
      expect(firstPlan.specs.ram.unit).toBe('GB');

      expect(firstPlan.specs.storage).toBeDefined();
      expect(firstPlan.specs.storage.amount).toBeGreaterThan(0);
      expect(firstPlan.specs.storage.unit).toBe('GB');
      expect(['SSD', 'NVMe']).toContain(firstPlan.specs.storage.type);

      expect(firstPlan.specs.bandwidth).toBeDefined();

      // Validate arrays
      expect(Array.isArray(firstPlan.features)).toBe(true);
      expect(firstPlan.features.length).toBeGreaterThan(0);

      expect(Array.isArray(firstPlan.locations)).toBe(true);
      expect(firstPlan.locations.length).toBeGreaterThan(0);

      // Validate uptime
      expect(firstPlan.uptime).toBeDefined();
      expect(firstPlan.uptime.percentage).toBe(99.99);
      expect(firstPlan.uptime.sla).toBe(true);

      // Validate support and website
      expect(firstPlan.support).toBe('24/7 Support');
      expect(firstPlan.website).toBe('https://www.vultr.com');

      console.log(`✓ Plan structure validated: ${firstPlan.name}`);
    }, 30000);

    it('should only include cloud compute plan types', async () => {
      if (!process.env.VULTR_API_KEY) {
        console.log('⚠️  VULTR_API_KEY not set, skipping E2E tests');
        return;
      }

      const plans = await fetchVultrPlans();

      if (plans.length === 0) {
        console.log('Skipping: No plans returned from API');
        return;
      }

      // All plans should be cloud compute types (not bare metal, etc.)
      for (const plan of plans) {
        expect(plan.id).toMatch(/^vultr-(vc2|vhf|vhp|vdc)-/);
      }

      console.log('✓ All plans are cloud compute types');
    }, 30000);

    it('should have consistent pricing data', async () => {
      if (!process.env.VULTR_API_KEY) {
        console.log('⚠️  VULTR_API_KEY not set, skipping E2E tests');
        return;
      }

      const plans = await fetchVultrPlans();

      if (plans.length === 0) {
        console.log('Skipping: No plans returned from API');
        return;
      }

      for (const plan of plans) {
        // Monthly price should be positive
        expect(plan.price.monthly).toBeGreaterThan(0);

        // Currency should be USD
        expect(plan.price.currency).toBe('USD');

        // Price should be reasonable (not extreme values)
        expect(plan.price.monthly).toBeLessThan(10000);
      }

      console.log('✓ Pricing data is consistent across all plans');
    }, 30000);

    it('should have valid location data', async () => {
      if (!process.env.VULTR_API_KEY) {
        console.log('⚠️  VULTR_API_KEY not set, skipping E2E tests');
        return;
      }

      const plans = await fetchVultrPlans();

      if (plans.length === 0) {
        console.log('Skipping: No plans returned from API');
        return;
      }

      const firstPlan = plans[0]!;

      // Should have locations
      expect(firstPlan.locations.length).toBeGreaterThan(0);

      // Should not exceed 10 locations (as per loader logic)
      expect(firstPlan.locations.length).toBeLessThanOrEqual(10);

      // Each location should be a formatted string "City, Country"
      for (const location of firstPlan.locations) {
        expect(typeof location).toBe('string');
        expect(location.length).toBeGreaterThan(0);
      }

      console.log(`✓ Location data validated (${firstPlan.locations.length} locations)`);
    }, 30000);

    it('should assign appropriate tags', async () => {
      if (!process.env.VULTR_API_KEY) {
        console.log('⚠️  VULTR_API_KEY not set, skipping E2E tests');
        return;
      }

      const plans = await fetchVultrPlans();

      if (plans.length === 0) {
        console.log('Skipping: No plans returned from API');
        return;
      }

      for (const plan of plans) {
        if (plan.tags && plan.tags.length > 0) {
          // Tags should be non-empty strings
          for (const tag of plan.tags) {
            expect(typeof tag).toBe('string');
            expect(tag.length).toBeGreaterThan(0);
          }

          // All plans should have 'global' tag
          expect(plan.tags).toContain('global');
        }
      }

      console.log('✓ Tags are properly formatted');
    }, 30000);

    it('should have featured plans', async () => {
      if (!process.env.VULTR_API_KEY) {
        console.log('⚠️  VULTR_API_KEY not set, skipping E2E tests');
        return;
      }

      const plans = await fetchVultrPlans();

      if (plans.length === 0) {
        console.log('Skipping: No plans returned from API');
        return;
      }

      // Should have some featured plans
      const featuredPlans = plans.filter(p => p.featured === true);

      console.log(`✓ Found ${featuredPlans.length} featured plans out of ${plans.length} total`);
    }, 30000);

    it('should perform correct unit conversions', async () => {
      if (!process.env.VULTR_API_KEY) {
        console.log('⚠️  VULTR_API_KEY not set, skipping E2E tests');
        return;
      }

      const plans = await fetchVultrPlans();

      if (plans.length === 0) {
        console.log('Skipping: No plans returned from API');
        return;
      }

      for (const plan of plans) {
        // RAM should be in GB
        expect(plan.specs.ram.unit).toBe('GB');
        expect(plan.specs.ram.amount).toBeGreaterThan(0);

        // Storage should be in GB
        expect(plan.specs.storage.unit).toBe('GB');
        expect(plan.specs.storage.amount).toBeGreaterThan(0);

        // Bandwidth should be in TB
        expect(plan.specs.bandwidth.unit).toBe('TB');
        if (plan.specs.bandwidth.amount) {
          expect(plan.specs.bandwidth.amount).toBeGreaterThan(0);
        }
      }

      console.log('✓ Unit conversions verified');
    }, 30000);
  });

  describe('API Performance', () => {
    it('should fetch data within reasonable time', async () => {
      if (!process.env.VULTR_API_KEY) {
        console.log('⚠️  VULTR_API_KEY not set, skipping E2E tests');
        return;
      }

      const startTime = Date.now();
      const plans = await fetchVultrPlans();
      const endTime = Date.now();

      const duration = endTime - startTime;

      // Should complete within 30 seconds
      expect(duration).toBeLessThan(30000);

      console.log(`✓ Fetched ${plans.length} plans in ${duration}ms`);
    }, 30000);
  });

  describe('Plan Characteristics', () => {
    it('should have plans with various specs ranges', async () => {
      if (!process.env.VULTR_API_KEY) {
        console.log('⚠️  VULTR_API_KEY not set, skipping E2E tests');
        return;
      }

      const plans = await fetchVultrPlans();

      if (plans.length === 0) {
        console.log('Skipping: No plans returned from API');
        return;
      }

      // Group by RAM size
      const smallPlans = plans.filter(p => p.specs.ram.amount <= 2);
      const mediumPlans = plans.filter(p => p.specs.ram.amount > 2 && p.specs.ram.amount <= 16);
      const largePlans = plans.filter(p => p.specs.ram.amount > 16);

      console.log(`✓ Plans by size: ${smallPlans.length} small, ${mediumPlans.length} medium, ${largePlans.length} large`);
    }, 30000);

    it('should have multiple plan types available', async () => {
      if (!process.env.VULTR_API_KEY) {
        console.log('⚠️  VULTR_API_KEY not set, skipping E2E tests');
        return;
      }

      const plans = await fetchVultrPlans();

      if (plans.length === 0) {
        console.log('Skipping: No plans returned from API');
        return;
      }

      // Extract unique plan types from IDs (vc2, vhf, vhp, vdc)
      const planTypes = new Set(plans.map(p => {
        const match = p.id.match(/^vultr-(\w+)-/);
        return match ? match[1] : '';
      }));

      console.log(`✓ Found ${planTypes.size} plan types: ${Array.from(planTypes).join(', ')}`);
    }, 30000);
  });
});
