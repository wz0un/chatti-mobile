import { defineConfig } from 'vitest/config';

/**
 * Smoke-test config: runs ONLY `scripts/smoke.test.ts` (live API validation
 * against the production worker with a throwaway account).
 * Invoked via `npm run smoke`. Never part of the default unit suite.
 *
 * NOTE: the include must stay pinned to `smoke.test.ts` — scripts/ also
 * holds interop + reconnect QA suites that need their own config/aliases.
 */
export default defineConfig({
  test: {
    include: ['scripts/smoke.test.ts'],
    environment: 'node',
    testTimeout: 30000,
  },
});
