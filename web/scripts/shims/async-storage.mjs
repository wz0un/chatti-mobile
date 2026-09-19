/**
 * QA shim — minified AsyncStorage for the crypto interop suite ONLY.
 *
 * Mirrors @react-native-async-storage/async-storage semantics with an
 * in-memory Map. Exports `storeMap` so tests can seed/clear keys directly.
 * Not used by the app or by the default unit suite.
 */

export const storeMap = new Map();

const AsyncStorage = {
  async getItem(key) {
    return storeMap.has(String(key)) ? storeMap.get(String(key)) : null;
  },
  async setItem(key, value) {
    storeMap.set(String(key), String(value));
  },
  async removeItem(key) {
    storeMap.delete(String(key));
  },
  async clear() {
    storeMap.clear();
  },
  async getAllKeys() {
    return Array.from(storeMap.keys());
  },
};

export default AsyncStorage;