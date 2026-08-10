/**
 * End-to-End Encryption Service — port of `src/services/EncryptionService.js`.
 *
 * Diffie-Hellman Key Exchange (RFC 3526 Group 14, 2048-bit) + XOR cipher.
 * MUST remain byte-identical to the mobile implementation so web ⇄ mobile
 * messages can be decrypted cross-device (spec: docs/WEB-ARCHITECTURE.md §5.2).
 *
 * Differences from mobile (equivalent, not a scheme change):
 * - SHA-256 via WebCrypto `crypto.subtle.digest` instead of expo-crypto
 *   `digestStringAsync` (both are SHA-256 over the UTF-8 bytes of the input).
 * - Key storage via the platform-neutral StorageAdapter (localStorage on web).
 */

import type { StorageAdapter } from '../storage/StorageAdapter';
import {
  LocalStorageAdapter,
  STORAGE_KEYS,
} from '../storage/StorageAdapter';

// RFC 3526 Group 14 (2048-bit) - Standard Safe Prime for Diffie-Hellman
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
const G = 2n;
const P = BigInt('0x' + P_HEX);

/** SHA-256 of the UTF-8 bytes of `input`, hex-encoded (WebCrypto). */
export const sha256Hex = async (input: string): Promise<string> => {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

export type RandomSource = (size: number) => Uint8Array;

const defaultRandom: RandomSource = (size) => {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return bytes;
};

export interface KeyPair {
  privateKey: string;
  publicKey: string;
}

export interface EncryptedPayload {
  encryptedContent: string;
  iv: string;
}

interface CachedSecret {
  secret: string;
  publicKey: string;
}

export class EncryptionService {
  private keyPair: KeyPair | null = null;
  /** userId -> shared secret (with the public key it was derived from). */
  private readonly sharedSecrets = new Map<string, CachedSecret>();
  private readonly storage: StorageAdapter;
  private readonly randomSource: RandomSource;

  constructor(storage: StorageAdapter = new LocalStorageAdapter(), randomSource = defaultRandom) {
    this.storage = storage;
    this.randomSource = randomSource;
  }

  /**
   * Helper: Modular Exponentiation (base^exp % mod)
   */
  modPow(base: bigint, exp: bigint, mod: bigint): bigint {
    let res = 1n;
    let b = base % mod;
    let e = exp;
    while (e > 0n) {
      if (e % 2n === 1n) res = (res * b) % mod;
      b = (b * b) % mod;
      e /= 2n;
    }
    return res;
  }

  /**
   * Initialize encryption service (loads or generates the key pair).
   */
  async initialize(): Promise<boolean> {
    try {
      const stored = await this.storage.getItem(STORAGE_KEYS.e2eKeyPair);
      if (stored) {
        this.keyPair = JSON.parse(stored) as KeyPair;
      } else {
        await this.generateKeyPair();
      }
      return true;
    } catch (error) {
      console.error('Error initializing encryption:', error);
      await this.generateKeyPair();
      return true;
    }
  }

  /**
   * Generate key pair using Diffie-Hellman (private = 32 random bytes).
   */
  async generateKeyPair(): Promise<KeyPair> {
    try {
      const privateKeyBytes = this.randomSource(32);
      const privateKeyHex = Array.from(privateKeyBytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      const privateKey = BigInt('0x' + privateKeyHex);

      const publicKey = this.modPow(G, privateKey, P);

      this.keyPair = {
        privateKey: privateKeyHex,
        publicKey: publicKey.toString(16),
      };

      await this.storage.setItem(STORAGE_KEYS.e2eKeyPair, JSON.stringify(this.keyPair));
      await this.storage.setItem(STORAGE_KEYS.e2ePublicKey, this.keyPair.publicKey);

      return this.keyPair;
    } catch (error) {
      console.error('Error generating key pair:', error);
      throw error;
    }
  }

  /**
   * Get public key (hex string).
   */
  async getPublicKey(): Promise<string> {
    if (!this.keyPair) {
      await this.initialize();
    }
    return this.keyPair!.publicKey;
  }

  /**
   * Derive shared secret using Diffie-Hellman + SHA-256.
   */
  async deriveSharedSecret(otherUserId: string, otherPublicKeyHex: string): Promise<string> {
    try {
      if (!this.keyPair) {
        await this.initialize();
      }

      const cached = this.sharedSecrets.get(otherUserId);
      if (cached) {
        if (cached.publicKey === otherPublicKeyHex) {
          return cached.secret;
        }
        console.log(`Public key changed for user ${otherUserId}, deriving new secret`);
      }

      if (!otherPublicKeyHex) {
        throw new Error('Recipient public key is missing');
      }

      let otherPublicKey: bigint;
      try {
        const cleanHex = otherPublicKeyHex.startsWith('0x')
          ? otherPublicKeyHex.slice(2)
          : otherPublicKeyHex;
        otherPublicKey = BigInt('0x' + cleanHex);
      } catch (e) {
        console.error('Invalid public key format:', otherPublicKeyHex);
        throw new Error('Invalid public key format');
      }

      const privateKey = BigInt('0x' + this.keyPair!.privateKey);
      const secretBigInt = this.modPow(otherPublicKey, privateKey, P);

      // Hash the decimal-agnostic hex string (identical to mobile).
      const sharedSecret = await sha256Hex(secretBigInt.toString(16));

      this.sharedSecrets.set(otherUserId, {
        secret: sharedSecret,
        publicKey: otherPublicKeyHex,
      });

      return sharedSecret;
    } catch (error) {
      console.error('Error deriving shared secret:', error);
      throw error;
    }
  }

  /**
   * Encrypt message using XOR cipher with shared secret.
   */
  async encryptMessage(plaintext: string, sharedSecret: string): Promise<EncryptedPayload> {
    try {
      const ivBytes = this.randomSource(16);
      const ivBase64 = this.arrayBufferToBase64(ivBytes);

      const keyMaterial = await sha256Hex(sharedSecret + ivBase64);

      const plaintextBytes = new TextEncoder().encode(plaintext);

      const encryptedBytes = new Uint8Array(plaintextBytes.length);
      for (let i = 0; i < plaintextBytes.length; i++) {
        const keyByte = parseInt(
          keyMaterial.substring((i * 2) % 64, (i * 2) % 64 + 2),
          16,
        );
        encryptedBytes[i] = plaintextBytes[i] ^ keyByte;
      }

      return {
        encryptedContent: this.arrayBufferToBase64(encryptedBytes),
        iv: ivBase64,
      };
    } catch (error) {
      console.error('Error encrypting message:', error);
      throw error;
    }
  }

  /**
   * Decrypt message using XOR cipher (same operation as encryption).
   * Returns the encrypted content marker on failure — identical behavior
   * to the mobile implementation.
   */
  async decryptMessage(
    encryptedContent: string,
    iv: string,
    sharedSecret: string,
  ): Promise<string> {
    try {
      const keyMaterial = await sha256Hex(sharedSecret + iv);

      const encryptedBytes = this.base64ToUint8Array(encryptedContent);

      const decryptedBytes = new Uint8Array(encryptedBytes.length);
      for (let i = 0; i < encryptedBytes.length; i++) {
        const keyByte = parseInt(
          keyMaterial.substring((i * 2) % 64, (i * 2) % 64 + 2),
          16,
        );
        decryptedBytes[i] = encryptedBytes[i] ^ keyByte;
      }

      return new TextDecoder().decode(decryptedBytes);
    } catch (error) {
      console.error('Error decrypting message:', error);
      return `[Error descifrando: ${(error as Error).message}]`;
    }
  }

  /** Uint8Array -> base64. */
  arrayBufferToBase64(buffer: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < buffer.byteLength; i++) {
      binary += String.fromCharCode(buffer[i]);
    }
    return btoa(binary);
  }

  /** base64 -> Uint8Array. */
  base64ToUint8Array(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Clear all encryption data.
   */
  async clearKeys(): Promise<void> {
    this.keyPair = null;
    this.sharedSecrets.clear();
    await this.storage.removeItem(STORAGE_KEYS.e2eKeyPair);
    await this.storage.removeItem(STORAGE_KEYS.e2ePublicKey);
  }
}

export default new EncryptionService();
