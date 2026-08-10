/**
 * Fixed-vector tests for the EncryptionService port.
 *
 * The vectors below were generated from the EXACT mobile algorithm
 * (`src/services/EncryptionService.js`): modPow over RFC 3526 Group 14,
 * SHA-256 of the BigInt hex string, per-message key SHA-256(secret + ivBase64)
 * used as a repeating XOR keystream. They are the ground truth for
 * web ⇄ mobile interoperability (QA cross-checks against the real mobile app).
 */

import { EncryptionService } from './EncryptionService';
import { MemoryStorageAdapter } from '../storage/StorageAdapter';

const P_HEX =
  'FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD1' +
  '29024E088A67CC74020BBEA63B139B22514A08798E3404DD' +
  'EF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245' +
  'E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7ED' +
  'EE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3D' +
  'C2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F' +
  '83655D23DCA3AD961C62F356208552BB9ED529077096966D' +
  '670C354E4ABC9804F1746C08CA18217C32905E462E36CE3B' +
  'E39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9' +
  'DE2BCBF6955817183995497CEA956AE515D2261898FA0510' +
  '15728E5A8AACAA68FFFFFFFFFFFFFFFF';
const P = BigInt('0x' + P_HEX);
const G = 2n;

// Device A fixed private key (32 bytes)
const PRIV_A = '0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20';
// Device B fixed private key (32 bytes)
const PRIV_B = '2122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f40';
// Expected public keys (g^priv mod p, hex)
const PUB_A = 'ce8736a3ad7c8260e0c5e5a457931ad19966d693e5c32414496b73d7f4e8bdaf51763d49d07a56b0a188048d61d52bd2a06e706a7a46664113e794057474d04c96b5bb151a50b27818a513cd8d6ecf037fc638b3b2f1084c58d4419735ba12c9a4391e2b3133bd660785e468569be85c7ad4f904d98a13f5e8695ff8cc5e22834228a8ea2c082ff49a07607e8e5c1278ce8091725678fde112491091bf4cf3b1759ccb32c1de0b90a074b1e3ffe179d71a292ff29ce9580c3a978793598c0e008289e7ab7783b2b75caf9152267e8c981dbb28fde07f2e11ffe1e3984097d1602c61ffd0714d9523455377c177df3be6b3c81e69f762c04be910a225f323882d';
const PUB_B = '71f59a5d74d46d0a4ebb64d53255410ba69c8dbbd9a5cc8c152ebbd6c5881126463d4a2598e56aad581678038a87dd1708ce6c6164f149a0526f8673dd642a3e2fb92964939a1ab8af636a0395e0d99d471f9a433a0717ca179af6906491731727e350437138efd091e971299a06c80d1fabb14b3a2f3d35a80e13e292b550789e30e034dcca6fe0319a8593e5d41b231d1b0f14746ab47f4116687336dbebf1fb5e1480e704d58a869a1a50e022550021b20fc262c2d12e3e767bb5fc71b44310334eeda725a5f2fc50c0d7b6626c58c82619952b539e5a8526d370d4700199f74d4c66a88c6b8e2fe9e1fdbf670f7b3791a21cc84c12d22a81cffa2719333d';
// Shared secret: SHA-256(hex(B^a mod p)) — DH symmetry means A^b gives the same.
const SHARED_SECRET = '948d939bbcdf7d91fb7c38cbc023ffe26cdc06bf95448927a8ab59ebb8c1163c';
// Fixed IV (16 bytes 0x01..0x10), base64
const IV_B64 = 'AQIDBAUGBwgJCgsMDQ4PEA==';

const VECTOR_1_PLAINTEXT = 'Hello, Chatti! This is a fixed-vector test.';
const VECTOR_1_CIPHERTEXT =
  'mcWSUzu9WZsUv7Trlnfc81NB2768OGlxl7ApnIuT3Q+0w4pQJrENvQ+q7g==';

// UTF-8 multibyte vector (emoji + Arabic + Spanish accents) — ensures the
// TextEncoder/TextDecoder byte handling matches mobile exactly.
const VECTOR_2_PLAINTEXT = '¡Hola! 🔒 مرحبا mündlich';
const VECTOR_2_CIPHERTEXT = 'EwG2UDjwWPiMQVQN3495f4rwBUZ9k+4w2hX8ioqbmRq5';

/** Deterministic random source: bytes 0x01..0xNN for vector reproducibility. */
const seqRandom: (size: number) => Uint8Array = (size) => {
  const bytes = new Uint8Array(size);
  for (let i = 0; i < size; i++) bytes[i] = i + 1;
  return bytes;
};

/** Build a service seeded with a known key pair (as mobile would store it). */
const seededService = async (privateKeyHex: string, publicKeyHex: string) => {
  const storage = new MemoryStorageAdapter();
  const service = new EncryptionService(storage, seqRandom);
  await storage.setItem(
    'e2e_key_pair_v2',
    JSON.stringify({ privateKey: privateKeyHex, publicKey: publicKeyHex }),
  );
  await service.initialize();
  return service;
};

describe('EncryptionService — modPow', () => {
  const service = new EncryptionService(new MemoryStorageAdapter());

  it('matches the mobile modular exponentiation', () => {
    expect(service.modPow(G, BigInt('0x' + PRIV_A), P).toString(16)).toBe(PUB_A);
    expect(service.modPow(G, BigInt('0x' + PRIV_B), P).toString(16)).toBe(PUB_B);
  });

  it('computes small known values', () => {
    expect(service.modPow(2n, 10n, 1000n)).toBe(24n);
    expect(service.modPow(3n, 0n, 7n)).toBe(1n);
  });
});

