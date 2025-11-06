# End-to-End Testing Guide

This document describes how to run and maintain the end-to-end (E2E) tests for the VPS Compare application. E2E tests verify that our implementation correctly interacts with the actual provider APIs to fetch and transform data.

## Overview

The E2E test suite validates:
- Real API integration with DigitalOcean, Hetzner, and Linode
- Data fetching and transformation logic
- API error handling and graceful degradation
- Response schema validation
- Performance benchmarks

## Test Structure

E2E tests are located alongside their corresponding loaders:

```
src/loaders/
├── digitalocean.ts          # DigitalOcean API loader
├── digitalocean.test.ts     # Unit tests (mocked)
├── digitalocean.e2e.test.ts # E2E tests (real API)
├── hetzner.ts               # Hetzner API loader
├── hetzner.test.ts          # Unit tests (mocked)
├── hetzner.e2e.test.ts      # E2E tests (real API)
├── linode.ts                # Linode API loader
├── linode.test.ts           # Unit tests (mocked)
└── linode.e2e.test.ts       # E2E tests (real API)
```

## Prerequisites

### API Keys Required

To run E2E tests, you need valid API keys for:

1. **DigitalOcean** (required)
   - Sign up at: https://www.digitalocean.com/
   - Generate API token: https://cloud.digitalocean.com/account/api/tokens
   - Set environment variable: `DIGITALOCEAN_API_KEY`

2. **Hetzner** (required)
   - Sign up at: https://www.hetzner.com/
   - Generate API token: https://console.hetzner.cloud/projects
   - Set environment variable: `HETZNER_API_KEY`

3. **Linode** (no API key required)
   - Uses public endpoints
   - No authentication needed

### Environment Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your API keys:
   ```bash
   DIGITALOCEAN_API_KEY=your_actual_digitalocean_key
   HETZNER_API_KEY=your_actual_hetzner_key
   HETZNER_INCLUDE_ARM=false
   ```

