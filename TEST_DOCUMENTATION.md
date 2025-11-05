# Test Documentation

This document describes the testing setup and coverage for the VPS pricing comparison site.

## Testing Framework

We use **Vitest** as our testing framework, which provides:
- Fast unit testing with hot module reloading
- TypeScript support out of the box
- Jest-compatible API
- Built-in code coverage reporting
- Happy-DOM for DOM emulation

## Running Tests

```bash
# Run tests in watch mode (auto-reruns on file changes)
npm test

# Run tests once and exit
npm run test:run

# Run tests with UI interface
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

Tests are organized alongside their source files:
```
src/
├── loaders/
│   ├── digitalocean.ts
│   ├── digitalocean.test.ts    # DigitalOcean loader tests
│   ├── hetzner.ts
│   ├── hetzner.test.ts         # Hetzner loader tests
│   ├── linode.ts
│   └── linode.test.ts          # Linode loader tests
```

## Test Coverage

### DigitalOcean Loader (`digitalocean.test.ts`)

**Total Tests: 13**

#### Coverage Areas:
1. **API Key Validation**
   - Returns empty array when API key is not set
   - Logs appropriate warning message

2. **Data Fetching**
   - Successfully fetches and transforms plans with valid API key
   - Filters out unavailable sizes
   - Filters out sizes with memory less than 512MB
   - Correctly handles parallel API requests (sizes + regions)

3. **Data Transformation**
   - Converts memory from MB to GB when >= 1024MB
   - Keeps memory in MB when < 1024MB
   - Includes all required features (SSD Storage, IPv6, Monitoring, etc.)
   - Correctly assigns tags based on specifications (budget, high-performance, high-memory)
   - Marks featured plans correctly (s-1vcpu-1gb, s-2vcpu-2gb)

4. **Region Mapping**
   - Only includes available regions
   - Limits regions to 10 maximum
   - Maps region slugs to human-readable names

5. **Pricing Validation**
   - Correctly extracts pricing information
   - Uses USD currency

6. **Error Handling**
   - Returns empty array when API request fails
   - Returns empty array when network error occurs
   - Logs errors appropriately

---

### Hetzner Loader (`hetzner.test.ts`)

**Total Tests: 19**

#### Coverage Areas:
1. **API Key Validation**
   - Returns empty array when API key is not set
   - Logs appropriate warning message

2. **Data Fetching**
   - Successfully fetches and transforms plans with valid API key
   - Filters out deprecated server types
   - Filters out ARM servers by default
   - Includes ARM servers when `HETZNER_INCLUDE_ARM=true`

3. **Pricing Calculation**
   - Selects the cheapest price from multiple pricing tiers
   - Parses string prices to numbers correctly
   - Uses EUR currency

4. **CPU Type Detection**
   - Sets CPU type to "vCPU" for shared CPUs
   - Sets CPU type to "CPU" for dedicated CPUs

5. **Storage Type Detection**
   - Sets storage type to "SSD" for local storage
   - Sets storage type to "NVMe" for non-local storage

6. **Tags and Features**
   - Includes ARM tags for ARM64 architecture
   - Adds ultra-budget tag for plans <= €5/month
   - Adds high-performance tag for 4+ cores
   - Adds high-memory tag for 16GB+ RAM
   - Includes all required features (SSD Storage, IPv6, DDoS Protection, etc.)

7. **Location Formatting**
   - Formats locations as "City, Country"
   - Maps all available locations

8. **Featured Plans**
   - Marks cx11, cx21, and cx31 as featured (case-insensitive)

9. **Error Handling**
   - Returns empty array when API request fails
   - Returns empty array when network error occurs
   - Logs errors appropriately

---

### Linode Loader (`linode.test.ts`)

**Total Tests: 24**

#### Coverage Areas:
1. **Data Fetching**
   - Successfully fetches and transforms plans (no API key required)
   - Filters out GPU plans
   - Filters out accelerated plans

2. **Plan Class Mapping**
   - Correctly maps class names:
     - `nanode` → "Nanode"
     - `standard` → "Standard"
     - `dedicated` → "Dedicated CPU"
     - `highmem` → "High Memory"
     - `premium` → "Premium"

3. **CPU Type Detection**
   - Sets CPU type to "CPU" for dedicated plans
   - Sets CPU type to "vCPU" for all other plans

4. **Unit Conversions**
   - Converts memory from MB to GB when >= 1024MB
   - Keeps memory in MB when < 1024MB
   - Converts disk from MB to GB when >= 1024MB
   - Converts transfer from GB to TB when >= 1024GB

5. **Features by Plan Class**
   - Nanode: Includes "Shared CPU"
   - Standard: Includes "Shared CPU" and "Burstable Performance"
   - Dedicated: Includes "Dedicated CPU" and "Sustained Performance"
   - High Memory: Includes "High Memory" and "Optimized for Memory-Intensive Applications"
   - Premium: Includes "Premium Hardware", "Enhanced Performance", "Advanced Networking"

6. **Tags**
   - Adds "budget" tag for plans <= $10/month
   - Adds "high-performance" and "dedicated" tags for dedicated plans
   - Adds "high-memory" tag for high memory plans
   - Adds "premium" and "enhanced" tags for premium plans
   - Adds "entry-level" tag for nanode plans

7. **Region Handling**
   - Only includes regions with "ok" status
   - Limits regions to 10 maximum

8. **Featured Plans**
   - Marks g6-nanode-1, g6-standard-1, and g6-standard-2 as featured

9. **Uptime and Support**
   - Sets 99.9% uptime with SLA enabled
   - Sets "24/7 Support"

10. **Error Handling**
    - Returns empty array when API request fails
    - Returns empty array when network error occurs
    - Logs errors appropriately

---

## Test Patterns

### Mocking Fetch API

All tests mock the `fetch` API to avoid making real network requests:

```typescript
global.fetch = vi.fn()
  .mockResolvedValueOnce({
    ok: true,
    json: async () => mockResponse
  } as Response);