describe('EncryptionService — key generation', () => {
  it('persists a key pair with 64-hex private key', async () => {
    const storage = new MemoryStorageAdapter();
    const service = new EncryptionService(storage, seqRandom);
    const pair = await service.generateKeyPair();
    expect(pair.privateKey).toMatch(/^[0-9a-f]{64}$/);
    expect(pair.publicKey).toMatch(/^[0-9a-f]+$/);
    expect(pair.publicKey).toBe(service.modPow(G, BigInt('0x' + pair.privateKey), P).toString(16));
    expect(await storage.getItem('e2e_key_pair_v2')).toBe(JSON.stringify(pair));
    expect(await storage.getItem('e2e_public_key_v2')).toBe(pair.publicKey);
  });

  it('reloads a stored key pair on initialize', async () => {
    const service = await seededService(PRIV_A, PUB_A);
    expect(await service.getPublicKey()).toBe(PUB_A);
  });
});

describe('EncryptionService — web ⇄ mobile fixed vectors', () => {
  it('derives the mobile shared secret (A side)', async () => {
    const serviceA = await seededService(PRIV_A, PUB_A);
    const secret = await serviceA.deriveSharedSecret('userB', PUB_B);
    expect(secret).toBe(SHARED_SECRET);
  });

  it('derives the mobile shared secret (B side) — DH symmetry', async () => {
    const serviceB = await seededService(PRIV_B, PUB_B);
    const secret = await serviceB.deriveSharedSecret('userA', PUB_A);
    expect(secret).toBe(SHARED_SECRET);
  });

  it('recomputes when the peer public key changes', async () => {
    const service = await seededService(PRIV_A, PUB_A);
    const s1 = await service.deriveSharedSecret('userB', PUB_B);
    const s2 = await service.deriveSharedSecret('userB', PUB_A);
    expect(s2).not.toBe(s1);
  });

  it('encrypts the vector plaintext into the vector ciphertext', async () => {
    const service = new EncryptionService(new MemoryStorageAdapter(), seqRandom);
    const { encryptedContent, iv } = await service.encryptMessage(VECTOR_1_PLAINTEXT, SHARED_SECRET);
    expect(iv).toBe(IV_B64);
    expect(encryptedContent).toBe(VECTOR_1_CIPHERTEXT);
  });

  it('decrypts the vector ciphertext produced by the mobile algorithm', async () => {
    const service = new EncryptionService(new MemoryStorageAdapter());
    const plaintext = await service.decryptMessage(VECTOR_1_CIPHERTEXT, IV_B64, SHARED_SECRET);
    expect(plaintext).toBe(VECTOR_1_PLAINTEXT);
  });

  it('handles multibyte UTF-8 identically to mobile', async () => {
    const service = new EncryptionService(new MemoryStorageAdapter(), seqRandom);
    const { encryptedContent, iv } = await service.encryptMessage(VECTOR_2_PLAINTEXT, SHARED_SECRET);
    expect(encryptedContent).toBe(VECTOR_2_CIPHERTEXT);
    const plaintext = await service.decryptMessage(encryptedContent, iv, SHARED_SECRET);
    expect(plaintext).toBe(VECTOR_2_PLAINTEXT);
  });
});

describe('EncryptionService — round trips', () => {
  it('round-trips with random IV', async () => {
    const serviceA = await seededService(PRIV_A, PUB_A);
    const serviceB = await seededService(PRIV_B, PUB_B);

    const secretA = await serviceA.deriveSharedSecret('userB', PUB_B);
    const secretB = await serviceB.deriveSharedSecret('userA', PUB_A);
    expect(secretA).toBe(secretB);

    const { encryptedContent, iv } = await serviceA.encryptMessage(
      'Web → Mobile round trip message',
      secretA,
    );
    const plaintext = await serviceB.decryptMessage(encryptedContent, iv, secretB);
    expect(plaintext).toBe('Web → Mobile round trip message');
  });

  it('decrypt failure returns the mobile fallback marker', async () => {
    const service = new EncryptionService(new MemoryStorageAdapter());
    const result = await service.decryptMessage('!!!not-base64!!!', IV_B64, SHARED_SECRET);
    expect(result).toContain('[Error descifrando:');
  });

  it('deriving with a missing public key throws', async () => {
    const service = await seededService(PRIV_A, PUB_A);
    await expect(service.deriveSharedSecret('userB', '')).rejects.toThrow(
      'Recipient public key is missing',
    );
  });
});

describe('EncryptionService — clearKeys', () => {
  it('removes stored keys and clears cached secrets', async () => {
    const storage = new MemoryStorageAdapter();
    const service = new EncryptionService(storage, seqRandom);
    await service.initialize();
    await service.deriveSharedSecret('userB', PUB_B);
    await service.clearKeys();
    expect(await storage.getItem('e2e_key_pair_v2')).toBeNull();
    expect(await storage.getItem('e2e_public_key_v2')).toBeNull();
    const pub = await service.getPublicKey();
    expect(pub).toBe(service.modPow(G, BigInt('0x' + PRIV_A), P).toString(16));
  });
});
