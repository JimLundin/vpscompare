/**
 * Custom VPS data loader for external APIs
 * This demonstrates how to create a custom loader for fetching VPS data from external sources
 */

export interface VPSLoaderConfig {
	apiUrl: string;
	apiKey?: string;
	cacheDuration?: number; // in minutes
}

export function createVPSLoader(config: VPSLoaderConfig) {
	return async () => {
		try {
			const response = await fetch(config.apiUrl, {
				headers: {
					'Content-Type': 'application/json',
					...(config.apiKey && { 'Authorization': `Bearer ${config.apiKey}` })
				}
			});

			if (!response.ok) {
				throw new Error(`Failed to fetch VPS data: ${response.status} ${response.statusText}`);
			}

			const data = await response.json();
			
			// Transform the data to match our schema
			return data.map((item: any, index: number) => ({
				id: item.id || `vps-${index}`,
				provider: item.provider,
				name: item.name,
				price: {
					monthly: item.price?.monthly || item.monthlyPrice,
					yearly: item.price?.yearly || item.yearlyPrice,
					currency: item.price?.currency || item.currency || 'USD'
				},
				specs: {
					cpu: item.specs?.cpu || item.cpu,
					ram: item.specs?.ram || item.ram,
					storage: item.specs?.storage || item.storage,
					bandwidth: item.specs?.bandwidth || item.bandwidth
				},
				features: item.features || [],
				locations: item.locations || [],
				uptime: item.uptime || '99.9%',
				support: item.support || '24/7 Support',
				website: item.website || item.url,
				tags: item.tags || [],
				description: item.description,
				featured: item.featured || false,
				createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
				updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date()
			}));
		} catch (error) {
			console.error('VPS Loader Error:', error);
			// Return empty array or throw error based on your error handling strategy
			return [];
		}
	};
}

// Example usage in content.config.ts:
/*
import { createVPSLoader } from '../lib/loaders/vps-loader.js';

const vpsPlans = defineCollection({
	loader: createVPSLoader({
		apiUrl: 'https://api.example.com/vps-plans',
		apiKey: process.env.VPS_API_KEY,
		cacheDuration: 60 // 1 hour
	}),
	schema: vpsSchema
});
*/