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
import { EncryptionService } from '../../shared/crypto/EncryptionService';
import { defaultEncryptionService as encryptionService } from '../../shared/crypto/EncryptionService';
import { MemoryStorageAdapter } from '../../shared/storage/StorageAdapter';
import { DirectMessageSocket } from '../../shared/ws/DirectMessageSocket';
import type { DecryptedMessage } from '../../shared/types';
import type { WsFactory, WsLike } from '../../shared/ws/WsTypes';

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
    const auth = new AuthService(new MemoryStorageAdapter(), encryptionService);
    const user = await auth.registerUser(throwawayUsername, password);
    expect(user.fullUsername).toMatch(new RegExp(`^${throwawayUsername}#\\d+$`));
    registeredUser = { fullUsername: user.fullUsername, userId: user.userId };
  }, 30000);

  it('logs in with the fullUsername and restores the session', async () => {
    expect(registeredUser).not.toBeNull();
    const storage = new MemoryStorageAdapter();
    const auth = new AuthService(storage, encryptionService);

    const user = await auth.loginUser(registeredUser!.fullUsername, password);
    expect(user.userId).toBe(registeredUser!.userId);

    // Session restore from a fresh service instance (same storage)
    const restored = await new AuthService(storage, encryptionService).getCurrentUser();
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

  it('exchanges encrypted messages over the real DM websocket (web ⇄ web)', async () => {
    expect(registeredUser).not.toBeNull();

    // Two more throwaway accounts, each with its own key pair in its own storage
    const makeUser = async (name: string) => {
      const storage = new MemoryStorageAdapter();
      const encryption = new EncryptionService(storage);
      const auth = new AuthService(storage, encryption);
      const user = await auth.registerUser(name, password);
      return { user, auth, encryption, storage };
    };

    const self = await makeUser(`${throwawayUsername}_self`);
    const peer = await makeUser(`${throwawayUsername}_peer`);

    const cleanupUser = async (entry: Awaited<ReturnType<typeof makeUser>>) => {
      try {
        console.log('smoke step: cleaning up', entry.user.userId);
        await entry.auth.loginUser(entry.user.fullUsername, password);
        console.log('smoke step: relogged in, deleting account');
        await ApiService.deleteAccount(entry.user.userId, entry.user.deviceId);
        console.log('smoke step: account deleted');
      } catch (error) {
        console.warn('smoke: could not delete DM account:', (error as Error).message);
      }
    };

    // Node's global WebSocket (Undici) satisfies the WsLike surface
    const wsFactory: WsFactory = (url) =>
      new (globalThis as unknown as { WebSocket: new (u: string) => WsLike }).WebSocket(url);

    try {
      const started = await ApiService.startDirectMessage(self.user.userId, peer.user.userId);
      expect(started.conversationId).toBeTruthy();
      const conversationId = started.conversationId;

      const peerKey = await ApiService.getPublicKey(peer.user.userId);
      const selfKey = await ApiService.getPublicKey(self.user.userId);
      expect(peerKey).toBeTruthy();
      expect(selfKey).toBeTruthy();

      // Listeners are registered AFTER connect (connect clears listeners — mobile parity)
      const selfSocket = new DirectMessageSocket({ wsFactory, encryption: self.encryption });
      await selfSocket.connect(
        conversationId, self.user.userId, self.user.fullUsername, peer.user.userId, baseUrl, peerKey,
      );
      const peerSocket = new DirectMessageSocket({ wsFactory, encryption: peer.encryption });
      await peerSocket.connect(
        conversationId, peer.user.userId, peer.user.fullUsername, self.user.userId, baseUrl, selfKey,
      );

      const selfConnected = new Promise<void>((resolve) => selfSocket.on('connected', () => resolve()));
      const peerConnected = new Promise<void>((resolve) => peerSocket.on('connected', () => resolve()));
      await Promise.all([selfConnected, peerConnected]);

      // self → peer
      const peerGotMessage = new Promise<DecryptedMessage>((resolve) => {
        peerSocket.on('message', (msg) => {
          if (msg.senderId === self.user.userId) resolve(msg);
        });
      });
      await selfSocket.sendMessage('live hello from webqa');
      const received = await peerGotMessage;
      expect(received.content).toBe('live hello from webqa');
      expect(received.isEncrypted).toBe(false);

      // peer → self (the worker echoes sent messages to the sender, so filter by senderId)
      const selfGotMessage = new Promise<DecryptedMessage>((resolve) => {
        selfSocket.on('message', (msg) => {
          if (msg.senderId === peer.user.userId) resolve(msg);
        });
      });
      await peerSocket.sendMessage('live reply from webqa');
      const reply = await selfGotMessage;
      expect(reply.content).toBe('live reply from webqa');
      expect(reply.isEncrypted).toBe(false);

      // NOTE: the worker does not send a `history` event on join in live tests
      // (verified with a raw protocol probe: only user_joined/user_left and
      // encrypted_message echoes arrive). The history decrypt path is covered
      // deterministically by the FakeWebSocket unit tests instead.
      selfSocket.disconnect();
      peerSocket.disconnect();
    } finally {
      await cleanupUser(self);
      await cleanupUser(peer);
    }
  }, 60000);

  afterAll(async () => {
    if (!registeredUser) return;
    try {
      const storage = new MemoryStorageAdapter();
      const auth = new AuthService(storage, encryptionService);
      const user = await auth.loginUser(registeredUser.fullUsername, password);
      const ok = await ApiService.deleteAccount(user.userId, user.deviceId);
      console.log(`smoke: throwaway account deleted: ${ok}`);
    } catch (error) {
      console.warn('smoke: could not delete throwaway account:', (error as Error).message);
    }
  });
});
