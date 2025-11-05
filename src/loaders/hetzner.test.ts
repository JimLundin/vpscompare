import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchHetznerPlans } from './hetzner';

describe('Hetzner Loader', () => {
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
      delete process.env.HETZNER_API_KEY;
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await fetchHetznerPlans();

      expect(result).toEqual([]);
      expect(consoleWarnSpy).toHaveBeenCalledWith('HETZNER_API_KEY not set, skipping Hetzner plans');
    });
  });

  describe('Data Fetching', () => {
    it('should successfully fetch and transform plans with valid API key', async () => {
      process.env.HETZNER_API_KEY = 'test-api-key';

      const mockServerTypesResponse = {
        server_types: [
          {
            name: 'cx11',
            description: 'CX11 Cloud Server',
            cores: 1,
            memory: 2,
            disk: 20,
            deprecated: false,
            architecture: 'x86',
            cpu_type: 'shared',
            storage_type: 'local',
            prices: [
              { price_monthly: { gross: '4.15' } }
            ]
          },
          {
            name: 'cx21',
            description: 'CX21 Cloud Server',
            cores: 2,
            memory: 4,
            disk: 40,
            deprecated: false,
            architecture: 'x86',
            cpu_type: 'shared',
            storage_type: 'local',
            prices: [
              { price_monthly: { gross: '6.30' } }
            ]
          }
        ]
      };

      const mockLocationsResponse = {
        locations: [
          { city: 'Falkenstein', country: 'Germany' },
          { city: 'Helsinki', country: 'Finland' }
        ]
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockServerTypesResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockLocationsResponse
        } as Response);

      const result = await fetchHetznerPlans();

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'hetzner-cx11',
        provider: 'Hetzner',
        name: 'cx11',
        description: 'CX11 Cloud Server',
        price: {
          monthly: 4.15,
          currency: 'EUR'
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
            amount: 20,
            unit: 'GB',
            type: 'SSD'
          },
          bandwidth: {
            amount: 20,
            unit: 'TB',
            unlimited: false
          }
        }
      });
    });

    it('should filter out deprecated server types', async () => {
      process.env.HETZNER_API_KEY = 'test-api-key';

      const mockServerTypesResponse = {
        server_types: [
          {
            name: 'cx11',
            cores: 1,
            memory: 2,
            disk: 20,
            deprecated: false,
            architecture: 'x86',
            cpu_type: 'shared',
            storage_type: 'local',
            prices: [{ price_monthly: { gross: '4.15' } }]
          },
          {
            name: 'old-type',
            cores: 1,
            memory: 1,
            disk: 20,
            deprecated: true,
            architecture: 'x86',
            cpu_type: 'shared',
            storage_type: 'local',
            prices: [{ price_monthly: { gross: '3.00' } }]
          }
        ]
      };

      const mockLocationsResponse = {
        locations: [{ city: 'Falkenstein', country: 'Germany' }]
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockServerTypesResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockLocationsResponse
        } as Response);

      const result = await fetchHetznerPlans();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('cx11');
    });

    it('should filter out ARM servers by default', async () => {
      process.env.HETZNER_API_KEY = 'test-api-key';
      delete process.env.HETZNER_INCLUDE_ARM;

      const mockServerTypesResponse = {
        server_types: [
          {
            name: 'cx11',
            cores: 1,
            memory: 2,
            disk: 20,
            deprecated: false,
            architecture: 'x86',
            cpu_type: 'shared',
            storage_type: 'local',
            prices: [{ price_monthly: { gross: '4.15' } }]
          },
          {
            name: 'cax11',
            cores: 2,
            memory: 4,
            disk: 40,
            deprecated: false,
            architecture: 'arm64',
            cpu_type: 'shared',
            storage_type: 'local',
            prices: [{ price_monthly: { gross: '3.79' } }]
          }
        ]
      };

      const mockLocationsResponse = {
        locations: [{ city: 'Falkenstein', country: 'Germany' }]
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockServerTypesResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockLocationsResponse
        } as Response);

      const result = await fetchHetznerPlans();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('cx11');
    });

    it('should include ARM servers when HETZNER_INCLUDE_ARM is true', async () => {
      process.env.HETZNER_API_KEY = 'test-api-key';
      process.env.HETZNER_INCLUDE_ARM = 'true';

      const mockServerTypesResponse = {
        server_types: [
          {
            name: 'cx11',
            cores: 1,
            memory: 2,
            disk: 20,
            deprecated: false,
            architecture: 'x86',
            cpu_type: 'shared',
            storage_type: 'local',
            prices: [{ price_monthly: { gross: '4.15' } }]
          },
          {
            name: 'cax11',
            cores: 2,
            memory: 4,
            disk: 40,
            deprecated: false,
            architecture: 'arm64',
            cpu_type: 'shared',
            storage_type: 'local',
            prices: [{ price_monthly: { gross: '3.79' } }]
          }
        ]
      };

      const mockLocationsResponse = {
        locations: [{ city: 'Falkenstein', country: 'Germany' }]
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockServerTypesResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockLocationsResponse
        } as Response);

      const result = await fetchHetznerPlans();

      expect(result).toHaveLength(2);
      expect(result.map(r => r.name)).toEqual(['cx11', 'cax11']);
    });
  });

  describe('Pricing Calculation', () => {
    it('should select the cheapest price from multiple prices', async () => {
      process.env.HETZNER_API_KEY = 'test-api-key';

      const mockServerTypesResponse = {
        server_types: [
          {
            name: 'cx11',
            cores: 1,
            memory: 2,
            disk: 20,
            deprecated: false,
            architecture: 'x86',
            cpu_type: 'shared',
            storage_type: 'local',
            prices: [
              { price_monthly: { gross: '5.00' } },
              { price_monthly: { gross: '4.15' } },
              { price_monthly: { gross: '4.50' } }
            ]
          }
        ]
      };

      const mockLocationsResponse = {
        locations: [{ city: 'Falkenstein', country: 'Germany' }]
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockServerTypesResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockLocationsResponse
        } as Response);

      const result = await fetchHetznerPlans();

      expect(result[0].price.monthly).toBe(4.15);
    });

    it('should use EUR currency', async () => {
      process.env.HETZNER_API_KEY = 'test-api-key';

      const mockServerTypesResponse = {
        server_types: [
          {
            name: 'cx11',
            cores: 1,
            memory: 2,
            disk: 20,
            deprecated: false,
            architecture: 'x86',
            cpu_type: 'shared',
            storage_type: 'local',
            prices: [{ price_monthly: { gross: '4.15' } }]
          }
        ]
      };

      const mockLocationsResponse = {
        locations: [{ city: 'Falkenstein', country: 'Germany' }]
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockServerTypesResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockLocationsResponse
        } as Response);

      const result = await fetchHetznerPlans();

      expect(result[0].price.currency).toBe('EUR');
    });
  });

  describe('CPU Type Detection', () => {
    it('should set CPU type to vCPU for shared CPUs', async () => {
      process.env.HETZNER_API_KEY = 'test-api-key';

      const mockServerTypesResponse = {
        server_types: [
          {
            name: 'cx11',
            cores: 1,
            memory: 2,
            disk: 20,
            deprecated: false,
            architecture: 'x86',
            cpu_type: 'shared',
            storage_type: 'local',
            prices: [{ price_monthly: { gross: '4.15' } }]
          }
        ]
      };

      const mockLocationsResponse = {
        locations: [{ city: 'Falkenstein', country: 'Germany' }]
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockServerTypesResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockLocationsResponse
        } as Response);

      const result = await fetchHetznerPlans();

      expect(result[0].specs.cpu.type).toBe('vCPU');
    });

    it('should set CPU type to CPU for dedicated CPUs', async () => {
      process.env.HETZNER_API_KEY = 'test-api-key';

      const mockServerTypesResponse = {
        server_types: [
          {
            name: 'ccx11',
            cores: 2,
            memory: 8,
            disk: 80,
            deprecated: false,
            architecture: 'x86',
            cpu_type: 'dedicated',
            storage_type: 'local',
            prices: [{ price_monthly: { gross: '15.00' } }]
          }
        ]
      };

      const mockLocationsResponse = {
        locations: [{ city: 'Falkenstein', country: 'Germany' }]
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockServerTypesResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockLocationsResponse
        } as Response);

      const result = await fetchHetznerPlans();

      expect(result[0].specs.cpu.type).toBe('CPU');
    });
  });

  describe('Storage Type Detection', () => {
    it('should set storage type to SSD for local storage', async () => {
      process.env.HETZNER_API_KEY = 'test-api-key';

      const mockServerTypesResponse = {
        server_types: [
          {
            name: 'cx11',
            cores: 1,
            memory: 2,
            disk: 20,
            deprecated: false,
            architecture: 'x86',
            cpu_type: 'shared',
            storage_type: 'local',
            prices: [{ price_monthly: { gross: '4.15' } }]
          }
        ]
      };

      const mockLocationsResponse = {
        locations: [{ city: 'Falkenstein', country: 'Germany' }]
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockServerTypesResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockLocationsResponse
        } as Response);

      const result = await fetchHetznerPlans();

      expect(result[0].specs.storage.type).toBe('SSD');
    });

    it('should set storage type to NVMe for non-local storage', async () => {
      process.env.HETZNER_API_KEY = 'test-api-key';

      const mockServerTypesResponse = {
        server_types: [
          {
            name: 'ccx11',
            cores: 2,
            memory: 8,
            disk: 80,
            deprecated: false,
            architecture: 'x86',
            cpu_type: 'dedicated',
            storage_type: 'network',
            prices: [{ price_monthly: { gross: '15.00' } }]
          }
        ]
      };

      const mockLocationsResponse = {
        locations: [{ city: 'Falkenstein', country: 'Germany' }]
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockServerTypesResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockLocationsResponse
        } as Response);

      const result = await fetchHetznerPlans();

      expect(result[0].specs.storage.type).toBe('NVMe');
    });
  });

  describe('Tags and Features', () => {
    it('should include ARM tags for ARM architecture', async () => {
      process.env.HETZNER_API_KEY = 'test-api-key';
      process.env.HETZNER_INCLUDE_ARM = 'true';

      const mockServerTypesResponse = {
        server_types: [
          {
            name: 'cax11',
            cores: 2,
            memory: 4,
            disk: 40,
            deprecated: false,
            architecture: 'arm64',
            cpu_type: 'shared',
            storage_type: 'local',
            prices: [{ price_monthly: { gross: '3.79' } }]
          }
        ]
      };

      const mockLocationsResponse = {
        locations: [{ city: 'Falkenstein', country: 'Germany' }]
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockServerTypesResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockLocationsResponse
        } as Response);

      const result = await fetchHetznerPlans();

      expect(result[0].tags).toContain('arm');
      expect(result[0].tags).toContain('energy-efficient');
    });

    it('should add ultra-budget tag for very cheap plans', async () => {
      process.env.HETZNER_API_KEY = 'test-api-key';

      const mockServerTypesResponse = {
        server_types: [
          {
            name: 'cx11',
            cores: 1,
            memory: 2,
            disk: 20,
            deprecated: false,
            architecture: 'x86',
            cpu_type: 'shared',
            storage_type: 'local',
            prices: [{ price_monthly: { gross: '4.15' } }]
          }
        ]
      };

      const mockLocationsResponse = {
        locations: [{ city: 'Falkenstein', country: 'Germany' }]
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockServerTypesResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockLocationsResponse
        } as Response);

      const result = await fetchHetznerPlans();

      expect(result[0].tags).toContain('ultra-budget');
    });

    it('should add high-performance tag for 4+ cores', async () => {
      process.env.HETZNER_API_KEY = 'test-api-key';

      const mockServerTypesResponse = {
        server_types: [
          {
            name: 'cx41',
            cores: 4,
            memory: 16,
            disk: 160,
            deprecated: false,
            architecture: 'x86',
            cpu_type: 'shared',
            storage_type: 'local',
            prices: [{ price_monthly: { gross: '25.00' } }]
          }
        ]
      };

      const mockLocationsResponse = {
        locations: [{ city: 'Falkenstein', country: 'Germany' }]
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockServerTypesResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockLocationsResponse
        } as Response);

      const result = await fetchHetznerPlans();

      expect(result[0].tags).toContain('high-performance');
      expect(result[0].tags).toContain('high-memory');
    });

    it('should include all required features', async () => {
      process.env.HETZNER_API_KEY = 'test-api-key';

      const mockServerTypesResponse = {
        server_types: [
          {
            name: 'cx11',
            cores: 1,
            memory: 2,
            disk: 20,
            deprecated: false,
            architecture: 'x86',
            cpu_type: 'shared',
            storage_type: 'local',
            prices: [{ price_monthly: { gross: '4.15' } }]
          }
        ]
      };

      const mockLocationsResponse = {
        locations: [{ city: 'Falkenstein', country: 'Germany' }]
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockServerTypesResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockLocationsResponse
        } as Response);

      const result = await fetchHetznerPlans();

      expect(result[0].features).toEqual([
        'SSD Storage',
        'IPv6',
        'Private Networking',
        'Snapshots',
        'Backups',
        'Load Balancers',
        'Floating IPs',
        'DDoS Protection'
      ]);
    });
  });

  describe('Location Formatting', () => {
    it('should format locations as "City, Country"', async () => {
      process.env.HETZNER_API_KEY = 'test-api-key';

      const mockServerTypesResponse = {
        server_types: [
          {
            name: 'cx11',
            cores: 1,
            memory: 2,
            disk: 20,
            deprecated: false,
            architecture: 'x86',
            cpu_type: 'shared',
            storage_type: 'local',
            prices: [{ price_monthly: { gross: '4.15' } }]
          }
        ]
      };

      const mockLocationsResponse = {
        locations: [
          { city: 'Falkenstein', country: 'Germany' },
          { city: 'Helsinki', country: 'Finland' },
          { city: 'Ashburn', country: 'USA' }
        ]
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockServerTypesResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockLocationsResponse
        } as Response);

      const result = await fetchHetznerPlans();

      expect(result[0].locations).toEqual([
        'Falkenstein, Germany',
        'Helsinki, Finland',
        'Ashburn, USA'
      ]);
    });
  });

  describe('Featured Plans', () => {
    it('should mark cx11, cx21, and cx31 as featured', async () => {
      process.env.HETZNER_API_KEY = 'test-api-key';

      const mockServerTypesResponse = {
        server_types: [
          {
            name: 'cx11',
            cores: 1,
            memory: 2,
            disk: 20,
            deprecated: false,
            architecture: 'x86',
            cpu_type: 'shared',
            storage_type: 'local',
            prices: [{ price_monthly: { gross: '4.15' } }]
          },
          {
            name: 'CX21',
            cores: 2,
            memory: 4,
            disk: 40,
            deprecated: false,
            architecture: 'x86',
            cpu_type: 'shared',
            storage_type: 'local',
            prices: [{ price_monthly: { gross: '6.30' } }]
          },
          {
            name: 'cx41',
            cores: 4,
            memory: 16,
            disk: 160,
            deprecated: false,
            architecture: 'x86',
            cpu_type: 'shared',
            storage_type: 'local',
            prices: [{ price_monthly: { gross: '25.00' } }]
          }
        ]
      };

      const mockLocationsResponse = {
        locations: [{ city: 'Falkenstein', country: 'Germany' }]
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockServerTypesResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockLocationsResponse
        } as Response);

      const result = await fetchHetznerPlans();

      expect(result[0].featured).toBe(true);
      expect(result[1].featured).toBe(true);
      expect(result[2].featured).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should return empty array when API request fails', async () => {
      process.env.HETZNER_API_KEY = 'test-api-key';
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401
      } as Response);

      const result = await fetchHetznerPlans();

      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to fetch Hetzner plans:',
        expect.any(Error)
      );
    });

    it('should return empty array when network error occurs', async () => {
      process.env.HETZNER_API_KEY = 'test-api-key';
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await fetchHetznerPlans();

      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
});
