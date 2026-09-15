import { defineConfig } from 'vitest/config';

/**
 * QA-only config: BUG-01 auth-stability probe (scripts/bug01-probe.test.ts).
 * Fires repeated register/login pairs at the live worker looking for
 * 503/1102 crashes. Sets BUG01_STRESS=1 to run 3 spaced rounds.
 * Never part of the default unit suite.
 */
export default defineConfig({
  test: {
    include: ['scripts/bug01-probe.test.ts'],
    environment: 'node',
    testTimeout: 30 * 60 * 1000,
    hookTimeout: 60 * 1000,
    disableConsoleIntercept: true,
  },
});