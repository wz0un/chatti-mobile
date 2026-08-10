/**
 * Live API smoke test — auth + core endpoints against the REAL Cloudflare Worker.
 *
 * NOT part of the default unit suite (run explicitly: `npm run smoke`).
 * Uses a throwaway account (unique per run) and deletes it afterwards.
 * NEVER use real credentials.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AuthService } from '../../shared/auth/AuthService';
import { ApiService } from '../../shared/api/ApiService';
import { defaultEncryptionService } from '../../shared/crypto/EncryptionService';
import { MemoryStorageAdapter } from '../../shared/storage/StorageAdapter';

const baseUrl = (
  process.env.VITE_API_URL ?? 'https://chatti-workers.wz0un.workers.dev'
).replace(/\/+$/, '');

const throwawayUsername = `webqa_${Date.now().toString(36)}`;
const password = 'webqa-pass-123';

let registeredUser: { fullUsername: string; userId: string } | null = null;

describe('live API smoke (throwaway account)', () => {
  beforeAll(() => {
    ApiService.configure(baseUrl);
  });

  it('registers a new account', async () => {
    const auth = new AuthService(new MemoryStorageAdapter(), defaultEncryptionService);
    const user = await auth.registerUser(throwawayUsername, password);
    expect(user.fullUsername).toMatch(new RegExp(`^${throwawayUsername}#\\d+$`));
    registeredUser = { fullUsername: user.fullUsername, userId: user.userId };
  }, 30000);

  it('logs in with the fullUsername and restores the session', async () => {
    expect(registeredUser).not.toBeNull();
    const storage = new MemoryStorageAdapter();
    const auth = new AuthService(storage, defaultEncryptionService);

    const user = await auth.loginUser(registeredUser!.fullUsername, password);
    expect(user.userId).toBe(registeredUser!.userId);

    // Session restore from a fresh service instance (same storage)
    const restored = await new AuthService(storage, defaultEncryptionService).getCurrentUser();
    expect(restored?.fullUsername).toBe(registeredUser!.fullUsername);

    // Logout clears the session
    await auth.logout();
    expect(await auth.getCurrentUser()).toBeNull();
  }, 30000);

  it('auth endpoints respond with expected shapes', async () => {
    expect(registeredUser).not.toBeNull();
    const userId = registeredUser!.userId;

    // Read-only smoke checks (shape assertions, no side effects)
    const conversations = await ApiService.getUserConversations(userId);
    expect(Array.isArray(conversations)).toBe(true);

    const contacts = await ApiService.getContactsList(userId);
    expect(Array.isArray(contacts)).toBe(true);

    const requests = await ApiService.getContactRequests(userId);
    expect(Array.isArray(requests)).toBe(true);

    const rooms = await ApiService.listRooms(null, 5);
    expect(rooms).toHaveProperty('rooms');

    // Public key lookup of self should succeed (user has a registered key)
    const publicKey = await ApiService.getPublicKey(userId);
    expect(publicKey).toBeTruthy();
  }, 30000);

  afterAll(async () => {
    if (!registeredUser) return;
    try {
      const storage = new MemoryStorageAdapter();
      const auth = new AuthService(storage, defaultEncryptionService);
      const user = await auth.loginUser(registeredUser.fullUsername, password);
      const ok = await ApiService.deleteAccount(user.userId, user.deviceId);
      console.log(`smoke: throwaway account deleted: ${ok}`);
    } catch (error) {
      console.warn('smoke: could not delete throwaway account:', (error as Error).message);
    }
  });
});
