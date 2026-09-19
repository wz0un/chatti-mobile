/**
 * QA shim — react-native-get-random-values for the crypto interop suite ONLY.
 *
 * The RN package only guarantees `globalThis.crypto.getRandomValues` exists.
 * Node modern versions already provide it; if not, fall back to webcrypto.
 * Not used by the app or the default unit suite.
 */

import { webcrypto } from 'node:crypto';

if (typeof globalThis.crypto === 'undefined' || typeof globalThis.crypto.getRandomValues !== 'function') {
  globalThis.crypto = webcrypto;
}