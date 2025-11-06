import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'e2e',
    include: ['src/**/*.e2e.{test,spec}.{js,ts}'],
    environment: 'node',
    testTimeout: 30000, // 30 seconds for real API calls
    hookTimeout: 30000,
    teardownTimeout: 10000,
    reporters: ['verbose'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/loaders/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.e2e.test.ts', '**/*.spec.ts']
    }
  }
});
