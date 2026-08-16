/**
 * DirectMessageSocket tests — join payload with publicKey, key exchange,
 * encrypted history/incoming messages (web ⇄ web encrypted round trip),
 * mobile bug #1 fix, reconnect policy.
 */

import { DirectMessageSocket } from './DirectMessageSocket';
import { FakeWebSocket, fakeWsFactory } from './testUtils';
import { EncryptionService } from '../crypto/EncryptionService';
import { MemoryStorageAdapter } from '../storage/StorageAdapter';

// Fixed key pairs (generated from the mobile algorithm)
const PRIV_A = '0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20';
const PUB_A = 'ce8736a3ad7c8260e0c5e5a457931ad19966d693e5c32414496b73d7f4e8bdaf51763d49d07a56b0a188048d61d52bd2a06e706a7a46664113e794057474d04c96b5bb151a50b27818a513cd8d6ecf037fc638b3b2f1084c58d4419735ba12c9a4391e2b3133bd660785e468569be85c7ad4f904d98a13f5e8695ff8cc5e22834228a8ea2c082ff49a07607e8e5c1278ce8091725678fde112491091bf4cf3b1759ccb32c1de0b90a074b1e3ffe179d71a292ff29ce9580c3a978793598c0e008289e7ab7783b2b75caf9152267e8c981dbb28fde07f2e11ffe1e3984097d1602c61ffd0714d9523455377c177df3be6b3c81e69f762c04be910a225f323882d';
const PRIV_B = '2122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f40';
const PUB_B = '71f59a5d74d46d0a4ebb64d53255410ba69c8dbbd9a5cc8c152ebbd6c5881126463d4a2598e56aad581678038a87dd1708ce6c6164f149a0526f8673dd642a3e2fb92964939a1ab8af636a0395e0d99d471f9a433a0717ca179af6906491731727e350437138efd091e971299a06c80d1fabb14b3a2f3d35a80e13e292b550789e30e034dcca6fe0319a8593e5d41b231d1b0f14746ab47f4116687336dbebf1fb5e1480e704d58a869a1a50e022550021b20fc262c2d12e3e767bb5fc71b44310334eeda725a5f2fc50c0d7b6626c58c82619952b539e5a8526d370d4700199f74d4c66a88c6b8e2fe9e1fdbf670f7b3791a21cc84c12d22a81cffa2719333d';

const API_URL = 'https://chatti-workers.wz0un.workers.dev';

/** EncryptionService seeded with a fixed key pair (as mobile stores it). */
const peerEncryption = async (privateKey: string, publicKey: string) => {
  const storage = new MemoryStorageAdapter();
  await storage.setItem(
    'e2e_key_pair_v2',
    JSON.stringify({ privateKey, publicKey }),
  );
  const encryption = new EncryptionService(storage);
  await encryption.initialize();
  return encryption;
};

