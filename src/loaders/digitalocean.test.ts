import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchDigitalOceanPlans } from './digitalocean';

describe('DigitalOcean Loader', () => {
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
      delete process.env.DIGITALOCEAN_API_KEY;
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await fetchDigitalOceanPlans();

      expect(result).toEqual([]);
      expect(consoleWarnSpy).toHaveBeenCalledWith('DIGITALOCEAN_API_KEY not set, skipping DigitalOcean plans');
    });
  });

  describe('Data Fetching', () => {
    it('should successfully fetch and transform plans with valid API key', async () => {
      process.env.DIGITALOCEAN_API_KEY = 'test-api-key';

      const mockSizesResponse = {
        sizes: [
          {
            slug: 's-1vcpu-1gb',
            available: true,
            memory: 1024,
            vcpus: 1,
            disk: 25,
            transfer: 1,
            price_monthly: 6.0,
            regions: ['nyc1', 'sfo1'],
            description: 'Basic'
          },
          {
            slug: 's-2vcpu-2gb',
            available: true,
            memory: 2048,
            vcpus: 2,
            disk: 50,
            transfer: 2,
            price_monthly: 12.0,
            regions: ['nyc1', 'lon1'],
            description: 'Standard'
          }
        ]
      };

      const mockRegionsResponse = {
        regions: [
          { slug: 'nyc1', name: 'New York 1', available: true },
          { slug: 'sfo1', name: 'San Francisco 1', available: true },
          { slug: 'lon1', name: 'London 1', available: true }
        ]
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSizesResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRegionsResponse
        } as Response);

      const result = await fetchDigitalOceanPlans();

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'digitalocean-s-1vcpu-1gb',
        provider: 'DigitalOcean',
        name: 'Basic',
        price: {
          monthly: 6.0,
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

    it('should filter out unavailable sizes', async () => {
      process.env.DIGITALOCEAN_API_KEY = 'test-api-key';

      const mockSizesResponse = {
        sizes: [
          {
            slug: 's-1vcpu-1gb',
            available: true,
            memory: 1024,
            vcpus: 1,
            disk: 25,
            transfer: 1,
            price_monthly: 6.0,
            regions: ['nyc1']
          },
          {
            slug: 's-unavailable',
            available: false,
            memory: 2048,
            vcpus: 2,
            disk: 50,
            transfer: 2,
            price_monthly: 12.0,
            regions: ['nyc1']
          }
        ]
      };

      const mockRegionsResponse = {
        regions: [{ slug: 'nyc1', name: 'New York 1', available: true }]
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSizesResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRegionsResponse
        } as Response);

      const result = await fetchDigitalOceanPlans();

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe('digitalocean-s-1vcpu-1gb');
    });

    it('should filter out sizes with memory less than 512MB', async () => {
      process.env.DIGITALOCEAN_API_KEY = 'test-api-key';

      const mockSizesResponse = {
        sizes: [
          {
            slug: 's-small',
            available: true,
            memory: 256,
            vcpus: 1,
            disk: 10,
            transfer: 1,
            price_monthly: 3.0,
            regions: ['nyc1']
          },
          {
            slug: 's-1vcpu-1gb',
            available: true,
            memory: 1024,
            vcpus: 1,
            disk: 25,
            transfer: 1,
            price_monthly: 6.0,
            regions: ['nyc1']
          }
        ]
      };

      const mockRegionsResponse = {
        regions: [{ slug: 'nyc1', name: 'New York 1', available: true }]
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSizesResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRegionsResponse
        } as Response);

      const result = await fetchDigitalOceanPlans();

      expect(result).toHaveLength(1);
      expect(result[0]!.specs.ram.amount).toBeGreaterThanOrEqual(0.5);
    });
  });

  describe('Data Transformation', () => {
    it('should correctly convert MB to GB for memory', async () => {
      process.env.DIGITALOCEAN_API_KEY = 'test-api-key';

      const mockSizesResponse = {
        sizes: [
          {
            slug: 's-512mb',
            available: true,
            memory: 512,
            vcpus: 1,
            disk: 20,
            transfer: 1,
            price_monthly: 4.0,
            regions: ['nyc1']
          },
          {
            slug: 's-1gb',
            available: true,
            memory: 1024,
            vcpus: 1,
            disk: 25,
            transfer: 1,
            price_monthly: 6.0,
            regions: ['nyc1']
          }
        ]
      };

      const mockRegionsResponse = {
        regions: [{ slug: 'nyc1', name: 'New York 1', available: true }]
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSizesResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRegionsResponse
        } as Response);

      const result = await fetchDigitalOceanPlans();

      expect(result[0]!.specs.ram).toEqual({ amount: 512, unit: 'MB' });
      expect(result[1]!.specs.ram).toEqual({ amount: 1, unit: 'GB' });
    });

    it('should include all required features', async () => {
      process.env.DIGITALOCEAN_API_KEY = 'test-api-key';

      const mockSizesResponse = {
        sizes: [
          {
            slug: 's-1vcpu-1gb',
            available: true,
            memory: 1024,
            vcpus: 1,
            disk: 25,
            transfer: 1,
            price_monthly: 6.0,
            regions: ['nyc1']
          }
        ]
      };

      const mockRegionsResponse = {
        regions: [{ slug: 'nyc1', name: 'New York 1', available: true }]
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSizesResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRegionsResponse
        } as Response);

      const result = await fetchDigitalOceanPlans();

      expect(result[0]!.features).toEqual([
        'SSD Storage',
        'IPv6',
        'Monitoring',
        'Firewalls',
        'Private Networking',
        'Load Balancers',
        'Snapshots',
        'Backups'
      ]);
    });

    it('should correctly assign tags based on specifications', async () => {
      process.env.DIGITALOCEAN_API_KEY = 'test-api-key';

      const mockSizesResponse = {
        sizes: [
          {
            slug: 's-budget',
            available: true,
            memory: 1024,
            vcpus: 1,
            disk: 25,
            transfer: 1,
            price_monthly: 5.0,
            regions: ['nyc1']
          },
          {
            slug: 's-performance',
            available: true,
            memory: 16384,
            vcpus: 8,
            disk: 100,
            transfer: 5,
            price_monthly: 80.0,
            regions: ['nyc1']
          }
        ]
      };

      const mockRegionsResponse = {
        regions: [{ slug: 'nyc1', name: 'New York 1', available: true }]
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSizesResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRegionsResponse
        } as Response);

      const result = await fetchDigitalOceanPlans();

      expect(result[0]!.tags).toContain('budget');
      expect(result[1]!.tags).toContain('high-performance');
      expect(result[1]!.tags).toContain('high-memory');
    });

    it('should mark featured plans correctly', async () => {
      process.env.DIGITALOCEAN_API_KEY = 'test-api-key';

      const mockSizesResponse = {
        sizes: [
          {
            slug: 's-1vcpu-1gb',
            available: true,
            memory: 1024,
            vcpus: 1,
            disk: 25,
            transfer: 1,
            price_monthly: 6.0,
            regions: ['nyc1']
          },
          {
            slug: 's-2vcpu-2gb',
            available: true,
            memory: 2048,
            vcpus: 2,
            disk: 50,
            transfer: 2,
            price_monthly: 12.0,
            regions: ['nyc1']
          },
          {
            slug: 's-4vcpu-8gb',
            available: true,
            memory: 8192,
            vcpus: 4,
            disk: 100,
            transfer: 4,
            price_monthly: 48.0,
            regions: ['nyc1']
          }
        ]
      };

      const mockRegionsResponse = {
        regions: [{ slug: 'nyc1', name: 'New York 1', available: true }]
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSizesResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRegionsResponse
        } as Response);

      const result = await fetchDigitalOceanPlans();

      expect(result[0]!.featured).toBe(true);
      expect(result[1]!.featured).toBe(true);
      expect(result[2]!.featured).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should return empty array when API request fails', async () => {
      process.env.DIGITALOCEAN_API_KEY = 'test-api-key';
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401
      } as Response);

      const result = await fetchDigitalOceanPlans();

      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to fetch DigitalOcean plans:',
        expect.any(Error)
      );
    });

    it('should return empty array when network error occurs', async () => {
      process.env.DIGITALOCEAN_API_KEY = 'test-api-key';
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await fetchDigitalOceanPlans();

      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('Region Mapping', () => {
    it('should only include available regions', async () => {
      process.env.DIGITALOCEAN_API_KEY = 'test-api-key';

      const mockSizesResponse = {
        sizes: [
          {
            slug: 's-1vcpu-1gb',
            available: true,
            memory: 1024,
            vcpus: 1,
            disk: 25,
            transfer: 1,
            price_monthly: 6.0,
            regions: ['nyc1', 'sfo1', 'unavailable']
          }
        ]
      };

      const mockRegionsResponse = {
        regions: [
          { slug: 'nyc1', name: 'New York 1', available: true },
          { slug: 'sfo1', name: 'San Francisco 1', available: true },
          { slug: 'unavailable', name: 'Unavailable Region', available: false }
        ]
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSizesResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRegionsResponse
        } as Response);

      const result = await fetchDigitalOceanPlans();

      expect(result[0]!.locations).toEqual(['New York 1', 'San Francisco 1']);
      expect(result[0]!.locations).not.toContain('Unavailable Region');
    });

    it('should limit regions to 10 maximum', async () => {
      process.env.DIGITALOCEAN_API_KEY = 'test-api-key';

      const regions = Array.from({ length: 15 }, (_, i) => `region${i}`);
      const mockSizesResponse = {
        sizes: [
          {
            slug: 's-1vcpu-1gb',
            available: true,
            memory: 1024,
            vcpus: 1,
            disk: 25,
            transfer: 1,
            price_monthly: 6.0,
            regions
          }
        ]
      };

      const mockRegionsResponse = {
        regions: regions.map((slug) => ({
          slug,
          name: `Region ${slug}`,
          available: true
        }))
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSizesResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRegionsResponse
        } as Response);

      const result = await fetchDigitalOceanPlans();

      expect(result[0]!.locations).toHaveLength(10);
    });
  });

  describe('Pricing Validation', () => {
    it('should correctly extract pricing information', async () => {
      process.env.DIGITALOCEAN_API_KEY = 'test-api-key';

      const mockSizesResponse = {
        sizes: [
          {
            slug: 's-1vcpu-1gb',
            available: true,
            memory: 1024,
            vcpus: 1,
            disk: 25,
            transfer: 1,
            price_monthly: 6.0,
            regions: ['nyc1']
          }
        ]
      };

      const mockRegionsResponse = {
        regions: [{ slug: 'nyc1', name: 'New York 1', available: true }]
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSizesResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRegionsResponse
        } as Response);

      const result = await fetchDigitalOceanPlans();

      expect(result[0]!.price).toEqual({
        monthly: 6.0,
        currency: 'USD'
      });
    });
  });
});
