import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchOVHcloudPlans } from './ovhcloud';

describe('OVHcloud Loader', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('Data Fetching', () => {
    it('should successfully fetch and transform plans from public catalog', async () => {
      const mockCatalogResponse = {
        catalogId: 12345,
        locale: {
          currencyCode: 'EUR',
          subsidiary: 'IE',
          taxRate: 23.0
        },
        plans: [
          {
            planCode: 'vps-starter-1-2-20',
            invoiceName: 'VPS Starter - 1 vCPU - 2 GB RAM - 20 GB SSD',
            product: 'vps',
            pricings: [
              {
                duration: 'P1M',
                pricingMode: 'default',
                price: 599000000
              }
            ]
          },
          {
            planCode: 'vps-value-2-4-80',
            invoiceName: 'VPS Value - 2 vCPU - 4 GB RAM - 80 GB SSD',
            product: 'vps',
            pricings: [
              {
                duration: 'P1M',
                pricingMode: 'default',
                price: 1199000000
              }
            ]
          }
        ],
        addons: []
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockCatalogResponse
      } as Response);

      const result = await fetchOVHcloudPlans();

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'ovhcloud-vps-starter-1-2-20',
        provider: 'OVHcloud',
        name: 'VPS Starter - 1 vCPU - 2 GB RAM - 20 GB SSD',
        price: {
          monthly: 5.99,
          currency: 'EUR'
        },
        specs: {
          cpu: { cores: 1, type: 'vCPU' },
          ram: { amount: 2, unit: 'GB' },
          storage: { amount: 20, unit: 'GB', type: 'SSD' }
        }
      });
    });

    it('should filter out non-VPS and legacy plans', async () => {
      const mockCatalogResponse = {
        catalogId: 12345,
        locale: { currencyCode: 'EUR', subsidiary: 'IE', taxRate: 23.0 },
        plans: [
          {
            planCode: 'vps-starter-1-2-20',
            invoiceName: 'VPS Starter',
            product: 'vps',
            pricings: [{ duration: 'P1M', pricingMode: 'default', price: 599000000 }]
          },
          {
            planCode: 'vps-legacy-old-plan',
            invoiceName: 'VPS Legacy',
            product: 'vps',
            pricings: [{ duration: 'P1M', pricingMode: 'default', price: 399000000 }]
          },
          {
            planCode: 'dedicated-server-1',
            invoiceName: 'Dedicated Server',
            product: 'dedicated',
            pricings: [{ duration: 'P1M', pricingMode: 'default', price: 5999000000 }]
          }
        ],
        addons: []
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockCatalogResponse
      } as Response);

      const result = await fetchOVHcloudPlans();

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe('ovhcloud-vps-starter-1-2-20');
    });

    it('should filter out plans with zero price', async () => {
      const mockCatalogResponse = {
        catalogId: 12345,
        locale: { currencyCode: 'EUR', subsidiary: 'IE', taxRate: 23.0 },
        plans: [
          {
            planCode: 'vps-free-trial',
            invoiceName: 'VPS Free Trial',
            product: 'vps',
            pricings: [{ duration: 'P1M', pricingMode: 'default', price: 0 }]
          },
          {
            planCode: 'vps-starter-1-2-20',
            invoiceName: 'VPS Starter - 1 vCPU - 2 GB RAM - 20 GB SSD',
            product: 'vps',
            pricings: [{ duration: 'P1M', pricingMode: 'default', price: 599000000 }]
          }
        ],
        addons: []
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockCatalogResponse
      } as Response);

      const result = await fetchOVHcloudPlans();

      expect(result).toHaveLength(1);
      expect(result[0]!.price.monthly).toBeGreaterThan(0);
    });
  });

  describe('Data Transformation', () => {
    it('should parse specs from invoice name', async () => {
      const mockCatalogResponse = {
        catalogId: 12345,
        locale: { currencyCode: 'EUR', subsidiary: 'IE', taxRate: 23.0 },
        plans: [
          {
            planCode: 'vps-comfort-4-8-160',
            invoiceName: 'VPS Comfort - 4 vCPU - 8 GB RAM - 160 GB SSD',
            product: 'vps',
            pricings: [{ duration: 'P1M', pricingMode: 'default', price: 2399000000 }]
          }
        ],
        addons: []
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockCatalogResponse
      } as Response);

      const result = await fetchOVHcloudPlans();

      expect(result[0]!.specs.cpu.cores).toBe(4);
      expect(result[0]!.specs.ram.amount).toBe(8);
      expect(result[0]!.specs.storage.amount).toBe(160);
    });

    it('should correctly convert OVH pricing format', async () => {
      const mockCatalogResponse = {
        catalogId: 12345,
        locale: { currencyCode: 'EUR', subsidiary: 'IE', taxRate: 23.0 },
        plans: [
          {
            planCode: 'vps-starter-1-2-20',
            invoiceName: 'VPS Starter - 1 vCPU - 2 GB RAM - 20 GB SSD',
            product: 'vps',
            pricings: [{ duration: 'P1M', pricingMode: 'default', price: 599000000 }]
          }
        ],
        addons: []
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockCatalogResponse
      } as Response);

      const result = await fetchOVHcloudPlans();

      expect(result[0]!.price.monthly).toBe(5.99);
      expect(result[0]!.price.currency).toBe('EUR');
    });

    it('should include required features and locations', async () => {
      const mockCatalogResponse = {
        catalogId: 12345,
        locale: { currencyCode: 'EUR', subsidiary: 'IE', taxRate: 23.0 },
        plans: [
          {
            planCode: 'vps-starter-1-2-20',
            invoiceName: 'VPS Starter - 1 vCPU - 2 GB RAM - 20 GB SSD',
            product: 'vps',
            pricings: [{ duration: 'P1M', pricingMode: 'default', price: 599000000 }]
          }
        ],
        addons: []
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockCatalogResponse
      } as Response);

      const result = await fetchOVHcloudPlans();

      expect(result[0]!.features.length).toBeGreaterThan(0);
      expect(result[0]!.features).toContain('Anti-DDoS Protection');
      expect(result[0]!.locations.length).toBeGreaterThan(0);
    });

    it('should assign budget tags for low-price plans', async () => {
      const mockCatalogResponse = {
        catalogId: 12345,
        locale: { currencyCode: 'EUR', subsidiary: 'IE', taxRate: 23.0 },
        plans: [
          {
            planCode: 'vps-starter-1-2-20',
            invoiceName: 'VPS Starter - 1 vCPU - 2 GB RAM - 20 GB SSD',
            product: 'vps',
            pricings: [{ duration: 'P1M', pricingMode: 'default', price: 399000000 }]
          }
        ],
        addons: []
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockCatalogResponse
      } as Response);

      const result = await fetchOVHcloudPlans();

      expect(result[0]!.tags).toContain('budget');
      expect(result[0]!.tags).toContain('ultra-budget');
    });
  });

  describe('Environment Configuration', () => {
    it('should use OVH_SUBSIDIARY env var when set', async () => {
      process.env.OVH_SUBSIDIARY = 'FR';

      const mockCatalogResponse = {
        catalogId: 12345,
        locale: { currencyCode: 'EUR', subsidiary: 'FR', taxRate: 20.0 },
        plans: [],
        addons: []
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockCatalogResponse
      } as Response);

      await fetchOVHcloudPlans();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('ovhSubsidiary=FR'),
        expect.any(Object)
      );
    });

    it('should default to IE subsidiary when env var not set', async () => {
      delete process.env.OVH_SUBSIDIARY;

      const mockCatalogResponse = {
        catalogId: 12345,
        locale: { currencyCode: 'EUR', subsidiary: 'IE', taxRate: 23.0 },
        plans: [],
        addons: []
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockCatalogResponse
      } as Response);

      await fetchOVHcloudPlans();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('ovhSubsidiary=IE'),
        expect.any(Object)
      );
    });
  });

  describe('Error Handling', () => {
    it('should return empty array when API request fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error'
      } as unknown as Response);

      const result = await fetchOVHcloudPlans();

      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to fetch OVHcloud plans:',
        expect.any(Error)
      );
    });

    it('should return empty array when network error occurs', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await fetchOVHcloudPlans();

      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
});
