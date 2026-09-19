/**
 * QA shim — expo-crypto for the crypto interop suite ONLY.
 *
 * `digestStringAsync(SHA256, data)` must return the lowercase hex digest
 * (byte-identical with Expo's native digest). Node's createHash('sha256')
 * produces exactly that. Not used by the app or the default unit suite.
 */

import { createHash } from 'node:crypto';

export const CryptoDigestAlgorithm = Object.freeze({ SHA256: 'SHA-256' });

export async function digestStringAsync(algorithm, data) {
  if (algorithm !== CryptoDigestAlgorithm.SHA256) {
    throw new Error(`digestStringAsync: unsupported algorithm ${String(algorithm)}`);
  }
  return createHash('sha256').update(String(data), 'utf8').digest('hex');
}

export const randomUUID = globalThis.crypto?.randomUUID
  ? () => globalThis.crypto.randomUUID()
  : () => {
      const bytes = new Uint8Array(16);
      globalThis.crypto.getRandomValues(bytes);
      return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    };