import { defineCollection, z } from 'astro:content';
import { file } from 'astro/loaders';

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
		cpu: z.string().min(1, 'CPU specification is required'),
		ram: z.string().min(1, 'RAM specification is required'),
		storage: z.string().min(1, 'Storage specification is required'),
		bandwidth: z.string().min(1, 'Bandwidth specification is required')
	}),
	features: z.array(z.string()).min(1, 'At least one feature is required'),
	locations: z.array(z.string()).min(1, 'At least one location is required'),
	uptime: z.string().regex(/^\d+(\.\d+)?%$/, 'Uptime must be in format "99.9%"'),
	support: z.string().min(1, 'Support information is required'),
	website: z.string().url('Website must be a valid URL'),
	// Optional fields for future extensibility
	tags: z.array(z.string()).optional(),
	description: z.string().optional(),
	featured: z.boolean().default(false),
	createdAt: z.coerce.date().optional(),
	updatedAt: z.coerce.date().optional()
});

// Define collections
const vpsPlans = defineCollection({
	loader: file('src/data/vps-plans.json'),
	schema: vpsSchema
});

// Export collections
export const collections = {
	vpsPlans
};