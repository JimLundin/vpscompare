import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchLinodePlans } from './linode';

describe('Linode Loader', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Data Fetching', () => {
    it('should successfully fetch and transform plans', async () => {
      const mockTypesResponse = {
        data: [
          {
            id: 'g6-nanode-1',
            label: 'Nanode 1GB',
            class: 'nanode',
            vcpus: 1,
            memory: 1024,
            disk: 25600,
            transfer: 1000,
            price: {
              monthly: 5.0
            }
          },
          {
            id: 'g6-standard-1',
            label: 'Linode 2GB',
            class: 'standard',
            vcpus: 1,
            memory: 2048,
            disk: 51200,
            transfer: 2000,
            price: {
              monthly: 10.0
            }
          }
        ]
      };

      const mockRegionsResponse = {
        data: [
          { status: 'ok', label: 'Newark, NJ' },
          { status: 'ok', label: 'London, UK' }
        ]
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTypesResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRegionsResponse
        } as Response);

      const result = await fetchLinodePlans();

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'linode-g6-nanode-1',
        provider: 'Linode',
        name: 'Nanode',
        price: {
          monthly: 5.0,
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
            amount: 1000,
            unit: 'GB',
            unlimited: false
          }
        }
      });
    });

    it('should filter out GPU plans', async () => {
      const mockTypesResponse = {
        data: [
          {
            id: 'g6-standard-1',
            label: 'Linode 2GB',
            class: 'standard',
            vcpus: 1,
            memory: 2048,
            disk: 51200,
            transfer: 2000,
            price: { monthly: 10.0 }
          },
          {
            id: 'g1-gpu-rtx6000-1',
            label: 'GPU RTX6000',
            class: 'gpu',
            vcpus: 8,
            memory: 32768,
            disk: 640000,
            transfer: 16000,
            price: { monthly: 1000.0 }
          }
        ]
      };

      const mockRegionsResponse = {
        data: [{ status: 'ok', label: 'Newark, NJ' }]
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTypesResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRegionsResponse
        } as Response);

      const result = await fetchLinodePlans();

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe('linode-g6-standard-1');
    });

    it('should filter out accelerated plans', async () => {
      const mockTypesResponse = {
        data: [
          {
            id: 'g6-standard-1',
            label: 'Linode 2GB',
            class: 'standard',
            vcpus: 1,
            memory: 2048,
            disk: 51200,
            transfer: 2000,
            price: { monthly: 10.0 }
          },
          {
            id: 'g6-accelerated-1',
            label: 'Accelerated Plan',
            class: 'accelerated',
            vcpus: 4,
            memory: 8192,
            disk: 102400,
            transfer: 4000,
            price: { monthly: 80.0 }
          }
        ]
      };

      const mockRegionsResponse = {
        data: [{ status: 'ok', label: 'Newark, NJ' }]
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTypesResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRegionsResponse
        } as Response);

      const result = await fetchLinodePlans();

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe('linode-g6-standard-1');
    });
  });

  describe('Plan Class Mapping', () => {
    it('should correctly map plan class names', async () => {
      const mockTypesResponse = {
        data: [
          {
            id: 'g6-nanode-1',
            label: 'Nanode',
            class: 'nanode',
            vcpus: 1,
            memory: 1024,
            disk: 25600,
            transfer: 1000,
            price: { monthly: 5.0 }
          },
          {
            id: 'g6-standard-1',
            label: 'Standard',
            class: 'standard',
            vcpus: 1,
            memory: 2048,
            disk: 51200,
            transfer: 2000,
            price: { monthly: 10.0 }
          },
          {
            id: 'g6-dedicated-1',
            label: 'Dedicated',
            class: 'dedicated',
            vcpus: 2,
            memory: 4096,
            disk: 81920,
            transfer: 4000,
            price: { monthly: 30.0 }
          },
          {
            id: 'g6-highmem-1',
            label: 'High Memory',
            class: 'highmem',
            vcpus: 2,
            memory: 24576,
            disk: 20480,
            transfer: 5000,
            price: { monthly: 60.0 }
          },
          {
            id: 'g6-premium-1',
            label: 'Premium',
            class: 'premium',
            vcpus: 2,
            memory: 4096,
            disk: 81920,
            transfer: 4000,
            price: { monthly: 43.0 }
          }
        ]
      };

      const mockRegionsResponse = {
        data: [{ status: 'ok', label: 'Newark, NJ' }]
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTypesResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRegionsResponse
        } as Response);

      const result = await fetchLinodePlans();

      expect(result[0]!.name).toBe('Nanode');
      expect(result[1]!.name).toBe('Standard');
      expect(result[2]!.name).toBe('Dedicated CPU');
      expect(result[3]!.name).toBe('High Memory');
      expect(result[4]!.name).toBe('Premium');
    });
  });

  describe('CPU Type Detection', () => {
    it('should set CPU type to CPU for dedicated plans', async () => {
      const mockTypesResponse = {
        data: [
          {
            id: 'g6-dedicated-1',
            label: 'Dedicated',
            class: 'dedicated',
            vcpus: 2,
            memory: 4096,
            disk: 81920,
            transfer: 4000,
            price: { monthly: 30.0 }
          }
        ]
      };

      const mockRegionsResponse = {
        data: [{ status: 'ok', label: 'Newark, NJ' }]
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTypesResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRegionsResponse
        } as Response);

      const result = await fetchLinodePlans();

      expect(result[0]!.specs.cpu.type).toBe('CPU');
    });

    it('should set CPU type to vCPU for shared plans', async () => {
      const mockTypesResponse = {
        data: [
          {
            id: 'g6-standard-1',
            label: 'Standard',
            class: 'standard',
            vcpus: 1,
            memory: 2048,
            disk: 51200,
            transfer: 2000,
            price: { monthly: 10.0 }
          }
        ]
      };

      const mockRegionsResponse = {
        data: [{ status: 'ok', label: 'Newark, NJ' }]
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTypesResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRegionsResponse
        } as Response);

      const result = await fetchLinodePlans();

      expect(result[0]!.specs.cpu.type).toBe('vCPU');
    });
  });

  describe('Unit Conversions', () => {
    it('should convert memory from MB to GB when >= 1024MB', async () => {
      const mockTypesResponse = {
        data: [
          {
            id: 'g6-standard-1',
            label: 'Standard',
            class: 'standard',
            vcpus: 1,
            memory: 2048,
            disk: 51200,
            transfer: 2000,
            price: { monthly: 10.0 }
          }
        ]
      };

      const mockRegionsResponse = {
        data: [{ status: 'ok', label: 'Newark, NJ' }]
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTypesResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRegionsResponse
        } as Response);

      const result = await fetchLinodePlans();

      expect(result[0]!.specs.ram).toEqual({ amount: 2, unit: 'GB' });
    });

    it('should keep memory in MB when < 1024MB', async () => {
      const mockTypesResponse = {
        data: [
          {
            id: 'g6-small',
            label: 'Small',
            class: 'standard',
            vcpus: 1,
            memory: 512,
            disk: 20480,
            transfer: 1000,
            price: { monthly: 5.0 }
          }
        ]
      };

      const mockRegionsResponse = {
        data: [{ status: 'ok', label: 'Newark, NJ' }]
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTypesResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRegionsResponse
        } as Response);

      const result = await fetchLinodePlans();

      expect(result[0]!.specs.ram).toEqual({ amount: 512, unit: 'MB' });
    });

    it('should convert disk from MB to GB when >= 1024MB', async () => {
      const mockTypesResponse = {
        data: [
          {
            id: 'g6-standard-1',
            label: 'Standard',
            class: 'standard',
            vcpus: 1,
            memory: 2048,
            disk: 51200,
            transfer: 2000,
            price: { monthly: 10.0 }
          }
        ]
      };

      const mockRegionsResponse = {
        data: [{ status: 'ok', label: 'Newark, NJ' }]
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTypesResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRegionsResponse
        } as Response);

      const result = await fetchLinodePlans();

      expect(result[0]!.specs.storage).toEqual({ amount: 50, unit: 'GB', type: 'SSD' });
    });

    it('should convert transfer from GB to TB when >= 1024GB', async () => {
      const mockTypesResponse = {
        data: [
          {
            id: 'g6-large',
            label: 'Large',
            class: 'standard',
            vcpus: 4,
            memory: 8192,
            disk: 163840,
            transfer: 5000,
            price: { monthly: 40.0 }
          }
        ]
      };

      const mockRegionsResponse = {
        data: [{ status: 'ok', label: 'Newark, NJ' }]
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTypesResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRegionsResponse
        } as Response);

      const result = await fetchLinodePlans();

      expect(result[0]!.specs.bandwidth).toEqual({
        amount: 5000 / 1024, // 5000 GB converted to TB
        unit: 'TB',
        unlimited: false
      });
    });
  });

  describe('Features by Plan Class', () => {
    it('should include correct features for nanode plans', async () => {
      const mockTypesResponse = {
        data: [
          {
            id: 'g6-nanode-1',
            label: 'Nanode',
            class: 'nanode',
            vcpus: 1,
            memory: 1024,
            disk: 25600,
            transfer: 1000,
            price: { monthly: 5.0 }
          }
        ]
      };

      const mockRegionsResponse = {
        data: [{ status: 'ok', label: 'Newark, NJ' }]
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTypesResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRegionsResponse
        } as Response);

      const result = await fetchLinodePlans();

      expect(result[0]!.features).toContain('Shared CPU');
    });

    it('should include correct features for standard plans', async () => {
      const mockTypesResponse = {
        data: [
          {
            id: 'g6-standard-1',
            label: 'Standard',
            class: 'standard',
            vcpus: 1,
            memory: 2048,
            disk: 51200,
            transfer: 2000,
            price: { monthly: 10.0 }
          }
        ]
      };

      const mockRegionsResponse = {
        data: [{ status: 'ok', label: 'Newark, NJ' }]
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTypesResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRegionsResponse
        } as Response);

      const result = await fetchLinodePlans();

      expect(result[0]!.features).toContain('Burstable Performance');
      expect(result[0]!.features).toContain('Shared CPU');
    });

    it('should include correct features for dedicated plans', async () => {
      const mockTypesResponse = {
        data: [
          {
            id: 'g6-dedicated-1',
            label: 'Dedicated',
            class: 'dedicated',
            vcpus: 2,
            memory: 4096,
            disk: 81920,
            transfer: 4000,
            price: { monthly: 30.0 }
          }
        ]
      };

      const mockRegionsResponse = {
        data: [{ status: 'ok', label: 'Newark, NJ' }]
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTypesResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRegionsResponse
        } as Response);

      const result = await fetchLinodePlans();

      expect(result[0]!.features).toContain('Dedicated CPU');
      expect(result[0]!.features).toContain('Sustained Performance');
    });

    it('should include correct features for highmem plans', async () => {
      const mockTypesResponse = {
        data: [
          {
            id: 'g6-highmem-1',
            label: 'High Memory',
            class: 'highmem',
            vcpus: 2,
            memory: 24576,
            disk: 20480,
            transfer: 5000,
            price: { monthly: 60.0 }
          }
        ]
      };

      const mockRegionsResponse = {
        data: [{ status: 'ok', label: 'Newark, NJ' }]
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTypesResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRegionsResponse
        } as Response);

      const result = await fetchLinodePlans();

      expect(result[0]!.features).toContain('High Memory');
      expect(result[0]!.features).toContain('Optimized for Memory-Intensive Applications');
    });

    it('should include correct features for premium plans', async () => {
      const mockTypesResponse = {
        data: [
          {
            id: 'g6-premium-1',
            label: 'Premium',
            class: 'premium',
            vcpus: 2,
            memory: 4096,
            disk: 81920,
            transfer: 4000,
            price: { monthly: 43.0 }
          }
        ]
      };

      const mockRegionsResponse = {
        data: [{ status: 'ok', label: 'Newark, NJ' }]
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTypesResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRegionsResponse
        } as Response);

      const result = await fetchLinodePlans();

      expect(result[0]!.features).toContain('Premium Hardware');
      expect(result[0]!.features).toContain('Enhanced Performance');
      expect(result[0]!.features).toContain('Advanced Networking');
    });
  });

  describe('Tags', () => {
    it('should add budget tag for plans <= $10/month', async () => {
      const mockTypesResponse = {
        data: [
          {
            id: 'g6-nanode-1',
            label: 'Nanode',
            class: 'nanode',
            vcpus: 1,
            memory: 1024,
            disk: 25600,
            transfer: 1000,
            price: { monthly: 5.0 }
          }
        ]
      };

      const mockRegionsResponse = {
        data: [{ status: 'ok', label: 'Newark, NJ' }]
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTypesResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRegionsResponse
        } as Response);

      const result = await fetchLinodePlans();

      expect(result[0]!.tags).toContain('budget');
    });

    it('should add high-performance and dedicated tags for dedicated plans', async () => {
      const mockTypesResponse = {
        data: [
          {
            id: 'g6-dedicated-1',
            label: 'Dedicated',
            class: 'dedicated',
            vcpus: 2,
            memory: 4096,
            disk: 81920,
            transfer: 4000,
            price: { monthly: 30.0 }
          }
        ]
      };

      const mockRegionsResponse = {
        data: [{ status: 'ok', label: 'Newark, NJ' }]
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTypesResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRegionsResponse
        } as Response);

      const result = await fetchLinodePlans();

      expect(result[0]!.tags).toContain('high-performance');
      expect(result[0]!.tags).toContain('dedicated');
    });

    it('should add entry-level tag for nanode plans', async () => {
      const mockTypesResponse = {
        data: [
          {
            id: 'g6-nanode-1',
            label: 'Nanode',
            class: 'nanode',
            vcpus: 1,
            memory: 1024,
            disk: 25600,
            transfer: 1000,
            price: { monthly: 5.0 }
          }
        ]
      };

      const mockRegionsResponse = {
        data: [{ status: 'ok', label: 'Newark, NJ' }]
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTypesResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRegionsResponse
        } as Response);

      const result = await fetchLinodePlans();

      expect(result[0]!.tags).toContain('entry-level');
    });
  });

  describe('Region Handling', () => {
    it('should only include regions with "ok" status', async () => {
      const mockTypesResponse = {
        data: [
          {
            id: 'g6-standard-1',
            label: 'Standard',
            class: 'standard',
            vcpus: 1,
            memory: 2048,
            disk: 51200,
            transfer: 2000,
            price: { monthly: 10.0 }
          }
        ]
      };

      const mockRegionsResponse = {
        data: [
          { status: 'ok', label: 'Newark, NJ' },
          { status: 'ok', label: 'London, UK' },
          { status: 'unavailable', label: 'Tokyo, JP' }
        ]
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTypesResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRegionsResponse
        } as Response);

      const result = await fetchLinodePlans();

      expect(result[0]!.locations).toEqual(['Newark, NJ', 'London, UK']);
      expect(result[0]!.locations).not.toContain('Tokyo, JP');
    });

    it('should limit regions to 10 maximum', async () => {
      const mockTypesResponse = {
        data: [
          {
            id: 'g6-standard-1',
            label: 'Standard',
            class: 'standard',
            vcpus: 1,
            memory: 2048,
            disk: 51200,
            transfer: 2000,
            price: { monthly: 10.0 }
          }
        ]
      };

      const mockRegionsResponse = {
        data: Array.from({ length: 15 }, (_, i) => ({
          status: 'ok',
          label: `Region ${i + 1}`
        }))
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTypesResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRegionsResponse
        } as Response);

      const result = await fetchLinodePlans();

      expect(result[0]!.locations).toHaveLength(10);
    });
  });

  describe('Featured Plans', () => {
    it('should mark specific plan IDs as featured', async () => {
      const mockTypesResponse = {
        data: [
          {
            id: 'g6-nanode-1',
            label: 'Nanode',
            class: 'nanode',
            vcpus: 1,
            memory: 1024,
            disk: 25600,
            transfer: 1000,
            price: { monthly: 5.0 }
          },
          {
            id: 'g6-standard-1',
            label: 'Standard',
            class: 'standard',
            vcpus: 1,
            memory: 2048,
            disk: 51200,
            transfer: 2000,
            price: { monthly: 10.0 }
          },
          {
            id: 'g6-standard-2',
            label: 'Standard 2',
            class: 'standard',
            vcpus: 2,
            memory: 4096,
            disk: 81920,
            transfer: 4000,
            price: { monthly: 20.0 }
          },
          {
            id: 'g6-standard-4',
            label: 'Standard 4',
            class: 'standard',
            vcpus: 4,
            memory: 8192,
            disk: 163840,
            transfer: 5000,
            price: { monthly: 40.0 }
          }
        ]
      };

      const mockRegionsResponse = {
        data: [{ status: 'ok', label: 'Newark, NJ' }]
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTypesResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRegionsResponse
        } as Response);

      const result = await fetchLinodePlans();

      expect(result[0]!.featured).toBe(true); // g6-nanode-1
      expect(result[1]!.featured).toBe(true); // g6-standard-1
      expect(result[2]!.featured).toBe(true); // g6-standard-2
      expect(result[3]!.featured).toBe(false); // g6-standard-4
    });
  });

  describe('Uptime and Support', () => {
    it('should include 99.9% uptime with SLA', async () => {
      const mockTypesResponse = {
        data: [
          {
            id: 'g6-standard-1',
            label: 'Standard',
            class: 'standard',
            vcpus: 1,
            memory: 2048,
            disk: 51200,
            transfer: 2000,
            price: { monthly: 10.0 }
          }
        ]
      };

      const mockRegionsResponse = {
        data: [{ status: 'ok', label: 'Newark, NJ' }]
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTypesResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRegionsResponse
        } as Response);

      const result = await fetchLinodePlans();

      expect(result[0]!.uptime).toEqual({
        percentage: 99.9,
        sla: true
      });
      expect(result[0]!.support).toBe('24/7 Support');
    });
  });

  describe('Error Handling', () => {
    it('should return empty array when API request fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500
      } as Response);

      const result = await fetchLinodePlans();

      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to fetch Linode plans:',
        expect.any(Error)
      );
    });

    it('should return empty array when network error occurs', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await fetchLinodePlans();

      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
});
