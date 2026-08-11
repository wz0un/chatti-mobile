import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['scripts/reconnect-probe.test.ts'],
    environment: 'node',
    globals: true,
    testTimeout: 30000,
  },
});
