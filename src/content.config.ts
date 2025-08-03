import { defineCollection, z } from 'astro:content';

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

// Helper function to fetch DigitalOcean plans
async function fetchDigitalOceanPlans() {
	const apiKey = process.env.DIGITALOCEAN_API_KEY;
	if (!apiKey) {
		console.warn('DIGITALOCEAN_API_KEY not set, skipping DigitalOcean plans');
		return [];
	}

	try {
		const headers = {
			'Authorization': `Bearer ${apiKey}`,
			'Content-Type': 'application/json'
		};

		// Fetch sizes and regions
		const [sizesResponse, regionsResponse] = await Promise.all([
			fetch('https://api.digitalocean.com/v2/sizes', { headers }),
			fetch('https://api.digitalocean.com/v2/regions', { headers })
		]);

		if (!sizesResponse.ok || !regionsResponse.ok) {
			throw new Error('Failed to fetch DigitalOcean data');
		}

		const [sizesData, regionsData] = await Promise.all([
			sizesResponse.json(),
			regionsResponse.json()
		]);

		const sizes = sizesData.sizes || [];
		const regions = regionsData.regions || [];

		return sizes
			.filter((size: any) => size.available && size.memory >= 512)
			.map((size: any) => {
				const availableRegions = regions
					.filter((region: any) => region.available && size.regions.includes(region.slug))
					.map((region: any) => region.name);

				return {
					id: `digitalocean-${size.slug}`,
					provider: 'DigitalOcean',
					name: size.description || `${size.memory}MB / ${size.vcpus} vCPU`,
					price: {
						monthly: size.price_monthly,
						currency: 'USD'
					},
					specs: {
						cpu: {
							cores: size.vcpus,
							type: 'vCPU'
						},
						ram: {
							amount: size.memory >= 1024 ? size.memory / 1024 : size.memory,
							unit: size.memory >= 1024 ? 'GB' : 'MB'
						},
						storage: {
							amount: size.disk,
							unit: 'GB',
							type: 'SSD'
						},
						bandwidth: {
							amount: size.transfer,
							unit: 'TB',
							unlimited: false
						}
					},
					features: [
						'SSD Storage',
						'IPv6',
						'Monitoring',
						'Firewalls',
						'Private Networking',
						'Load Balancers',
						'Snapshots',
						'Backups'
					],
					locations: availableRegions.slice(0, 10),
					uptime: {
						percentage: 99.99,
						sla: false
					},
					support: '24/7 Community & Ticket Support',
					website: 'https://digitalocean.com',
					featured: ['s-1vcpu-1gb', 's-2vcpu-2gb'].includes(size.slug),
					tags: (() => {
						const tags = ['cloud', 'scalable', 'developer-friendly', 'popular'];
						if (size.price_monthly <= 10) tags.push('budget');
						if (size.vcpus >= 4) tags.push('high-performance');
						if (size.memory >= 8192) tags.push('high-memory');
						return tags;
					})()
				};
			});
	} catch (error) {
		console.error('Failed to fetch DigitalOcean plans:', error);
		return [];
	}
}

// Helper function to fetch Hetzner plans
async function fetchHetznerPlans() {
	const apiKey = process.env.HETZNER_API_KEY;
	if (!apiKey) {
		console.warn('HETZNER_API_KEY not set, skipping Hetzner plans');
		return [];
	}

	try {
		const headers = {
			'Authorization': `Bearer ${apiKey}`,
			'Content-Type': 'application/json'
		};

		// Fetch server types and locations
		const [serverTypesResponse, locationsResponse] = await Promise.all([
			fetch('https://api.hetzner.cloud/v1/server_types', { headers }),
			fetch('https://api.hetzner.cloud/v1/locations', { headers })
		]);

		if (!serverTypesResponse.ok || !locationsResponse.ok) {
			throw new Error('Failed to fetch Hetzner data');
		}

		const [serverTypesData, locationsData] = await Promise.all([
			serverTypesResponse.json(),
			locationsResponse.json()
		]);

		const serverTypes = serverTypesData.server_types || [];
		const locations = locationsData.locations || [];

		return serverTypes
			.filter((serverType: any) => !serverType.deprecated)
			.filter((serverType: any) => serverType.architecture === 'x86' || process.env.HETZNER_INCLUDE_ARM === 'true')
			.map((serverType: any) => {
				const cheapestPrice = serverType.prices.reduce((min: any, current: any) => {
					const currentPrice = parseFloat(current.price_monthly.gross);
					const minPrice = parseFloat(min.price_monthly.gross);
					return currentPrice < minPrice ? current : min;
				});

				const monthlyPrice = parseFloat(cheapestPrice.price_monthly.gross);

				return {
					id: `hetzner-${serverType.name.toLowerCase()}`,
					provider: 'Hetzner',
					name: serverType.name,
					description: serverType.description,
					price: {
						monthly: monthlyPrice,
						currency: 'EUR'
					},
					specs: {
						cpu: {
							cores: serverType.cores,
							type: serverType.cpu_type === 'shared' ? 'vCPU' : 'CPU'
						},
						ram: {
							amount: serverType.memory,
							unit: 'GB'
						},
						storage: {
							amount: serverType.disk,
							unit: 'GB',
							type: serverType.storage_type === 'local' ? 'SSD' : 'NVMe'
						},
						bandwidth: {
							amount: 20,
							unit: 'TB',
							unlimited: false
						}
					},
					features: [
						'SSD Storage',
						'IPv6',
						'Private Networking',
						'Snapshots',
						'Backups',
						'Load Balancers',
						'Floating IPs',
						'DDoS Protection'
					],
					locations: locations.map((loc: any) => `${loc.city}, ${loc.country}`),
					uptime: {
						percentage: 99.9,
						sla: false
					},
					support: 'Business Hours Support',
					website: 'https://hetzner.com',
					featured: ['cx11', 'cx21', 'cx31'].includes(serverType.name.toLowerCase()),
					tags: (() => {
						const tags = ['europe', 'budget', 'high-bandwidth'];
						if (monthlyPrice <= 5) tags.push('ultra-budget');
						if (serverType.cores >= 4) tags.push('high-performance');
						if (serverType.memory >= 16) tags.push('high-memory');
						if (serverType.architecture === 'arm64') tags.push('arm', 'energy-efficient');
						return tags;
					})()
				};
			});
	} catch (error) {
		console.error('Failed to fetch Hetzner plans:', error);
		return [];
	}
}

// Define collections with inline loaders
const vpsPlans = defineCollection({
	loader: async () => {
		console.log('🚀 Fetching VPS plans from providers...');
		
		// Fetch from all providers in parallel
		const [digitalOceanPlans, hetznerPlans] = await Promise.all([
			fetchDigitalOceanPlans(),
			fetchHetznerPlans()
		]);

		// Combine all plans
		const allPlans = [
			...digitalOceanPlans,
			...hetznerPlans
		];

		console.log(`✅ Fetched ${allPlans.length} VPS plans total`);
		console.log(`   - DigitalOcean: ${digitalOceanPlans.length} plans`);
		console.log(`   - Hetzner: ${hetznerPlans.length} plans`);

		return allPlans;
	},
	schema: vpsSchema
});

// Export collections
export const collections = {
	vpsPlans
};