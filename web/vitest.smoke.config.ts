import { defineConfig } from 'vitest/config';

/**
 * Smoke-test config: runs ONLY `scripts/smoke.test.ts` (live API validation
 * against the production worker with a throwaway account).
 * Invoked via `npm run smoke`. Never part of the default unit suite.
 */
export default defineConfig({
  test: {
    include: ['scripts/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30000,
  },
});
