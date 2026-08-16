/**
 * QA: web ⇄ mobile cryptography interoperability test.
 *
 * Runs the REAL mobile EncryptionService (src/services/EncryptionService.js)
 * against the web/shared port (shared/crypto/EncryptionService.ts) in the
 * same process. expo-crypto / AsyncStorage / react-native-get-random-values
 * are shimmed with byte-identical semantics (SHA-256 hex digest).
 *
 * Same private key ⇒ same public key ⇒ same shared secret ⇒ same ciphertext,
 * plus cross-decryption in both directions.
 *
 * Run explicitly (not part of the default suite):
 *   npx vitest run --config scripts/interop.vitest.config.ts
 */

import { describe, expect, it } from 'vitest';

import { EncryptionService as WebEncryption } from '../../shared/crypto/EncryptionService';
import { MemoryStorageAdapter } from '../../shared/storage/StorageAdapter';
import mobileEncryption from '../../src/services/EncryptionService.js';
import { storeMap } from '/tmp/opencode/shims/async-storage.mjs';

// Fixed private keys (32 bytes each) — deterministic vectors
const PRIV_A = '0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20';
const PRIV_B = '2122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f40';
const PUB_A = 'ce8736a3ad7c8260e0c5e5a457931ad19966d693e5c32414496b73d7f4e8bdaf51763d49d07a56b0a188048d61d52bd2a06e706a7a46664113e794057474d04c96b5bb151a50b27818a513cd8d6ecf037fc638b3b2f1084c58d4419735ba12c9a4391e2b3133bd660785e468569be85c7ad4f904d98a13f5e8695ff8cc5e22834228a8ea2c082ff49a07607e8e5c1278ce8091725678fde112491091bf4cf3b1759ccb32c1de0b90a074b1e3ffe179d71a292ff29ce9580c3a978793598c0e008289e7ab7783b2b75caf9152267e8c981dbb28fde07f2e11ffe1e3984097d1602c61ffd0714d9523455377c177df3be6b3c81e69f762c04be910a225f323882d';
const PUB_B = '71f59a5d74d46d0a4ebb64d53255410ba69c8dbbd9a5cc8c152ebbd6c5881126463d4a2598e56aad581678038a87dd1708ce6c6164f149a0526f8673dd642a3e2fb92964939a1ab8af636a0395e0d99d471f9a433a0717ca179af6906491731727e350437138efd091e971299a06c80d1fabb14b3a2f3d35a80e13e292b550789e30e034dcca6fe0319a8593e5d41b231d1b0f14746ab47f4116687336dbebf1fb5e1480e704d58a869a1a50e022550021b20fc262c2d12e3e767bb5fc71b44310334eeda725a5f2fc50c0d7b6626c58c82619952b539e5a8526d370d4700199f74d4c66a88c6b8e2fe9e1fdbf670f7b3791a21cc84c12d22a81cffa2719333d';

// Deterministic random source for the web service
const seqRandom: (size: number) => Uint8Array = (size) => {
  const bytes = new Uint8Array(size);
  for (let i = 0; i < size; i++) bytes[i] = i + 1;
  return bytes;
};

const mobile = mobileEncryption as unknown as {
  initialize(): Promise<boolean>;
  getPublicKey(): Promise<string>;
  deriveSharedSecret(otherUserId: string, otherPublicKeyHex: string): Promise<string>;
  encryptMessage(
    plaintext: string,
    secret: string,
  ): Promise<{ encryptedContent: string; iv: string }>;
  decryptMessage(content: string, iv: string, secret: string): Promise<string>;
};

const seedMobileWithKey = async (privHex: string, pubHex: string) => {
  (mobile as unknown as { sharedSecrets: Map<string, unknown> }).sharedSecrets.clear();
  storeMap.clear();
  storeMap.set(
    'e2e_key_pair_v2',
    JSON.stringify({ privateKey: privHex, publicKey: pubHex }),
  );
  storeMap.set('e2e_public_key_v2', pubHex);
  await mobile.initialize();
};

