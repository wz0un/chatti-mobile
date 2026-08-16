/**
 * QA regression probe: DirectMessagePage usage pattern + reconnect.
 * Proves whether event listeners registered after `connect()` survive
 * a reconnect cycle (the web page registers listeners once in useEffect;
 * if the socket wipes them on reconnect, incoming messages are lost).
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { DirectMessageSocket } from '../../shared/ws/DirectMessageSocket';
import { FakeWebSocket, fakeWsFactory } from '../../shared/ws/testUtils';
import { EncryptionService } from '../../shared/crypto/EncryptionService';
import { MemoryStorageAdapter } from '../../shared/storage/StorageAdapter';

const PRIV_A = '0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20';
const PUB_A = 'ce8736a3ad7c8260e0c5e5a457931ad19966d693e5c32414496b73d7f4e8bdaf51763d49d07a56b0a188048d61d52bd2a06e706a7a46664113e794057474d04c96b5bb151a50b27818a513cd8d6ecf037fc638b3b2f1084c58d4419735ba12c9a4391e2b3133bd660785e468569be85c7ad4f904d98a13f5e8695ff8cc5e22834228a8ea2c082ff49a07607e8e5c1278ce8091725678fde112491091bf4cf3b1759ccb32c1de0b90a074b1e3ffe179d71a292ff29ce9580c3a978793598c0e008289e7ab7783b2b75caf9152267e8c981dbb28fde07f2e11ffe1e3984097d1602c61ffd0714d9523455377c177df3be6b3c81e69f762c04be910a225f323882d';
const PRIV_B = '2122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f40';
const PUB_B = '71f59a5d74d46d0a4ebb64d53255410ba69c8dbbd9a5cc8c152ebbd6c5881126463d4a2598e56aad581678038a87dd1708ce6c6164f149a0526f8673dd642a3e2fb92964939a1ab8af636a0395e0d99d471f9a433a0717ca179af6906491731727e350437138efd091e971299a06c80d1fabb14b3a2f3d35a80e13e292b550789e30e034dcca6fe0319a8593e5d41b231d1b0f14746ab47f4116687336dbebf1fb5e1480e704d58a869a1a50e022550021b20fc262c2d12e3e767bb5fc71b44310334eeda725a5f2fc50c0d7b6626c58c82619952b539e5a8526d370d4700199f74d4c66a88c6b8e2fe9e1fdbf670f7b3791a21cc84c12d22a81cffa2719333d';

const peerEncryption = async (priv: string, pub: string) => {
  const storage = new MemoryStorageAdapter();
  await storage.setItem('e2e_key_pair_v2', JSON.stringify({ privateKey: priv, publicKey: pub }));
  const encryption = new EncryptionService(storage);
  await encryption.initialize();
  return encryption;
};

const encryptForA = async (text: string) => {
  const encryptionB = await peerEncryption(PRIV_B, PUB_B);
  const secret = await encryptionB.deriveSharedSecret('user_1', PUB_A);
  return encryptionB.encryptMessage(text, secret);
};

describe('QA probe: web DM page pattern — listeners after reconnect', () => {
  beforeEach(() => {
    FakeWebSocket.reset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('page pattern: messages received BEFORE reconnect', async () => {
    const socket = new DirectMessageSocket({
      wsFactory: fakeWsFactory,
      encryption: await peerEncryption(PRIV_A, PUB_A),
    });
    await socket.connect('conv_1', 'user_1', 'a#1', 'user_2', 'https://x.dev', PUB_B);
    socket.on('message', () => {}); // page registers listeners after connect()
    const ws = FakeWebSocket.instances[0];
    ws.open();

    const { encryptedContent, iv } = await encryptForA('before reconnect');
    const onMessage = vi.fn();
    socket.on('message', onMessage);
    await ws.serverSend({
      type: 'encrypted_message', id: 'm1', senderId: 'user_2', recipientId: 'user_1',
      encryptedContent, iv, senderPublicKey: PUB_B, timestamp: '2026-01-01T00:00:00Z',
    });
    expect(onMessage).toHaveBeenCalledTimes(1);
  });

  it('page pattern: messages received AFTER reconnect (listener survival)', async () => {
    const socket = new DirectMessageSocket({
      wsFactory: fakeWsFactory,
      encryption: await peerEncryption(PRIV_A, PUB_A),
    });
    await socket.connect('conv_1', 'user_1', 'a#1', 'user_2', 'https://x.dev', PUB_B);

    const onMessage = vi.fn();
    const onConnected = vi.fn();
    socket.on('message', onMessage); // registered after connect() — page pattern
    socket.on('connected', onConnected);

    let ws = FakeWebSocket.instances[0];
    ws.open();
    expect(onConnected).toHaveBeenCalledTimes(1);

    // network interruption → abnormal close → reconnect
    ws.close(1006, 'abnormal');
    await vi.advanceTimersByTimeAsync(2000);
    expect(FakeWebSocket.instances).toHaveLength(2);
    ws = FakeWebSocket.instances[1];
    ws.open();

    // peer sends a message after the reconnect
    const { encryptedContent, iv } = await encryptForA('after reconnect');
    await ws.serverSend({
      type: 'encrypted_message', id: 'm2', senderId: 'user_2', recipientId: 'user_1',
      encryptedContent, iv, senderPublicKey: PUB_B, timestamp: '2026-01-01T00:00:01Z',
    });

    expect(onMessage).toHaveBeenCalledTimes(1); // EXPECTED for a working client
    expect(onMessage.mock.calls[0][0].content).toBe('after reconnect');
  });
});
