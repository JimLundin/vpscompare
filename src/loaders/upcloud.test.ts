import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchUpCloudPlans } from './upcloud';

describe('UpCloud Loader', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('API Credentials Validation', () => {
    it('should return empty array when username is not set', async () => {
      delete process.env.UPCLOUD_USERNAME;
      process.env.UPCLOUD_PASSWORD = 'test-password';
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await fetchUpCloudPlans();

      expect(result).toEqual([]);
      expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️  UPCLOUD_USERNAME or UPCLOUD_PASSWORD not set, skipping UpCloud plans');
    });

    it('should return empty array when password is not set', async () => {
      process.env.UPCLOUD_USERNAME = 'test-user';
      delete process.env.UPCLOUD_PASSWORD;
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await fetchUpCloudPlans();

      expect(result).toEqual([]);
      expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️  UPCLOUD_USERNAME or UPCLOUD_PASSWORD not set, skipping UpCloud plans');
    });
  });

  describe('Data Fetching', () => {
    it('should successfully fetch and transform plans with valid credentials', async () => {
      process.env.UPCLOUD_USERNAME = 'test-user';
      process.env.UPCLOUD_PASSWORD = 'test-password';

      const mockPlansResponse = {
        plans: {
          plan: [
            {
              core_number: 1,
              memory_amount: 2048,
              name: '1xCPU-2GB',
              public_traffic_out: 2048,
              storage_size: 50,
              storage_tier: 'maxiops'
            },
            {
              core_number: 2,
              memory_amount: 4096,
              name: '2xCPU-4GB',
              public_traffic_out: 4096,
              storage_size: 80,
              storage_tier: 'maxiops'
            }
          ]
        }
      };

      const mockPricingResponse = {
        prices: {
          zone: {
            'us-nyc1': {
              'server_plan_1xCPU-2GB': {
                price: '0.0068'
              },
              'server_plan_2xCPU-4GB': {
                price: '0.0137'
              }
            }
          }
        }
      };

      const mockZonesResponse = {
        zones: {
          zone: [
            { id: 'us-nyc1', description: 'New York, USA' },
            { id: 'uk-lon1', description: 'London, UK' },
            { id: 'fi-hel1', description: 'Helsinki, Finland' }
          ]
        }
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPlansResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPricingResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockZonesResponse
        } as Response);

      const result = await fetchUpCloudPlans();

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'upcloud-1xcpu-2gb',
        provider: 'UpCloud',
        name: '1xCPU-2GB',
        price: {
          monthly: 4.96,
          currency: 'USD'
        },
        specs: {
          cpu: {
            cores: 1,
            type: 'vCPU'
          },
          ram: {
            amount: 2,
            unit: 'GB'
          },
          storage: {
            amount: 50,
            unit: 'GB',
            type: 'NVMe'
          },
          bandwidth: {
            amount: 2,
            unit: 'TB',
            unlimited: false
          }
        }
      });
    });

    it('should handle API errors gracefully', async () => {
      process.env.UPCLOUD_USERNAME = 'test-user';
      process.env.UPCLOUD_PASSWORD = 'test-password';
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      } as Response);

      const result = await fetchUpCloudPlans();

      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Failed to fetch UpCloud plans:',
        expect.any(Error)
      );
    });
  });

  describe('Data Transformation', () => {
    it('should correctly convert RAM from MB to GB', async () => {
      process.env.UPCLOUD_USERNAME = 'test-user';
      process.env.UPCLOUD_PASSWORD = 'test-password';

      const mockPlansResponse = {
        plans: {
          plan: [
            {
              core_number: 2,
              memory_amount: 4096,
              name: '2xCPU-4GB',
              public_traffic_out: 4096,
              storage_size: 80,
              storage_tier: 'maxiops'
            }
          ]
        }
      };

      const mockPricingResponse = {
        prices: {
          zone: {
            'us-nyc1': {
              'server_plan_2xCPU-4GB': {
                price: '0.0137'
              }
            }
          }
        }
      };

      const mockZonesResponse = {
        zones: {
          zone: [
            { id: 'us-nyc1', description: 'New York, USA' }
          ]
        }
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPlansResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPricingResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockZonesResponse
        } as Response);

      const result = await fetchUpCloudPlans();

      expect(result[0].specs.ram.amount).toBe(4);
    });

    it('should correctly calculate monthly price from hourly', async () => {
      process.env.UPCLOUD_USERNAME = 'test-user';
      process.env.UPCLOUD_PASSWORD = 'test-password';

      const mockPlansResponse = {
        plans: {
          plan: [
            {
              core_number: 1,
              memory_amount: 2048,
              name: '1xCPU-2GB',
              public_traffic_out: 2048,
              storage_size: 50,
              storage_tier: 'maxiops'
            }
          ]
        }
      };

      const mockPricingResponse = {
        prices: {
          zone: {
            'us-nyc1': {
              'server_plan_1xCPU-2GB': {
                price: '0.0100' // $0.01/hour * 730 hours = $7.30/month
              }
            }
          }
        }
      };

      const mockZonesResponse = {
        zones: {
          zone: [
            { id: 'us-nyc1', description: 'New York, USA' }
          ]
        }
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPlansResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPricingResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockZonesResponse
        } as Response);

      const result = await fetchUpCloudPlans();

      expect(result[0].price.monthly).toBe(7.3);
    });

    it('should correctly identify storage type based on tier', async () => {
      process.env.UPCLOUD_USERNAME = 'test-user';
      process.env.UPCLOUD_PASSWORD = 'test-password';

      const mockPlansResponse = {
        plans: {
          plan: [
            {
              core_number: 1,
              memory_amount: 2048,
              name: '1xCPU-2GB',
              public_traffic_out: 2048,
              storage_size: 50,
              storage_tier: 'maxiops'
            }
          ]
        }
      };

      const mockPricingResponse = {
        prices: {
          zone: {
            'us-nyc1': {
              'server_plan_1xCPU-2GB': {
                price: '0.0068'
              }
            }
          }
        }
      };

      const mockZonesResponse = {
        zones: {
          zone: [
            { id: 'us-nyc1', description: 'New York, USA' }
          ]
        }
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPlansResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPricingResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockZonesResponse
        } as Response);

      const result = await fetchUpCloudPlans();

      expect(result[0].specs.storage.type).toBe('NVMe');
    });
  });
});
