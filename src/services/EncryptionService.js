/**
 * End-to-End Encryption Service for React Native
 * Implements Diffie-Hellman Key Exchange (Group 14) and XOR cipher
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import 'react-native-get-random-values';

const KEY_PAIR_STORAGE_KEY = 'e2e_key_pair_v2'; // Changed key to force new generation
const PUBLIC_KEY_STORAGE_KEY = 'e2e_public_key_v2';

// RFC 3526 Group 14 (2048-bit) - Standard Safe Prime for Diffie-Hellman
const P_HEX = 'FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD1' +
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

class EncryptionService {
    constructor() {
        this.keyPair = null;
        this.sharedSecrets = new Map(); // userId -> sharedSecret
    }

    /**
     * Helper: Modular Exponentiation (base^exp % mod)
     */
    modPow(base, exp, mod) {
        let res = 1n;
        base = base % mod;
        while (exp > 0n) {
            if (exp % 2n === 1n) res = (res * base) % mod;
            base = (base * base) % mod;
            exp /= 2n;
        }
        return res;
    }

    /**
     * Initialize encryption service
     */
    async initialize() {
        try {
            const stored = await AsyncStorage.getItem(KEY_PAIR_STORAGE_KEY);

            if (stored) {
                this.keyPair = JSON.parse(stored);
                console.log('Loaded existing encryption key pair');
            } else {
                await this.generateKeyPair();
                console.log('Generated new encryption key pair');
            }

            return true;
        } catch (error) {
            console.error('Error initializing encryption:', error);
            // Fallback: generate new keys if storage fails or format is wrong
            await this.generateKeyPair();
            return true;
        }
    }

    /**
     * Generate key pair using Diffie-Hellman
     */
    async generateKeyPair() {
        try {
            // Generate private key (random 32 bytes -> 256 bits)
            const privateKeyBytes = new Uint8Array(32);
            crypto.getRandomValues(privateKeyBytes);

            // Convert to Hex String for storage/BigInt creation
            const privateKeyHex = Array.from(privateKeyBytes)
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');

            const privateKey = BigInt('0x' + privateKeyHex);

            // Calculate Public Key: g^privateKey % p
            const publicKey = this.modPow(G, privateKey, P);

            // Store as Hex Strings
            this.keyPair = {
                privateKey: privateKeyHex,
                publicKey: publicKey.toString(16) // Send as Hex string
            };

            await AsyncStorage.setItem(KEY_PAIR_STORAGE_KEY, JSON.stringify(this.keyPair));
            await AsyncStorage.setItem(PUBLIC_KEY_STORAGE_KEY, this.keyPair.publicKey);

            return this.keyPair;
        } catch (error) {
            console.error('Error generating key pair:', error);
            throw error;
        }
    }

    /**
     * Get public key
     */
    async getPublicKey() {
        if (!this.keyPair) {
            await this.initialize();
        }
        return this.keyPair.publicKey;
    }

    /**
     * Derive shared secret using Diffie-Hellman
     */
    async deriveSharedSecret(otherUserId, otherPublicKeyHex) {
        try {
            if (!this.keyPair) {
                await this.initialize();
            }

            // Check if we already have it
            if (this.sharedSecrets.has(otherUserId)) {
                const cached = this.sharedSecrets.get(otherUserId);
                // Only return cached secret if the public key matches
                if (cached.publicKey === otherPublicKeyHex) {
                    return cached.secret;
                }
                console.log(`Public key changed for user ${otherUserId}, deriving new secret`);
            }

            if (!otherPublicKeyHex) {
                throw new Error('Recipient public key is missing');
            }

            // Convert Hex strings to BigInt
            // Handle massive numbers carefully
            let otherPublicKey;
            try {
                // Try to handle optional "0x" prefix
                const cleanHex = otherPublicKeyHex.startsWith('0x') ? otherPublicKeyHex.slice(2) : otherPublicKeyHex;
                otherPublicKey = BigInt('0x' + cleanHex);
            } catch (e) {
                console.error("Invalid public key format:", otherPublicKeyHex);
                throw new Error("Invalid public key format");
            }

            const privateKey = BigInt('0x' + this.keyPair.privateKey);

            // Calculate Secret: otherPublic^privateKey % p
            const secretBigInt = this.modPow(otherPublicKey, privateKey, P);

            // Hash the secret to get a usable encryption key (SHA256)
            // We convert BigInt to string (hex) for hashing
            const sharedSecret = await Crypto.digestStringAsync(
                Crypto.CryptoDigestAlgorithm.SHA256,
                secretBigInt.toString(16)
            );

            // Store secret AND the public key used to derive it
            this.sharedSecrets.set(otherUserId, {
                secret: sharedSecret,
                publicKey: otherPublicKeyHex
            });

            console.log(`Derived shared secret with user ${otherUserId.substring(0, 12)}...`);
            return sharedSecret;
        } catch (error) {
            console.error('Error deriving shared secret:', error);
            throw error;
        }
    }

    /**
     * Encrypt message using XOR cipher with shared secret
     */
    async encryptMessage(plaintext, sharedSecret) {
        try {
            // Generate random IV
            const iv = new Uint8Array(16);
            crypto.getRandomValues(iv);
            const ivBase64 = this.arrayBufferToBase64(iv);

            // Create encryption key from shared secret + IV
            const keyMaterial = await Crypto.digestStringAsync(
                Crypto.CryptoDigestAlgorithm.SHA256,
                sharedSecret + ivBase64
            );

            // Convert plaintext to bytes
            let plaintextBytes;
            if (typeof TextEncoder !== 'undefined') {
                const textEncoder = new TextEncoder();
                plaintextBytes = textEncoder.encode(plaintext);
            } else {
                // Fallback
                plaintextBytes = new Uint8Array(plaintext.length);
                for (let i = 0; i < plaintext.length; i++) {
                    plaintextBytes[i] = plaintext.charCodeAt(i);
                }
            }

            // Encrypt using XOR
            const encryptedBytes = new Uint8Array(plaintextBytes.length);
            for (let i = 0; i < plaintextBytes.length; i++) {
                // Use key material bytes (hex to int)
                const keyByte = parseInt(keyMaterial.substring((i * 2) % 64, (i * 2) % 64 + 2), 16);
                encryptedBytes[i] = plaintextBytes[i] ^ keyByte;
            }

            const encryptedContent = this.arrayBufferToBase64(encryptedBytes);

            return {
                encryptedContent,
                iv: ivBase64
            };
        } catch (error) {
            console.error('Error encrypting message:', error);
            throw error;
        }
    }

    /**
     * Decrypt message using XOR cipher
     */
    async decryptMessage(encryptedContent, iv, sharedSecret) {
        try {
            // Create same encryption key from shared secret + IV
            const keyMaterial = await Crypto.digestStringAsync(
                Crypto.CryptoDigestAlgorithm.SHA256,
                sharedSecret + iv
            );

            // Decode encrypted content
            const encryptedBytes = this.base64ToUint8Array(encryptedContent);

            // Decrypt using XOR (same operation as encryption)
            const decryptedBytes = new Uint8Array(encryptedBytes.length);
            for (let i = 0; i < encryptedBytes.length; i++) {
                const keyByte = parseInt(keyMaterial.substring((i * 2) % 64, (i * 2) % 64 + 2), 16);
                decryptedBytes[i] = encryptedBytes[i] ^ keyByte;
            }

            // Convert bytes to text
            if (typeof TextDecoder !== 'undefined') {
                const textDecoder = new TextDecoder();
                return textDecoder.decode(decryptedBytes);
            } else {
                // Fallback
                let result = "";
                for (let i = 0; i < decryptedBytes.length; i++) {
                    result += String.fromCharCode(decryptedBytes[i]);
                }
                return result;
            }
        } catch (error) {
            console.error('Error decrypting message:', error);
            // Return encrypted content if decryption fails with error detail
            return `[Error descifrando: ${error.message}]`;
        }
    }

    /**
     * Convert ArrayBuffer to Base64
     */
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    /**
     * Convert Base64 to Uint8Array
     */
    base64ToUint8Array(base64) {
        // Handle potential invalid base64 chars slightly better if needed, but atob handles standard
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }

    /**
     * Clear all encryption data
     */
    async clearKeys() {
        this.keyPair = null;
        this.sharedSecrets.clear();
        await AsyncStorage.removeItem(KEY_PAIR_STORAGE_KEY);
        await AsyncStorage.removeItem(PUBLIC_KEY_STORAGE_KEY);
        console.log('Cleared all encryption keys');
    }
}

export default new EncryptionService();
