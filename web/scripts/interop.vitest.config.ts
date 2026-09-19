import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

/**
 * QA-only config: runs the web ⇄ mobile encryption interop suite
 * (scripts/interop-mobile.test.ts) with the expo native modules shimmed.
 * Never part of the default unit suite.
 *
 * Shims live in-repo under `scripts/shims/` so the suite is reproducible
 * on a clean clone (they used to sit in a throwaway tmp dir — that broke CI).
 */
const configDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  test: {
    include: ['scripts/interop-mobile.test.ts'],
    environment: 'node',
    testTimeout: 30000,
    server: {
      deps: {
        inline: [/src\/services\/EncryptionService\.js/],
      },
    },
    alias: [
      { find: 'expo-crypto', replacement: `${configDir}shims/expo-crypto.mjs` },
      {
        find: '@react-native-async-storage/async-storage',
        replacement: `${configDir}shims/async-storage.mjs`,
      },
      {
        find: 'react-native-get-random-values',
        replacement: `${configDir}shims/react-native-get-random-values.mjs`,
      },
    ],
  },
});
