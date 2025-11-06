# Testing

## Running Tests

```bash
npm test              # Watch mode
npm run test:run      # Single run (CI)
npm run test:ui       # Interactive UI
```

## Coverage

- **56 tests** across 3 provider loaders
- DigitalOcean (13 tests): API validation, filtering, transformations
- Hetzner (19 tests): Pricing, ARM support, type detection
- Linode (24 tests): Plan mapping, unit conversions, features

## Writing Tests

Tests are colocated with source files:
- `src/loaders/digitalocean.test.ts`
- `src/loaders/hetzner.test.ts`
- `src/loaders/linode.test.ts`

All tests mock fetch API calls to avoid network dependencies.
