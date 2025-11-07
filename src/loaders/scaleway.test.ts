import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchScalewayPlans } from './scaleway';

describe('Scaleway Loader', () => {
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
      delete process.env.SCALEWAY_API_KEY;
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await fetchScalewayPlans();

      expect(result).toEqual([]);
      expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️  SCALEWAY_API_KEY not set, skipping Scaleway plans');
    });
  });

  describe('Data Fetching', () => {
    it('should successfully fetch and transform plans with valid API key', async () => {
      process.env.SCALEWAY_API_KEY = 'test-api-key';

      const mockServersResponse = {
        servers: {
          'DEV1-S': {
            name: 'DEV1-S',
            arch: 'x86_64',
            ncpus: 2,
            ram: 2147483648, // 2GB in bytes
            volumes_constraint: {
              min_size: 20000000000, // 20GB
              max_size: 100000000000 // 100GB
            },
            baremetal: false,
            gpu: 0
          },
          'GP1-S': {
            name: 'GP1-S',
            arch: 'x86_64',
            ncpus: 4,
            ram: 8589934592, // 8GB in bytes
            volumes_constraint: {
              min_size: 50000000000,
              max_size: 300000000000
            },
            baremetal: false,
            gpu: 0
          }
        }
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockServersResponse
      } as Response);

      const result = await fetchScalewayPlans();

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'scaleway-dev1-s',
        provider: 'Scaleway',
        name: 'DEV1-S',
        price: {
          currency: 'EUR'
        },
        specs: {
          cpu: {
            cores: 2,
            type: 'vCPU'
          },
          ram: {
            amount: 2,
            unit: 'GB'
          },
          storage: {
            amount: 93,
            unit: 'GB'
          }
        }
      });
    });

    it('should handle API errors gracefully', async () => {
      process.env.SCALEWAY_API_KEY = 'test-api-key';
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      } as Response);

      const result = await fetchScalewayPlans();

      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Failed to fetch Scaleway plans:',
        expect.any(Error)
      );
    });

    it('should filter out bare metal servers', async () => {
      process.env.SCALEWAY_API_KEY = 'test-api-key';

      const mockServersResponse = {
        servers: {
          'DEV1-S': {
            name: 'DEV1-S',
            arch: 'x86_64',
            ncpus: 2,
            ram: 2147483648,
            volumes_constraint: {
              min_size: 20000000000,
              max_size: 100000000000
            },
            baremetal: false,
            gpu: 0
          },
          'EM-B111X-SATA': {
            name: 'EM-B111X-SATA',
            arch: 'x86_64',
            ncpus: 32,
            ram: 274877906944,
            volumes_constraint: {
              min_size: 1000000000000,
              max_size: 8000000000000
            },
            baremetal: true, // Should be filtered out
            gpu: 0
          }
        }
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockServersResponse
      } as Response);

      const result = await fetchScalewayPlans();

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe('scaleway-dev1-s');
    });

    it('should filter out GPU instances', async () => {
      process.env.SCALEWAY_API_KEY = 'test-api-key';

      const mockServersResponse = {
        servers: {
          'DEV1-S': {
            name: 'DEV1-S',
            arch: 'x86_64',
            ncpus: 2,
            ram: 2147483648,
            volumes_constraint: {
              min_size: 20000000000,
              max_size: 100000000000
            },
            baremetal: false,
            gpu: 0
          },
          'GPU-3070-S': {
            name: 'GPU-3070-S',
            arch: 'x86_64',
            ncpus: 6,
            ram: 32212254720,
            volumes_constraint: {
              min_size: 200000000000,
              max_size: 400000000000
            },
            baremetal: false,
            gpu: 1 // Should be filtered out
          }
        }
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockServersResponse
      } as Response);

      const result = await fetchScalewayPlans();

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe('scaleway-dev1-s');
    });
  });

  describe('Data Transformation', () => {
    it('should correctly convert RAM from bytes to GB', async () => {
      process.env.SCALEWAY_API_KEY = 'test-api-key';

      const mockServersResponse = {
        servers: {
          'GP1-M': {
            name: 'GP1-M',
            arch: 'x86_64',
            ncpus: 8,
            ram: 17179869184, // 16GB in bytes
            volumes_constraint: {
              min_size: 100000000000,
              max_size: 500000000000
            },
            baremetal: false,
            gpu: 0
          }
        }
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockServersResponse
      } as Response);

      const result = await fetchScalewayPlans();

      expect(result[0]!.specs.ram.amount).toBe(16);
    });

    it('should correctly convert storage from bytes to GB', async () => {
      process.env.SCALEWAY_API_KEY = 'test-api-key';

      const mockServersResponse = {
        servers: {
          'DEV1-L': {
            name: 'DEV1-L',
            arch: 'x86_64',
            ncpus: 4,
            ram: 8589934592,
            volumes_constraint: {
              min_size: 50000000000,
              max_size: 161061273600 // ~150GB
            },
            baremetal: false,
            gpu: 0
          }
        }
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockServersResponse
      } as Response);

      const result = await fetchScalewayPlans();

      expect(result[0]!.specs.storage.amount).toBe(150);
    });

    it('should identify storage type correctly', async () => {
      process.env.SCALEWAY_API_KEY = 'test-api-key';

      const mockServersResponse = {
        servers: {
          'GP1-S': {
            name: 'GP1-S',
            arch: 'x86_64',
            ncpus: 4,
            ram: 8589934592,
            volumes_constraint: {
              min_size: 50000000000,
              max_size: 300000000000
            },
            baremetal: false,
            gpu: 0
          },
          'DEV1-S': {
            name: 'DEV1-S',
            arch: 'x86_64',
            ncpus: 2,
            ram: 2147483648,
            volumes_constraint: {
              min_size: 20000000000,
              max_size: 100000000000
            },
            baremetal: false,
            gpu: 0
          }
        }
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockServersResponse
      } as Response);

      const result = await fetchScalewayPlans();

      const gp1Plan = result.find(p => p.name === 'GP1-S');
      const dev1Plan = result.find(p => p.name === 'DEV1-S');

      expect(gp1Plan!.specs.storage.type).toBe('NVMe');
      expect(dev1Plan!.specs.storage.type).toBe('SSD');
    });
  });
});