describe('DirectMessageSocket', () => {
  beforeEach(() => {
    FakeWebSocket.reset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('connects, fetches the recipient public key and joins with own publicKey', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, publicKey: PUB_B }))),
    );

    const socket = new DirectMessageSocket({
      wsFactory: fakeWsFactory,
      encryption: await peerEncryption(PRIV_A, PUB_A),
    });

    // Listener must be registered after connect: connect() clears listeners
    // via disconnect() (mobile usage pattern)
    await socket.connect('conv_1', 'user_1', 'alice#1234', 'user_2', API_URL);
    const connected = vi.fn();
    socket.on('connected', connected);
    const ws = FakeWebSocket.instances[0];

    expect(ws.url).toBe('wss://chatti-workers.wz0un.workers.dev/api/dm/conv_1');
    expect(fetch).toHaveBeenCalledWith(
      'https://chatti-workers.wz0un.workers.dev/api/users/public-key?userId=user_2',
    );

    ws.open();
    expect(ws.sent[0]).toEqual({
      type: 'join',
      userId: 'user_1',
      username: 'alice#1234',
      publicKey: PUB_A,
    });
    expect(connected).toHaveBeenCalledWith({ conversationId: 'conv_1' });
  });

  it('skips the REST key fetch when a recipientPublicKey is provided', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const socket = new DirectMessageSocket({
      wsFactory: fakeWsFactory,
      encryption: await peerEncryption(PRIV_A, PUB_A),
    });
    await socket.connect('conv_1', 'user_1', 'a#1', 'user_2', API_URL, PUB_B);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('decrypts an encrypted history from the peer (web ⇄ web)', async () => {
    const encryptionA = await peerEncryption(PRIV_A, PUB_A);
    const encryptionB = await peerEncryption(PRIV_B, PUB_B);

    // Peer B encrypts a message to A
    const secretB = await encryptionB.deriveSharedSecret('user_1', PUB_A);
    const { encryptedContent, iv } = await encryptionB.encryptMessage('secret from B', secretB);
    const historyMessage = {
      id: 'm1',
      senderId: 'user_2',
      recipientId: 'user_1',
      encryptedContent,
      iv,
      senderPublicKey: PUB_B,
      timestamp: '2026-08-11T00:00:00.000Z',
    };

    const socket = new DirectMessageSocket({
      wsFactory: fakeWsFactory,
      encryption: encryptionA,
    });
    await socket.connect('conv_1', 'user_1', 'a#1', 'user_2', API_URL, PUB_B);
    const ws = FakeWebSocket.instances[0];
    ws.open();

    const onHistory = vi.fn();
    socket.on('history', onHistory);
    await ws.serverSend({ type: 'history', messages: [historyMessage] });

    expect(onHistory).toHaveBeenCalledWith({
      messages: [
        {
          id: 'm1',
          senderId: 'user_2',
          recipientId: 'user_1',
          content: 'secret from B',
          timestamp: '2026-08-11T00:00:00.000Z',
          isEncrypted: false,
        },
      ],
    });
  });

  it('decrypts an incoming encrypted_message (mobile bug #1 fix)', async () => {
    const encryptionA = await peerEncryption(PRIV_A, PUB_A);
    const encryptionB = await peerEncryption(PRIV_B, PUB_B);

    const secretB = await encryptionB.deriveSharedSecret('user_1', PUB_A);
    const { encryptedContent, iv } = await encryptionB.encryptMessage('hi from B', secretB);

    const socket = new DirectMessageSocket({
      wsFactory: fakeWsFactory,
      encryption: encryptionA,
    });
    await socket.connect('conv_1', 'user_1', 'a#1', 'user_2', API_URL, PUB_B);
    const ws = FakeWebSocket.instances[0];
    ws.open();

    const onMessage = vi.fn();
    socket.on('message', onMessage);

    await ws.serverSend({
      type: 'encrypted_message',
      id: 'm2',
      senderId: 'user_2',
      recipientId: 'user_1',
      encryptedContent,
      iv,
      senderPublicKey: PUB_B,
      timestamp: '2026-08-11T00:00:01.000Z',
    });

    expect(onMessage).toHaveBeenCalledTimes(1);
    // The decrypted content MUST be delivered (mobile bug #1 re-emitted the
    // "could not decrypt" marker instead).
    expect(onMessage.mock.calls[0][0].content).toBe('hi from B');
    expect(onMessage.mock.calls[0][0].isEncrypted).toBe(false);
  });

  it('emits the encrypted marker when decryption fails', async () => {
    // Real failure: the decryption step rejects (e.g. corrupted storage/keys).
    // NB: invalid-hex ciphertexts do NOT throw — the XOR cipher produces
    // garbage content instead (mobile parity).
    const brokenEncryption = {
      initialize: async () => true,
      getPublicKey: async () => PUB_A,
      deriveSharedSecret: async () => 'x',
      encryptMessage: async () => ({ encryptedContent: 'x', iv: 'y' }),
      decryptMessage: async () => {
        throw new Error('decryption failed');
      },
    } as unknown as EncryptionService;

    const socket = new DirectMessageSocket({
      wsFactory: fakeWsFactory,
      encryption: brokenEncryption,
    });
    await socket.connect('conv_1', 'user_1', 'a#1', 'user_2', API_URL, PUB_B);
    const ws = FakeWebSocket.instances[0];
    ws.open();

    const onMessage = vi.fn();
    socket.on('message', onMessage);

    await ws.serverSend({
      type: 'encrypted_message',
      id: 'm3',
      senderId: 'user_2',
      recipientId: 'user_1',
      encryptedContent: 'garbage',
      iv: 'garbage',
      senderPublicKey: PUB_B,
      timestamp: '2026-08-11T00:00:02.000Z',
    });

    expect(onMessage).toHaveBeenCalledWith({
      id: 'm3',
      senderId: 'user_2',
      recipientId: 'user_1',
      content: '[Encrypted Message - Could not decrypt]',
      timestamp: '2026-08-11T00:00:02.000Z',
      isEncrypted: true,
    });
  });

  it('sendMessage encrypts with the shared secret and includes senderPublicKey', async () => {
    const encryptionA = await peerEncryption(PRIV_A, PUB_A);
    const socket = new DirectMessageSocket({
      wsFactory: fakeWsFactory,
      encryption: encryptionA,
    });
    await socket.connect('conv_1', 'user_1', 'a#1', 'user_2', API_URL, PUB_B);
    const ws = FakeWebSocket.instances[0];
    ws.open();

    await socket.sendMessage('encrypted hello');

    const sent = ws.sent.find((m) => m.type === 'encrypted_message');
    expect(sent).toBeDefined();
    expect(sent).toMatchObject({
      type: 'encrypted_message',
      recipientId: 'user_2',
      senderPublicKey: PUB_A,
    });
    expect(sent!.iv).toBeTruthy();
    expect(sent!.encryptedContent).toBeTruthy();

    // Round trip: peer B can decrypt what A sent
    const encryptionB = await peerEncryption(PRIV_B, PUB_B);
    const secretB = await encryptionB.deriveSharedSecret('user_1', PUB_A);
    const plaintext = await encryptionB.decryptMessage(
      sent!.encryptedContent as string,
      sent!.iv as string,
      secretB,
    );
    expect(plaintext).toBe('encrypted hello');
  });

  it('sendMessage without recipient public key emits an error and sends nothing', async () => {
    const socket = new DirectMessageSocket({
      wsFactory: fakeWsFactory,
      encryption: await peerEncryption(PRIV_A, PUB_A),
    });
    await socket.connect('conv_1', 'user_1', 'a#1', 'user_2', API_URL);
    const ws = FakeWebSocket.instances[0];
    ws.open();

    const onError = vi.fn();
    socket.on('error', onError);

    await socket.sendMessage('nope');
    expect(onError).toHaveBeenCalledWith({
      message: 'Recipient not available for encryption. They may need to come online once.',
    });
    expect(ws.sent.find((m) => m.type === 'encrypted_message')).toBeUndefined();
  });

  it('stores the peer public key from key_exchanged', async () => {
    const socket = new DirectMessageSocket({
      wsFactory: fakeWsFactory,
      encryption: await peerEncryption(PRIV_A, PUB_A),
    });
    await socket.connect('conv_1', 'user_1', 'a#1', 'user_2', API_URL);
    const ws = FakeWebSocket.instances[0];
    ws.open();

    const onKeyExchanged = vi.fn();
    socket.on('key_exchanged', onKeyExchanged);
    await ws.serverSend({ type: 'key_exchanged', userId: 'user_2', publicKey: PUB_B });

    expect(onKeyExchanged).toHaveBeenCalledWith({ type: 'key_exchanged', userId: 'user_2', publicKey: PUB_B });

    // Now sending works without a pre-fetched key
    await socket.sendMessage('after key exchange');
    expect(ws.sent.find((m) => m.type === 'encrypted_message')).toBeDefined();
  });

  it('stores the peer public key from user_joined', async () => {
    const socket = new DirectMessageSocket({
      wsFactory: fakeWsFactory,
      encryption: await peerEncryption(PRIV_A, PUB_A),
    });
    await socket.connect('conv_1', 'user_1', 'a#1', 'user_2', API_URL);
    const ws = FakeWebSocket.instances[0];
    ws.open();

    await ws.serverSend({ type: 'user_joined', userId: 'user_2', publicKey: PUB_B });

    await socket.sendMessage('after join');
    expect(ws.sent.find((m) => m.type === 'encrypted_message')).toBeDefined();
  });

  it('emits typing and user_left events', async () => {
    const socket = new DirectMessageSocket({
      wsFactory: fakeWsFactory,
      encryption: await peerEncryption(PRIV_A, PUB_A),
    });
    await socket.connect('conv_1', 'user_1', 'a#1', 'user_2', API_URL, PUB_B);
    const ws = FakeWebSocket.instances[0];
    ws.open();

    const onTyping = vi.fn();
    const onUserLeft = vi.fn();
    socket.on('typing', onTyping);
    socket.on('user_left', onUserLeft);

    await ws.serverSend({ type: 'typing', isTyping: true });
    await ws.serverSend({ type: 'user_left', userId: 'user_2' });

    expect(onTyping).toHaveBeenCalledWith({ type: 'typing', isTyping: true });
    expect(onUserLeft).toHaveBeenCalledWith({ type: 'user_left', userId: 'user_2' });
  });

  it('reconnects on unexpected close and does not reconnect on 1000', async () => {
    const socket = new DirectMessageSocket({
      wsFactory: fakeWsFactory,
      encryption: await peerEncryption(PRIV_A, PUB_A),
    });
    await socket.connect('conv_1', 'user_1', 'a#1', 'user_2', API_URL, PUB_B);
    let ws = FakeWebSocket.instances[0];
    ws.open();

    ws.close(1006, 'abnormal');
    expect(FakeWebSocket.instances).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(2000);
    expect(FakeWebSocket.instances).toHaveLength(2);
    ws = FakeWebSocket.instances[1];
    ws.open();
    expect(ws.sent[0]).toMatchObject({ type: 'join', userId: 'user_1' });

    ws.close(1000, 'clean');
    await vi.advanceTimersByTimeAsync(10000);
    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it('stops after max reconnect attempts and emits error', async () => {
    const socket = new DirectMessageSocket({
      wsFactory: fakeWsFactory,
      encryption: await peerEncryption(PRIV_A, PUB_A),
    });
    await socket.connect('conv_1', 'user_1', 'a#1', 'user_2', API_URL, PUB_B);
    let ws = FakeWebSocket.instances[0];
    ws.open();

    // Mobile parity: each reconnect runs connect() → disconnect() → clear(),
    // so event listeners registered before are wiped. The final error is
    // therefore only observable through the console log (same as mobile).
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onError = vi.fn();
    socket.on('error', onError);

    for (let attempt = 1; attempt <= 5; attempt++) {
      ws.close(1006, 'x');
      await vi.advanceTimersByTimeAsync(2000 * attempt);
      ws = FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
    }

    // The 6th connection is the last attempt: its close emits the error
    ws.close(1006, 'x');
    expect(errorSpy).toHaveBeenCalledWith('Max DM reconnection attempts reached');
    // The error event is emitted, but listeners were cleared on reconnect (mobile parity)
    expect(onError).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('disconnect prevents reconnects and clears listeners', async () => {
    const socket = new DirectMessageSocket({
      wsFactory: fakeWsFactory,
      encryption: await peerEncryption(PRIV_A, PUB_A),
    });
    await socket.connect('conv_1', 'user_1', 'a#1', 'user_2', API_URL, PUB_B);
    const ws = FakeWebSocket.instances[0];
    ws.open();

    const onTyping = vi.fn();
    socket.on('typing', onTyping);

    socket.disconnect();
    ws.close(1006, 'after disconnect');
    vi.advanceTimersByTime(10000);
    expect(FakeWebSocket.instances).toHaveLength(1);

    // listener cleared
    socket.emit('typing', { isTyping: true });
    expect(onTyping).not.toHaveBeenCalled();
  });

  it('fetches the public key even when the api url is given as wss', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ success: true, publicKey: PUB_B })));
    vi.stubGlobal('fetch', fetchMock);

    const socket = new DirectMessageSocket({
      wsFactory: fakeWsFactory,
      encryption: await peerEncryption(PRIV_A, PUB_A),
    });
    await socket.connect('conv_1', 'user_1', 'a#1', 'user_2', 'wss://chatti-workers.wz0un.workers.dev');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://chatti-workers.wz0un.workers.dev/api/users/public-key?userId=user_2',
    );
  });
});
