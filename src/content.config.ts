import { defineCollection, z } from 'astro:content';
import { fetchDigitalOceanPlans, fetchLinodePlans, fetchHetznerPlans, fetchVultrPlans, fetchUpCloudPlans, fetchScalewayPlans } from './loaders';

// Define the VPS plan schema with comprehensive validation
const vpsSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  provider: z.string().min(1, 'Provider name is required'),
  name: z.string().min(1, 'Plan name is required'),
  price: z.object({
    monthly: z.number().positive('Monthly price must be positive'),
    yearly: z.number().positive('Yearly price must be positive').optional(),
    currency: z.enum(['USD', 'EUR', 'GBP'], {
      errorMap: () => ({ message: 'Currency must be USD, EUR, or GBP' })
    })
  }),
  specs: z.object({
    cpu: z.object({
      cores: z.number().int().positive('CPU cores must be a positive integer'),
      type: z.enum(['vCPU', 'CPU', 'Core']).default('vCPU')
    }),
    ram: z.object({
      amount: z.number().positive('RAM amount must be positive'),
      unit: z.enum(['MB', 'GB', 'TB']).default('GB')
    }),
    storage: z.object({
      amount: z.number().positive('Storage amount must be positive'),
      unit: z.enum(['GB', 'TB']).default('GB'),
      type: z.enum(['SSD', 'NVMe', 'HDD', 'EBS']).default('SSD')
    }),
    bandwidth: z.object({
      amount: z.number().nonnegative('Bandwidth amount must be non-negative').optional(),
      unit: z.enum(['GB', 'TB']).default('TB'),
      unlimited: z.boolean().default(false)
    })
  }),
  features: z.array(z.string()).min(1, 'At least one feature is required'),
  locations: z.array(z.string()).min(1, 'At least one location is required'),
  uptime: z.object({
    percentage: z.number().min(0).max(100, 'Uptime percentage must be between 0 and 100'),
    sla: z.boolean().default(false)
  }),
  support: z.string().min(1, 'Support information is required'),
  website: z.string().url('Website must be a valid URL'),
  // Optional fields for future extensibility
  tags: z.array(z.string()).optional(),
  description: z.string().optional(),
  featured: z.boolean().default(false),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
});


// Define collections with external loaders
const vpsPlans = defineCollection({
  loader: async () => {
    console.log('🚀 Fetching VPS plans from providers...');

    // Fetch from all providers in parallel
    const [digitalOceanPlans, hetznerPlans, linodePlans, vultrPlans, upCloudPlans, scalewayPlans] = await Promise.all([
      fetchDigitalOceanPlans(),
      fetchHetznerPlans(),
      fetchLinodePlans(),
      fetchVultrPlans(),
      fetchUpCloudPlans(),
      fetchScalewayPlans()
    ]);

    // Combine all plans
    const allPlans = [
      ...digitalOceanPlans,
      ...hetznerPlans,
      ...linodePlans,
      ...vultrPlans,
      ...upCloudPlans,
      ...scalewayPlans
    ];

    console.log(`✅ Fetched ${allPlans.length} VPS plans total`);
    console.log(`   - DigitalOcean: ${digitalOceanPlans.length} plans`);
    console.log(`   - Hetzner: ${hetznerPlans.length} plans`);
    console.log(`   - Linode: ${linodePlans.length} plans`);
    console.log(`   - Vultr: ${vultrPlans.length} plans`);
    console.log(`   - UpCloud: ${upCloudPlans.length} plans`);
    console.log(`   - Scaleway: ${scalewayPlans.length} plans`);

    return allPlans;
  },
  schema: vpsSchema
});

// Export collections
export const collections = {
  vpsPlans
};