3. **Important**: Never commit `.env` to version control (it's in `.gitignore`)

## Running E2E Tests

### Run All E2E Tests (Once)

```bash
npm run test:e2e:run
```

This executes all E2E tests against real provider APIs.

### Run E2E Tests (Watch Mode)

```bash
npm run test:e2e
```

Useful during development - automatically reruns tests when files change.

### Run E2E Tests with Coverage

```bash
npm run test:e2e:coverage
```

Generates code coverage reports for the loader files.

### Run Specific Provider Tests

```bash
# Run only DigitalOcean E2E tests
npm run test:e2e:run -- digitalocean.e2e.test.ts

# Run only Hetzner E2E tests
npm run test:e2e:run -- hetzner.e2e.test.ts

# Run only Linode E2E tests
npm run test:e2e:run -- linode.e2e.test.ts
```

## Test Behavior

### With Valid API Keys

When API keys are provided:
- Tests will make real HTTP requests to provider APIs
- Validates actual response data structure
- Checks data transformation logic
- Verifies error handling
- Measures performance

Expected output:
```
✓ Fetched 15 plans from DigitalOcean API
✓ Plan structure validated: Basic
✓ All plans have at least 512MB RAM
✓ Pricing data is consistent across all plans
```

### Without API Keys

When API keys are missing:
- Tests will skip gracefully
- Warning message displayed
- Tests marked as skipped (not failed)

Expected output:
```
⚠️  DIGITALOCEAN_API_KEY not set. E2E tests will be skipped.
   To run these tests, set the DIGITALOCEAN_API_KEY environment variable.
```

### API Error Handling Tests

Some tests intentionally use invalid API keys to verify error handling:
```
✓ API errors handled gracefully
✓ Missing API key handled gracefully
```

## What Each Test Suite Validates

### DigitalOcean E2E Tests
- ✅ Fetches real data from DigitalOcean API
- ✅ Validates plan structure (id, provider, name, price, specs, features, locations)
- ✅ Filters plans with < 512MB RAM
- ✅ Verifies pricing consistency (USD currency, yearly < monthly)
- ✅ Validates location data (max 10 locations)
- ✅ Checks tag assignment logic
- ✅ Tests error handling (invalid key, missing key)
- ✅ Verifies data transformation from API format
- ✅ Measures API performance (< 20 seconds)

### Hetzner E2E Tests
- ✅ Fetches real data from Hetzner API
- ✅ Validates plan structure
- ✅ Filters deprecated server types
- ✅ Tests ARM architecture filtering (with/without `HETZNER_INCLUDE_ARM`)
- ✅ Detects CPU type (Shared/Dedicated vCPU)
- ✅ Detects storage type (Local SSD/NVMe)
- ✅ Verifies pricing consistency (EUR currency)
- ✅ Validates location format (City, Country)
- ✅ Checks featured plans
- ✅ Tests error handling (invalid key, missing key)
- ✅ Verifies price selection from multiple options
- ✅ Measures API performance (< 20 seconds)
- ✅ Groups plans by size (small/medium/large)

### Linode E2E Tests
- ✅ Fetches real data from Linode API (no auth required)
- ✅ Validates plan structure
- ✅ Filters GPU and accelerated plan classes
- ✅ Verifies plan class name mapping
- ✅ Tests unit conversions (MB/GB/TB for RAM, storage, bandwidth)
- ✅ Verifies pricing consistency (USD currency)
- ✅ Validates location data (max 10 locations)
- ✅ Detects CPU type (Shared/Dedicated)
- ✅ Checks class-specific features
- ✅ Validates tags
- ✅ Checks featured plans
- ✅ Measures API performance (< 20 seconds)
- ✅ Groups plans by size and class
- ✅ Validates global regional availability

## Performance Expectations

All E2E tests are configured with:
- **Test timeout**: 30 seconds
- **Hook timeout**: 30 seconds
- **Expected completion**: < 20 seconds per provider

If tests take longer, it may indicate:
- Network connectivity issues
- Provider API slowness
- Rate limiting

## Continuous Integration

### Running E2E Tests in CI

E2E tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run E2E Tests
  env:
    DIGITALOCEAN_API_KEY: ${{ secrets.DIGITALOCEAN_API_KEY }}
    HETZNER_API_KEY: ${{ secrets.HETZNER_API_KEY }}
  run: npm run test:e2e:run
```

**Important**: Store API keys as secrets in your CI environment, never in code.

### Rate Limiting Considerations

When running E2E tests frequently:
- DigitalOcean: 5,000 requests/hour per token
- Hetzner: Generally lenient, no official limit published
- Linode: No authentication required, reasonable use expected

For scheduled CI runs, consider:
- Running E2E tests less frequently than unit tests
- Using separate API keys for CI vs. development
- Implementing exponential backoff on rate limit errors

## Troubleshooting

### Tests Fail with "No plans returned from API"

**Cause**: Invalid API key or API endpoint changed

**Solution**:
1. Verify your API key is correct
2. Check API key permissions (should have read access)
3. Verify provider API is accessible from your network
4. Check if provider API documentation has changed

### Tests Timeout

**Cause**: Slow network or provider API issues

**Solution**:
1. Check your internet connection
2. Try increasing timeout in `vitest.config.e2e.ts`:
   ```typescript
   testTimeout: 60000, // Increase to 60 seconds
   ```
3. Check provider status pages for outages

### "ECONNREFUSED" or Network Errors

**Cause**: Network connectivity or firewall issues

**Solution**:
1. Verify you can access provider APIs directly:
   ```bash
   curl -H "Authorization: Bearer YOUR_KEY" https://api.digitalocean.com/v2/sizes
   ```
2. Check firewall/proxy settings
3. Verify DNS resolution works

### Tests Pass Locally but Fail in CI

**Cause**: Missing environment variables in CI

**Solution**:
1. Verify secrets are configured in CI environment
2. Check secret names match exactly (case-sensitive)
3. Ensure secrets are available to the workflow/job

## Best Practices

### 1. Keep Unit Tests Fast, E2E Tests Comprehensive

- **Unit tests** (`.test.ts`): Use mocked data, run on every commit
- **E2E tests** (`.e2e.test.ts`): Use real APIs, run less frequently

### 2. Separate Test Commands

```bash
# Fast feedback during development
npm run test:run         # Unit tests only

# Before pushing changes
npm run test:e2e:run     # E2E tests with real APIs
```

### 3. Monitor Test Flakiness

E2E tests may occasionally fail due to:
- Provider API changes
- Network issues
- Rate limiting

Implement retry logic or alerting for CI environments.

### 4. Keep Tests Independent

Each test should:
- Set up its own prerequisites
- Clean up after itself
- Not depend on execution order
- Not share state with other tests

### 5. Update Tests When APIs Change

When providers update their APIs:
1. E2E tests will fail first (good!)
2. Update loader implementation
3. Update both unit tests and E2E tests
4. Verify all tests pass

## Relationship with Unit Tests

This project has both unit tests and E2E tests:

| Aspect | Unit Tests | E2E Tests |
|--------|-----------|-----------|
| **Location** | `*.test.ts` | `*.e2e.test.ts` |
| **API Calls** | Mocked with `vi.fn()` | Real HTTP requests |
| **Speed** | Fast (milliseconds) | Slower (seconds) |
| **Dependencies** | None | Requires API keys |
| **Run Frequency** | Every commit | Before releases |
| **Config File** | `vitest.config.ts` | `vitest.config.e2e.ts` |
| **Purpose** | Validate logic | Validate integration |

Both are important:
- **Unit tests** catch logic errors quickly
- **E2E tests** catch API compatibility issues

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [DigitalOcean API Docs](https://docs.digitalocean.com/reference/api/)
- [Hetzner Cloud API Docs](https://docs.hetzner.cloud/)
- [Linode API Docs](https://www.linode.com/docs/api/)

## Contributing

When adding new providers or modifying existing ones:

1. Update the loader implementation (`src/loaders/provider.ts`)
2. Update unit tests (`src/loaders/provider.test.ts`)
3. Update E2E tests (`src/loaders/provider.e2e.test.ts`)
4. Run both test suites to verify
5. Update this documentation if needed

---

**Last Updated**: 2025-11-06
**Maintained By**: VPS Compare Team
