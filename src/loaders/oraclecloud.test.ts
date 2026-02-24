import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchOracleCloudPlans } from './oraclecloud';

describe('Oracle Cloud Loader', () => {
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
    it('should successfully fetch and transform plans from public pricing API', async () => {
      const mockPricingResponse = {
        items: [
          {
            partNumber: 'B88298',
            displayName: 'VM.Standard.A1.Flex',
            metricName: 'OCPU Per Hour',
            serviceCategory: 'Compute - Virtual Machine',
            prices: [
              {
                currencyCode: 'USD',
                prices: [
                  { model: 'PAY_AS_YOU_GO', value: 0.01 },
                  { model: 'MONTHLY_COMMIT', value: 7.3 }
                ]
              }
            ]
          },
          {
            partNumber: 'B89274',
            displayName: 'VM.Standard.E5.Flex',
            metricName: 'OCPU Per Hour',
            serviceCategory: 'Compute - Virtual Machine',
            prices: [
              {
                currencyCode: 'USD',
                prices: [
                  { model: 'PAY_AS_YOU_GO', value: 0.03 },
                  { model: 'MONTHLY_COMMIT', value: 21.9 }
                ]
              }
            ]
          }
        ]
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockPricingResponse
      } as Response);

      const result = await fetchOracleCloudPlans();

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'oraclecloud-b88298',
        provider: 'Oracle Cloud',
        name: 'VM.Standard.A1.Flex'
      });
      expect(result[0]!.price.monthly).toBeGreaterThan(0);
      expect(result[0]!.price.currency).toBe('USD');
    });

    it('should filter out non-VM products', async () => {
      const mockPricingResponse = {
        items: [
          {
            partNumber: 'B88298',
            displayName: 'VM.Standard.A1.Flex',
            metricName: 'OCPU Per Hour',
            serviceCategory: 'Compute - Virtual Machine',
            prices: [
              {
                currencyCode: 'USD',
                prices: [{ model: 'PAY_AS_YOU_GO', value: 0.01 }]
              }
            ]
          },
          {
            partNumber: 'B99999',
            displayName: 'Block Volume',
            metricName: 'GB Per Month',
            serviceCategory: 'Storage',
            prices: [
              {
                currencyCode: 'USD',
                prices: [{ model: 'PAY_AS_YOU_GO', value: 0.0255 }]
              }
            ]
          },
          {
            partNumber: 'B88888',
            displayName: 'BM.Standard3.64',
            metricName: 'OCPU Per Hour',
            serviceCategory: 'Compute - Virtual Machine',
            prices: [
              {
                currencyCode: 'USD',
                prices: [{ model: 'PAY_AS_YOU_GO', value: 0.05 }]
              }
            ]
          }
        ]
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockPricingResponse
      } as Response);

      const result = await fetchOracleCloudPlans();

      // Should only include VM. prefixed products
      expect(result).toHaveLength(1);
      expect(result[0]!.name).toBe('VM.Standard.A1.Flex');
    });

    it('should filter out products without valid pricing', async () => {
      const mockPricingResponse = {
        items: [
          {
            partNumber: 'B88298',
            displayName: 'VM.Standard.A1.Flex',
            metricName: 'OCPU Per Hour',
            serviceCategory: 'Compute - Virtual Machine',
            prices: [
              {
                currencyCode: 'EUR',
                prices: [{ model: 'PAY_AS_YOU_GO', value: 0.01 }]
              }
            ]
          }
        ]
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockPricingResponse
      } as Response);

      // Default currency is USD but response only has EUR pricing
      const result = await fetchOracleCloudPlans();

      expect(result).toHaveLength(0);
    });
  });

  describe('Data Transformation', () => {
    it('should calculate monthly price from hourly rate', async () => {
      const mockPricingResponse = {
        items: [
          {
            partNumber: 'B88298',
            displayName: 'VM.Standard.A1.Flex',
            metricName: 'OCPU Per Hour',
            serviceCategory: 'Compute - Virtual Machine',
            prices: [
              {
                currencyCode: 'USD',
                prices: [{ model: 'PAY_AS_YOU_GO', value: 0.01 }]
              }
            ]
          }
        ]
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockPricingResponse
      } as Response);

      const result = await fetchOracleCloudPlans();

      // 0.01 * 730 hours * 4 cores = 29.20
      expect(result[0]!.price.monthly).toBe(29.2);
    });

    it('should prefer monthly commit pricing when available', async () => {
      const mockPricingResponse = {
        items: [
          {
            partNumber: 'B88298',
            displayName: 'VM.Standard.A1.Flex',
            metricName: 'OCPU Per Hour',
            serviceCategory: 'Compute - Virtual Machine',
            prices: [
              {
                currencyCode: 'USD',
                prices: [
                  { model: 'PAY_AS_YOU_GO', value: 0.01 },
                  { model: 'MONTHLY_COMMIT', value: 5.0 }
                ]
              }
            ]
          }
        ]
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockPricingResponse
      } as Response);

      const result = await fetchOracleCloudPlans();

      // 5.0 * 4 cores = 20.0
      expect(result[0]!.price.monthly).toBe(20);
    });

    it('should tag ARM instances correctly', async () => {
      const mockPricingResponse = {
        items: [
          {
            partNumber: 'B88298',
            displayName: 'VM.Standard.A1.Flex',
            metricName: 'OCPU Per Hour',
            serviceCategory: 'Compute - Virtual Machine',
            prices: [
              {
                currencyCode: 'USD',
                prices: [{ model: 'PAY_AS_YOU_GO', value: 0.01 }]
              }
            ]
          }
        ]
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockPricingResponse
      } as Response);

      const result = await fetchOracleCloudPlans();

      expect(result[0]!.tags).toContain('arm');
      expect(result[0]!.tags).toContain('energy-efficient');
    });

    it('should include required features', async () => {
      const mockPricingResponse = {
        items: [
          {
            partNumber: 'B88298',
            displayName: 'VM.Standard.A1.Flex',
            metricName: 'OCPU Per Hour',
            serviceCategory: 'Compute - Virtual Machine',
            prices: [
              {
                currencyCode: 'USD',
                prices: [{ model: 'PAY_AS_YOU_GO', value: 0.01 }]
              }
            ]
          }
        ]
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockPricingResponse
      } as Response);

      const result = await fetchOracleCloudPlans();

      expect(result[0]!.features).toContain('Always Free Tier Available');
      expect(result[0]!.features).toContain('NVMe Storage');
      expect(result[0]!.features.length).toBeGreaterThan(0);
    });

    it('should mark A1 and E5 shapes as featured', async () => {
      const mockPricingResponse = {
        items: [
          {
            partNumber: 'B88298',
            displayName: 'VM.Standard.A1.Flex',
            metricName: 'OCPU Per Hour',
            serviceCategory: 'Compute - Virtual Machine',
            prices: [{ currencyCode: 'USD', prices: [{ model: 'PAY_AS_YOU_GO', value: 0.01 }] }]
          },
          {
            partNumber: 'B89274',
            displayName: 'VM.Standard.E5.Flex',
            metricName: 'OCPU Per Hour',
            serviceCategory: 'Compute - Virtual Machine',
            prices: [{ currencyCode: 'USD', prices: [{ model: 'PAY_AS_YOU_GO', value: 0.03 }] }]
          },
          {
            partNumber: 'B89275',
            displayName: 'VM.Standard.E4.Flex',
            metricName: 'OCPU Per Hour',
            serviceCategory: 'Compute - Virtual Machine',
            prices: [{ currencyCode: 'USD', prices: [{ model: 'PAY_AS_YOU_GO', value: 0.025 }] }]
          }
        ]
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockPricingResponse
      } as Response);

      const result = await fetchOracleCloudPlans();

      expect(result[0]!.featured).toBe(true); // A1
      expect(result[1]!.featured).toBe(true); // E5
      expect(result[2]!.featured).toBe(false); // E4
    });
  });

  describe('Environment Configuration', () => {
    it('should use ORACLE_CURRENCY env var when set', async () => {
      process.env.ORACLE_CURRENCY = 'EUR';

      const mockPricingResponse = { items: [] };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockPricingResponse
      } as Response);

      await fetchOracleCloudPlans();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('currencyCode=EUR'),
        expect.any(Object)
      );
    });

    it('should default to USD currency', async () => {
      delete process.env.ORACLE_CURRENCY;

      const mockPricingResponse = { items: [] };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockPricingResponse
      } as Response);

      await fetchOracleCloudPlans();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('currencyCode=USD'),
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

      const result = await fetchOracleCloudPlans();

      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to fetch Oracle Cloud plans:',
        expect.any(Error)
      );
    });

    it('should return empty array when network error occurs', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await fetchOracleCloudPlans();

      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
});