```

### Environment Variables

Tests manipulate environment variables to test different configurations:

```typescript
beforeEach(() => {
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
});
```

### Console Spy

Tests verify that warnings and errors are logged appropriately:

```typescript
const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
expect(consoleWarnSpy).toHaveBeenCalledWith('Expected warning message');
```

---

## What the Tests Verify

### Data Integrity
- ✅ Correct data fetching from provider APIs
- ✅ Proper data transformation to match schema
- ✅ Accurate filtering of unavailable/deprecated plans
- ✅ Correct unit conversions (MB→GB, GB→TB)

### Pricing Accuracy
- ✅ Correct price extraction from API responses
- ✅ Proper currency assignment (USD, EUR)
- ✅ Cheapest price selection for multi-tier pricing

### Feature Completeness
- ✅ All required features are included
- ✅ Plan-specific features are correctly assigned
- ✅ Tags are dynamically generated based on specs

### Configuration Handling
- ✅ API key validation
- ✅ Environment variable support (HETZNER_INCLUDE_ARM)
- ✅ Graceful degradation when API keys are missing

### Error Resilience
- ✅ Network failure handling
- ✅ API error handling (4xx, 5xx responses)
- ✅ Empty array returns on failures
- ✅ Appropriate error logging

### Region Management
- ✅ Only available regions are included
- ✅ Region limits are enforced (max 10)
- ✅ Region names are human-readable

---

## Continuous Integration

Tests should be run:
1. Before every commit
2. In CI/CD pipeline (GitHub Actions recommended)
3. Before deploying to production

### Recommended GitHub Actions Workflow

```yaml
name: Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:run
```

---

## Extending Tests

When adding new providers or features:

1. **Create a test file** following the pattern: `<loader-name>.test.ts`
2. **Cover these areas**:
   - API key validation (if required)
   - Data fetching and transformation
   - Filtering logic
   - Unit conversions
   - Feature mapping
   - Tag generation
   - Error handling
3. **Mock all API calls** to avoid network dependencies
4. **Verify data integrity** against the Zod schema (implicitly)
5. **Run tests** with `npm test` to ensure coverage

---

## Troubleshooting

### Tests Fail on CI but Pass Locally
- Ensure all API calls are mocked
- Check for environment-specific code
- Verify Node.js version compatibility

### Flaky Tests
- Avoid real network calls
- Mock timers if using `setTimeout`/`setInterval`
- Use deterministic test data

### Coverage Not 100%
- Not all code paths may need testing (error boundaries, etc.)
- Focus on critical business logic
- Aim for >80% coverage on loader functions

---

## Test Statistics

| Loader | Tests | Coverage |
|--------|-------|----------|
| DigitalOcean | 13 | ✅ Comprehensive |
| Hetzner | 19 | ✅ Comprehensive |
| Linode | 24 | ✅ Comprehensive |
| **Total** | **56** | ✅ **High Coverage** |

---

## Next Steps

- [ ] Add integration tests for `content.config.ts`
- [ ] Add component tests for Astro components
- [ ] Add E2E tests for filtering functionality
- [ ] Set up GitHub Actions CI workflow
- [ ] Add code coverage reporting with Codecov