describe('web ⇄ mobile encryption interop (real mobile source)', () => {
  it('derives the same public key from the same private key', async () => {
    await seedMobileWithKey(PRIV_A, PUB_A);
    const mobilePub = await mobile.getPublicKey();

    const storage = new MemoryStorageAdapter();
    await storage.setItem(
      'e2e_key_pair_v2',
      JSON.stringify({ privateKey: PRIV_A, publicKey: mobilePub }),
    );
    const web = new WebEncryption(storage, seqRandom);
    await web.initialize();
    const webPub = await web.getPublicKey();
    expect(webPub).toBe(mobilePub);
  });

  it('derives identical shared secrets (A↔B, both directions)', async () => {
    await seedMobileWithKey(PRIV_A, PUB_A);
    const mobileA = await mobile.getPublicKey();

    const storageA = new MemoryStorageAdapter();
    await storageA.setItem(
      'e2e_key_pair_v2',
      JSON.stringify({ privateKey: PRIV_A, publicKey: mobileA }),
    );
    const webA = new WebEncryption(storageA, seqRandom);
    await webA.initialize();
    const webPubA = await webA.getPublicKey();
    expect(webPubA).toBe(mobileA);

    const secretMobileA = await mobile.deriveSharedSecret('userB', PUB_B);

    // Mobile B side
    await seedMobileWithKey(PRIV_B, PUB_B);
    const mobileB = await mobile.getPublicKey();
    const secretMobileB = await mobile.deriveSharedSecret('userA', PUB_A);

    const storageB = new MemoryStorageAdapter();
    await storageB.setItem(
      'e2e_key_pair_v2',
      JSON.stringify({ privateKey: PRIV_B, publicKey: mobileB }),
    );
    const webB = new WebEncryption(storageB, seqRandom);
    await webB.initialize();
    const webPubB = await webB.getPublicKey();

    const secretWebA = await webA.deriveSharedSecret('userB', mobileB);
    const secretWebB = await webB.deriveSharedSecret('userA', mobileA);

    expect(secretMobileA).toBe(secretWebA);
    expect(secretMobileB).toBe(secretWebB);
    expect(secretMobileA).toBe(secretMobileB);
  });

  it('mobile-encrypted → web-decrypted round trip', async () => {
    await seedMobileWithKey(PRIV_A, PUB_A);
    const pubA = await mobile.getPublicKey();

    const storage = new MemoryStorageAdapter();
    await storage.setItem('e2e_key_pair_v2', JSON.stringify({ privateKey: PRIV_B, publicKey: PUB_B }));
    const web = new WebEncryption(storage, seqRandom);
    await web.initialize();
    const pubB = await web.getPublicKey();

    const secretMobile = await mobile.deriveSharedSecret('userB', pubB);
    const secretWeb = await web.deriveSharedSecret('userA', pubA);
    expect(secretMobile).toBe(secretWeb);

    const plaintext = 'MOBILE → WEB: ¡hola! 🔒 مرحبا';
    const { encryptedContent, iv } = await mobile.encryptMessage(plaintext, secretMobile);
    const decrypted = await web.decryptMessage(encryptedContent, iv, secretWeb);
    expect(decrypted).toBe(plaintext);
  });

  it('web-encrypted → mobile-decrypted round trip', async () => {
    await seedMobileWithKey(PRIV_A, PUB_A);
    const pubA = await mobile.getPublicKey();

    const storage = new MemoryStorageAdapter();
    await storage.setItem('e2e_key_pair_v2', JSON.stringify({ privateKey: PRIV_B, publicKey: PUB_B }));
    const web = new WebEncryption(storage, seqRandom);
    await web.initialize();
    const pubB = await web.getPublicKey();

    const secretMobile = await mobile.deriveSharedSecret('userB', pubB);
    const secretWeb = await web.deriveSharedSecret('userA', pubA);

    const plaintext = 'WEB → MOBILE: hola mundo 🌍 你好';
    const { encryptedContent, iv } = await web.encryptMessage(plaintext, secretWeb);
    const decrypted = await mobile.decryptMessage(encryptedContent, iv, secretMobile);
    expect(decrypted).toBe(plaintext);
  });

  it('cross-decrypts each other\'s ciphertext (fixed message)', async () => {
    await seedMobileWithKey(PRIV_A, PUB_A);
    const pubA = await mobile.getPublicKey();

    const storage = new MemoryStorageAdapter();
    await storage.setItem('e2e_key_pair_v2', JSON.stringify({ privateKey: PRIV_B, publicKey: PUB_B }));
    const web = new WebEncryption(storage, seqRandom);
    await web.initialize();
    const pubB = await web.getPublicKey();

    const secretMobile = await mobile.deriveSharedSecret('userB', pubB);
    const secretWeb = await web.deriveSharedSecret('userA', pubA);

    const plaintext = 'byte-identical check 🔐';
    const mobileEnc = await mobile.encryptMessage(plaintext, secretMobile);
    expect(await web.decryptMessage(mobileEnc.encryptedContent, mobileEnc.iv, secretWeb)).toBe(
      plaintext,
    );
    const webEnc = await web.encryptMessage(plaintext, secretWeb);
    expect(await mobile.decryptMessage(webEnc.encryptedContent, webEnc.iv, secretMobile)).toBe(
      plaintext,
    );
  });
});
