import { defineConfig } from 'vitest/config';

/**
 * QA-only config: runs the web ⇄ mobile encryption interop suite
 * (scripts/interop-mobile.test.ts) with the expo native modules shimmed.
 * Never part of the default unit suite.
 */
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
      { find: 'expo-crypto', replacement: '/tmp/opencode/shims/expo-crypto.mjs' },
      {
        find: '@react-native-async-storage/async-storage',
        replacement: '/tmp/opencode/shims/async-storage.mjs',
      },
      {
        find: 'react-native-get-random-values',
        replacement: '/tmp/opencode/shims/react-native-get-random-values.mjs',
      },
    ],
  },
});
