import { defineConfig } from 'vitest/config';

/**
 * M2 live interop config: runs ONLY `scripts/m2-live-interop.test.ts`
 * (interactive live web ⇄ mobile probe against the production worker).
 * Never part of the default unit suite. Phase via M2_PHASE=setup|observe.
 */
export default defineConfig({
  test: {
    include: ['scripts/m2-live-interop.test.ts'],
    environment: 'node',
    testTimeout: 240000,
  },
});
