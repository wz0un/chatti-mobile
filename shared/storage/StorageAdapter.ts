/**
 * Platform-neutral storage adapter.
 * Spec: docs/WEB-ARCHITECTURE.md §5.2 — same storage keys as mobile
 * (AsyncStorage-compatible), so a user can switch device types without
 * losing state or keys.
 */

export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/** Storage keys — identical names to mobile (`src/services/*`). */
export const STORAGE_KEYS = {
  userData: 'userData',
  deviceId: 'deviceId',
  language: 'chatti_language',
  e2eKeyPair: 'e2e_key_pair_v2',
  e2ePublicKey: 'e2e_public_key_v2',
  lastSeenPrefix: 'lastSeen_',
} as const;

/** `lastSeen_{userId}` — JSON map of `recipientId -> timestamp`. */
export const lastSeenKey = (userId: string) => `${STORAGE_KEYS.lastSeenPrefix}${userId}`;

/**
 * localStorage-backed adapter (browser). Falls back to an in-memory map
 * when localStorage is unavailable (e.g. Node test environments) so the
 * shared module stays runnable outside the browser.
 */
export class LocalStorageAdapter implements StorageAdapter {
  private memory = new Map<string, string>();

  private get store(): Storage | undefined {
    if (typeof localStorage === 'undefined') return undefined;
    try {
      localStorage.length; // access to detect disabled storage
      return localStorage;
    } catch {
      return undefined;
    }
  }

  async getItem(key: string): Promise<string | null> {
    const store = this.store;
    if (store) return store.getItem(key);
    return this.memory.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    const store = this.store;
    if (store) {
      store.setItem(key, value);
      return;
    }
    this.memory.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    const store = this.store;
    if (store) {
      store.removeItem(key);
      return;
    }
    this.memory.delete(key);
  }
}

/** In-memory adapter for tests and non-persistent contexts. */
export class MemoryStorageAdapter implements StorageAdapter {
  private map = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.map.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.map.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.map.delete(key);
  }
}
