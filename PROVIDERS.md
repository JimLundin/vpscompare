# VPS Providers

This document tracks all VPS providers supported by this comparison site, their integration status, and notes on implementation.

## Currently Supported Providers (6)

### 1. DigitalOcean ✅
- **API**: DigitalOcean API v2
- **Authentication**: Bearer Token (API Key)
- **Pricing Currency**: USD
- **Features**:
  - Cloud Compute (Droplets)
  - Global datacenter coverage
  - SSD storage
  - 99.99% uptime SLA
- **API Endpoints**:
  - `/v2/sizes` - Instance sizes
  - `/v2/regions` - Available regions
- **Implementation**: `src/loaders/digitalocean.ts`

### 2. Hetzner Cloud ✅
- **API**: Hetzner Cloud API v1
- **Authentication**: Bearer Token (API Key)
- **Pricing Currency**: EUR
- **Features**:
  - European datacenters
  - x86 and ARM architectures
  - Local SSD and NVMe storage
  - Competitive pricing
- **API Endpoints**:
  - `/v1/server_types` - Server types
  - `/v1/locations` - Locations
- **Implementation**: `src/loaders/hetzner.ts`

### 3. Linode (Akamai) ✅
- **API**: Linode API v4
- **Authentication**: None required for public endpoints
- **Pricing Currency**: USD
- **Features**:
  - Global datacenter coverage
  - Multiple plan classes (Nanode, Standard, Dedicated, High Memory, Premium)
  - SSD storage
  - 99.9% uptime SLA
- **API Endpoints**:
  - `/v4/linode/types` - Instance types (public)
  - `/v4/regions` - Regions (public)
- **Implementation**: `src/loaders/linode.ts`

### 4. Vultr ✅
- **API**: Vultr API v2
- **Authentication**: Bearer Token (API Key)
- **Pricing Currency**: USD
- **Features**:
  - Global datacenter coverage (16+ locations)
  - Multiple plan types (VC2, VHF, VHP, VDC)
  - SSD and NVMe storage
  - 99.99% uptime SLA
  - DDoS protection included
- **API Endpoints**:
  - `/v2/plans` - Available plans
  - `/v2/regions` - Regions
- **Implementation**: `src/loaders/vultr.ts`

### 5. UpCloud ✅
- **API**: UpCloud API v1.3
- **Authentication**: Basic Auth (Username + Password)
- **Pricing Currency**: USD
- **Features**:
  - European datacenter focus
  - MaxIOPS NVMe storage on all plans
  - 100% uptime SLA
  - Hourly billing
  - High-performance infrastructure
- **API Endpoints**:
  - `/1.3/plan` - Available plans
  - `/1.3/price` - Pricing information
  - `/1.3/zone` - Zones
- **Implementation**: `src/loaders/upcloud.ts`

### 6. Scaleway ✅
- **API**: Scaleway Instance API v1
- **Authentication**: X-Auth-Token header (Secret Key)
- **Pricing Currency**: EUR
- **Features**:
  - European cloud provider (Paris, Amsterdam, Warsaw)
  - Local SSD and NVMe storage
  - Unmetered bandwidth
  - 99.9% uptime SLA
  - Private networks and security groups
- **API Endpoints**:
  - `/instance/v1/zones/{zone}/products/servers` - Server types
- **Implementation**: `src/loaders/scaleway.ts`

## Providers Under Investigation

### High Priority (Management APIs Available)

These providers have APIs but they're primarily for managing existing instances rather than browsing available plans:

#### Hostinger
- **API**: Hostinger VPS Management API
- **Status**: Management API only (no public pricing endpoint found)
- **Documentation**: https://developers.hostinger.com/
- **Note**: API focuses on VPS management, billing, domains, and DNS. No public endpoint for browsing available VPS plans and pricing.

#### IONOS
- **API**: IONOS Cloud API v6
- **Status**: Enterprise IaaS API (requires investigation for pricing endpoints)
- **Documentation**: https://api.ionos.com/docs/cloud/v6/
- **Note**: Comprehensive API for VM management. Pricing endpoint availability needs verification.

#### RackNerd
- **API**: SolusVM API
- **Status**: Control panel API only
- **Documentation**: https://documentation.solusvm.com/
- **Note**: Uses SolusVM for VPS management. API is for existing instance control, not plan browsing.

#### BuyVM
- **API**: Stallion API v1 (SolusVM-compatible)
- **Status**: Client API for existing VPS management
- **Documentation**: https://wiki.buyvm.net/doku.php/clientapi
- **Note**: End-user API for VPS control. No public pricing/plan listing endpoint.

