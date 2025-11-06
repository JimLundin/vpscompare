import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchVultrPlans } from './vultr';

describe('Vultr Loader', () => {
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
    it('should return empty array when API key is not set', async () => {
      delete process.env.VULTR_API_KEY;
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await fetchVultrPlans();

      expect(result).toEqual([]);
      expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️  VULTR_API_KEY not set, skipping Vultr plans');
    });
  });

  describe('Data Fetching', () => {
    it('should successfully fetch and transform plans with valid API key', async () => {
      process.env.VULTR_API_KEY = 'test-api-key';

      const mockPlansResponse = {
        plans: [
          {
            id: 'vc2-1c-1gb',
            vcpu_count: 1,
            ram: 1024,
            disk: 25,
            bandwidth: 1024,
            monthly_cost: 5,
            type: 'vc2',
            locations: ['ewr', 'ord', 'lax']
          },
          {
            id: 'vc2-1c-2gb',
            vcpu_count: 1,
            ram: 2048,
            disk: 55,
            bandwidth: 2048,
            monthly_cost: 10,
            type: 'vc2',
            locations: ['ewr', 'ord']
          }
        ]
      };

      const mockRegionsResponse = {
        regions: [
          { id: 'ewr', city: 'Newark', country: 'US', continent: 'North America', options: [] },
          { id: 'ord', city: 'Chicago', country: 'US', continent: 'North America', options: [] },
          { id: 'lax', city: 'Los Angeles', country: 'US', continent: 'North America', options: [] }
        ]
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPlansResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRegionsResponse
        } as Response);

      const result = await fetchVultrPlans();

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'vultr-vc2-1c-1gb',
        provider: 'Vultr',
        name: 'VC2-1C-1GB',
        price: {
          monthly: 5,
          currency: 'USD'
        },
        specs: {
          cpu: {
            cores: 1,
            type: 'vCPU'
          },
          ram: {
            amount: 1,
            unit: 'GB'
          },
          storage: {
            amount: 25,
            unit: 'GB',
            type: 'SSD'
          },
          bandwidth: {
            amount: 1,
            unit: 'TB',
            unlimited: false
          }
        }
      });
    });

    it('should handle API errors gracefully', async () => {
      process.env.VULTR_API_KEY = 'test-api-key';
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      } as Response);

      const result = await fetchVultrPlans();

      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Failed to fetch Vultr plans:',
        expect.any(Error)
      );
    });

    it('should filter plans by type', async () => {
      process.env.VULTR_API_KEY = 'test-api-key';

      const mockPlansResponse = {
        plans: [
          {
            id: 'vc2-1c-1gb',
            vcpu_count: 1,
            ram: 1024,
            disk: 25,
            bandwidth: 1024,
            monthly_cost: 5,
            type: 'vc2',
            locations: ['ewr']
          },
          {
            id: 'vbm-4c-32gb',
            vcpu_count: 4,
            ram: 32768,
            disk: 512,
            bandwidth: 5120,
            monthly_cost: 120,
            type: 'vbm', // Bare metal - should be filtered out
            locations: ['ewr']
          }
        ]
      };

      const mockRegionsResponse = {
        regions: [
          { id: 'ewr', city: 'Newark', country: 'US', continent: 'North America', options: [] }
        ]
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPlansResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRegionsResponse
        } as Response);

      const result = await fetchVultrPlans();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('vultr-vc2-1c-1gb');
    });
  });

  describe('Data Transformation', () => {
    it('should correctly convert RAM from MB to GB', async () => {
      process.env.VULTR_API_KEY = 'test-api-key';

      const mockPlansResponse = {
        plans: [
          {
            id: 'vc2-2c-4gb',
            vcpu_count: 2,
            ram: 4096,
            disk: 80,
            bandwidth: 3072,
            monthly_cost: 18,
            type: 'vc2',
            locations: ['ewr']
          }
        ]
      };

      const mockRegionsResponse = {
        regions: [
          { id: 'ewr', city: 'Newark', country: 'US', continent: 'North America', options: [] }
        ]
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPlansResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRegionsResponse
        } as Response);

      const result = await fetchVultrPlans();

      expect(result[0].specs.ram.amount).toBe(4);
    });

    it('should correctly convert bandwidth from GB to TB', async () => {
      process.env.VULTR_API_KEY = 'test-api-key';

      const mockPlansResponse = {
        plans: [
          {
            id: 'vc2-1c-1gb',
            vcpu_count: 1,
            ram: 1024,
            disk: 25,
            bandwidth: 2048, // 2048 GB = 2 TB
            monthly_cost: 5,
            type: 'vc2',
            locations: ['ewr']
          }
        ]
      };

      const mockRegionsResponse = {
        regions: [
          { id: 'ewr', city: 'Newark', country: 'US', continent: 'North America', options: [] }
        ]
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPlansResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRegionsResponse
        } as Response);

      const result = await fetchVultrPlans();

      expect(result[0].specs.bandwidth.amount).toBe(2);
    });
  });
});
