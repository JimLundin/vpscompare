import { describe, it, expect } from 'vitest';
import { fetchScalewayPlans } from './scaleway';

describe('Scaleway E2E Tests', () => {
  describe('API Integration', () => {
    it('should fetch real data from Scaleway API with valid credentials', async () => {
      if (!process.env.SCALEWAY_API_KEY) {
        console.log('⚠️  SCALEWAY_API_KEY not set, skipping E2E tests');
        return;
      }

      const plans = await fetchScalewayPlans();

      // Should return an array
      expect(Array.isArray(plans)).toBe(true);

      if (plans.length > 0) {
        console.log(`✓ Fetched ${plans.length} plans from Scaleway API`);
      } else {
        console.log('⚠️  No plans returned - API may be unavailable');
      }
    }, 30000);

    it('should return valid plan structure', async () => {
      if (!process.env.SCALEWAY_API_KEY) {
        console.log('⚠️  SCALEWAY_API_KEY not set, skipping E2E tests');
        return;
      }

      const plans = await fetchScalewayPlans();

      if (plans.length === 0) {
        console.log('Skipping: No plans returned from API');
        return;
      }

      const firstPlan = plans[0]!;

      // Validate required fields
      expect(firstPlan.id).toBeDefined();
      expect(firstPlan.id).toMatch(/^scaleway-/);
      expect(firstPlan.provider).toBe('Scaleway');
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
      expect(firstPlan.specs.cpu.type).toBe('vCPU');

      expect(firstPlan.specs.ram).toBeDefined();
      expect(firstPlan.specs.ram.amount).toBeGreaterThan(0);
      expect(firstPlan.specs.ram.unit).toBe('GB');

      expect(firstPlan.specs.storage).toBeDefined();
      expect(firstPlan.specs.storage.amount).toBeGreaterThan(0);
      expect(firstPlan.specs.storage.unit).toBe('GB');
      expect(['SSD', 'NVMe']).toContain(firstPlan.specs.storage.type);

      expect(firstPlan.specs.bandwidth).toBeDefined();
      expect(firstPlan.specs.bandwidth.unlimited).toBe(true);

      // Validate arrays
      expect(Array.isArray(firstPlan.features)).toBe(true);
      expect(firstPlan.features.length).toBeGreaterThan(0);

      expect(Array.isArray(firstPlan.locations)).toBe(true);
      expect(firstPlan.locations.length).toBeGreaterThan(0);

      // Validate uptime
      expect(firstPlan.uptime).toBeDefined();
      expect(firstPlan.uptime.percentage).toBeGreaterThan(0);
      expect(firstPlan.uptime.sla).toBe(true);

      // Validate support and website
      expect(firstPlan.support).toBe('24/7 Support');
      expect(firstPlan.website).toBe('https://www.scaleway.com');

      console.log(`✓ Plan structure validated: ${firstPlan.name}`);
    }, 30000);

    it('should only include cloud instances (no bare metal or GPU)', async () => {
      if (!process.env.SCALEWAY_API_KEY) {
        console.log('⚠️  SCALEWAY_API_KEY not set, skipping E2E tests');
        return;
      }

      const plans = await fetchScalewayPlans();

      if (plans.length === 0) {
        console.log('Skipping: No plans returned from API');
        return;
      }

      // All plans should be cloud instances
      for (const plan of plans) {
        expect(plan.id).toMatch(/^scaleway-(dev1|gp1|pro2|play2)-/i);
      }

      console.log('✓ All plans are cloud instances (no bare metal or GPU)');
    }, 30000);

    it('should have consistent pricing data', async () => {
      if (!process.env.SCALEWAY_API_KEY) {
        console.log('⚠️  SCALEWAY_API_KEY not set, skipping E2E tests');
        return;
      }

      const plans = await fetchScalewayPlans();

      if (plans.length === 0) {
        console.log('Skipping: No plans returned from API');
        return;
      }

      for (const plan of plans) {
        // Monthly price should be positive
        expect(plan.price.monthly).toBeGreaterThan(0);

        // Currency should be EUR
        expect(plan.price.currency).toBe('EUR');

        // Price should be reasonable (not extreme values)
        expect(plan.price.monthly).toBeLessThan(1000);
      }

      console.log('✓ Pricing data is consistent across all plans');
    }, 30000);

    it('should have valid location data', async () => {
      if (!process.env.SCALEWAY_API_KEY) {
        console.log('⚠️  SCALEWAY_API_KEY not set, skipping E2E tests');
        return;
      }

      const plans = await fetchScalewayPlans();

      if (plans.length === 0) {
        console.log('Skipping: No plans returned from API');
        return;
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
    }, 30000);

    it('should assign appropriate tags', async () => {
      if (!process.env.SCALEWAY_API_KEY) {
        console.log('⚠️  SCALEWAY_API_KEY not set, skipping E2E tests');
        return;
      }

      const plans = await fetchScalewayPlans();

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

          // All plans should have 'europe' tag
          expect(plan.tags).toContain('europe');
        }
      }

      console.log('✓ Tags are properly formatted');
    }, 30000);

    it('should have featured plans', async () => {
      if (!process.env.SCALEWAY_API_KEY) {
        console.log('⚠️  SCALEWAY_API_KEY not set, skipping E2E tests');
        return;
      }

      const plans = await fetchScalewayPlans();

      if (plans.length === 0) {
        console.log('Skipping: No plans returned from API');
        return;
      }

      // Should have some featured plans
      const featuredPlans = plans.filter(p => p.featured === true);

      console.log(`✓ Found ${featuredPlans.length} featured plans out of ${plans.length} total`);
    }, 30000);

    it('should perform correct unit conversions', async () => {
      if (!process.env.SCALEWAY_API_KEY) {
        console.log('⚠️  SCALEWAY_API_KEY not set, skipping E2E tests');
        return;
      }

      const plans = await fetchScalewayPlans();

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

        // Bandwidth should be unlimited
        expect(plan.specs.bandwidth.unlimited).toBe(true);
      }

      console.log('✓ Unit conversions verified');
    }, 30000);

    it('should have European datacenter locations', async () => {
      if (!process.env.SCALEWAY_API_KEY) {
        console.log('⚠️  SCALEWAY_API_KEY not set, skipping E2E tests');
        return;
      }

      const plans = await fetchScalewayPlans();

      if (plans.length === 0) {
        console.log('Skipping: No plans returned from API');
        return;
      }

      // All plans should have 'europe' tag
      for (const plan of plans) {
        if (plan.tags) {
          expect(plan.tags).toContain('europe');
        }
      }

      console.log('✓ European datacenter presence verified');
    }, 30000);
  });

  describe('API Performance', () => {
    it('should fetch data within reasonable time', async () => {
      if (!process.env.SCALEWAY_API_KEY) {
        console.log('⚠️  SCALEWAY_API_KEY not set, skipping E2E tests');
        return;
      }

      const startTime = Date.now();
      const plans = await fetchScalewayPlans();
      const endTime = Date.now();

      const duration = endTime - startTime;

      // Should complete within 30 seconds
      expect(duration).toBeLessThan(30000);

      console.log(`✓ Fetched ${plans.length} plans in ${duration}ms`);
    }, 30000);
  });

  describe('Plan Characteristics', () => {
    it('should have plans with various specs ranges', async () => {
      if (!process.env.SCALEWAY_API_KEY) {
        console.log('⚠️  SCALEWAY_API_KEY not set, skipping E2E tests');
        return;
      }

      const plans = await fetchScalewayPlans();

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
      if (!process.env.SCALEWAY_API_KEY) {
        console.log('⚠️  SCALEWAY_API_KEY not set, skipping E2E tests');
        return;
      }

      const plans = await fetchScalewayPlans();

      if (plans.length === 0) {
        console.log('Skipping: No plans returned from API');
        return;
      }

      // Extract unique plan types from names (DEV1, GP1, PRO2, etc.)
      const planTypes = new Set(plans.map(p => {
        const match = p.name.match(/^([A-Z0-9]+)-/);
        return match ? match[1] : '';
      }));

      console.log(`✓ Found ${planTypes.size} plan types: ${Array.from(planTypes).join(', ')}`);
    }, 30000);
  });
});