### Major Cloud Providers (Complex Authentication)

These providers require more complex authentication mechanisms:

#### AWS Lightsail
- **Status**: AWS SDK required (Access Key + Secret Key)
- **API**: AWS Lightsail API
- **Complexity**: Requires AWS SDK, IAM credentials, and region-specific endpoints
- **Note**: `GetBundles` API exists but requires full AWS authentication

#### Microsoft Azure Virtual Machines
- **Status**: Azure SDK required (Service Principal or OAuth)
- **API**: Azure Compute REST API
- **Complexity**: Requires Azure AD authentication, subscription management
- **Note**: Pricing API exists but requires Azure authentication

#### Google Cloud Compute Engine
- **Status**: Google Cloud SDK required (Service Account or OAuth)
- **API**: Google Cloud Compute API
- **Complexity**: Requires Google Cloud authentication and project setup
- **Note**: Pricing can be queried via Cloud Billing API

#### Oracle Cloud Infrastructure
- **Status**: Complex authentication (API Key + Request Signing)
- **API**: OCI Compute API
- **Complexity**: Requires request signing with private key
- **Pricing API**: https://apexapps.oracle.com/pls/apex/cetools/api/v1/products/
- **Note**: Free tier available, public pricing API exists

### Budget/Low-End Providers

#### Contabo
- **Status**: OAuth2 authentication required
- **API**: Contabo API v1
- **Documentation**: https://api.contabo.com/
- **Complexity**: Requires OAuth2 client credentials
- **Note**: Requires client ID, client secret, username, and password

#### OVHcloud
- **Status**: Complex authentication (Application Key + Consumer Key)
- **API**: OVHcloud API
- **Documentation**: https://api.us.ovhcloud.com/
- **Complexity**: Requires application registration and consumer key generation
- **Note**: Supports VPS, but authentication is multi-step

## Implementation Patterns

### Pattern 1: Simple API Key (Easiest)
**Examples**: DigitalOcean, Hetzner, Vultr, Scaleway

```typescript
headers: {
  'Authorization': `Bearer ${API_KEY}`
}
```

### Pattern 2: Basic Authentication
**Examples**: UpCloud

```typescript
headers: {
  'Authorization': `Basic ${base64(username:password)}`
}
```

### Pattern 3: Public Endpoints (No Auth)
**Examples**: Linode

```typescript
// No authentication required
fetch('https://api.linode.com/v4/linode/types')
```

### Pattern 4: OAuth2 (Complex)
**Examples**: Contabo, Google Cloud, Azure

Requires:
1. Application registration
2. Token endpoint
3. Access token refresh logic

### Pattern 5: AWS Signature V4 (Most Complex)
**Examples**: AWS Lightsail

Requires:
1. Access Key + Secret Key
2. Request signing with HMAC-SHA256
3. Timestamp and credential scope
4. AWS SDK typically required

## Adding New Providers - Checklist

When adding a new VPS provider, follow these steps:

- [ ] Research API documentation
- [ ] Verify public pricing/plan endpoint exists
- [ ] Check authentication requirements
- [ ] Determine pricing currency
- [ ] Create provider loader file (`src/loaders/{provider}.ts`)
- [ ] Implement data transformation to match VPS schema
- [ ] Add provider to `src/loaders/index.ts`
- [ ] Update `src/content.config.ts` collection loader
- [ ] Create unit tests (`src/loaders/{provider}.test.ts`)
- [ ] Create E2E tests (`src/loaders/{provider}.e2e.test.ts`)
- [ ] Add API credentials to `.env.example`
- [ ] Update this PROVIDERS.md file
- [ ] Test build with `npm run build`
- [ ] Run tests with `npm run test:run`

## API Key Security

All API keys should be:
- Stored in `.env` file (not committed to repository)
- Have read-only permissions
- Be rotated regularly
- Be revoked if compromised

## Contributing

To suggest a new provider:
1. Verify they have a public API with pricing/plan endpoints
2. Test the API endpoints (use tools like Postman)
3. Document the API structure and authentication method
4. Open an issue or pull request with your findings

## Resources

- [VPSBenchmarks](https://www.vpsbenchmarks.com/) - VPS performance comparisons
- [LowEndTalk](https://lowendtalk.com/) - VPS provider discussions
- [WebHostingTalk](https://www.webhostingtalk.com/) - Web hosting community

---

**Last Updated**: 2025-01-07
**Total Providers**: 6 active, 10+ under investigation
