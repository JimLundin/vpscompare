export interface VPSPlan {
	id: string;
	provider: string;
	name: string;
	price: {
		monthly: number;
		yearly?: number;
		currency: string;
	};
	specs: {
		cpu: string;
		ram: string;
		storage: string;
		bandwidth: string;
	};
	features: string[];
	locations: string[];
	uptime: string;
	support: string;
	website: string;
}

export interface VPSProvider {
	name: string;
	logo?: string;
	website: string;
	plans: VPSPlan[];
}