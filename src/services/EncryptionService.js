/**
 * End-to-End Encryption Service for React Native
 * Simple but functional encryption using XOR cipher with shared secret
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import 'react-native-get-random-values';

const KEY_PAIR_STORAGE_KEY = 'e2e_key_pair';
const PUBLIC_KEY_STORAGE_KEY = 'e2e_public_key';

class EncryptionService {
    constructor() {
        this.keyPair = null;
        this.sharedSecrets = new Map(); // userId -> sharedSecret
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
            throw error;
        }
    }

    /**
     * Generate key pair
     */
    async generateKeyPair() {
        try {
            const privateKeyBytes = new Uint8Array(32);
            crypto.getRandomValues(privateKeyBytes);

            const privateKey = this.arrayBufferToBase64(privateKeyBytes);

            const publicKeyDigest = await Crypto.digestStringAsync(
                Crypto.CryptoDigestAlgorithm.SHA256,
                privateKey
            );

            this.keyPair = {
                privateKey,
                publicKey: publicKeyDigest
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
     * Derive shared secret
     */
    async deriveSharedSecret(otherUserId, otherPublicKey) {
        try {
            if (!this.keyPair) {
                await this.initialize();
            }

            if (this.sharedSecrets.has(otherUserId)) {
                return this.sharedSecrets.get(otherUserId);
            }

            const combined = `${this.keyPair.privateKey}:${otherPublicKey}`;
            const sharedSecret = await Crypto.digestStringAsync(
                Crypto.CryptoDigestAlgorithm.SHA256,
                combined
            );

            this.sharedSecrets.set(otherUserId, sharedSecret);

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
            const textEncoder = new TextEncoder();
            const plaintextBytes = textEncoder.encode(plaintext);

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
            const textDecoder = new TextDecoder();
            const plaintext = textDecoder.decode(decryptedBytes);

            return plaintext;
        } catch (error) {
            console.error('Error decrypting message:', error);
            // Return encrypted content if decryption fails
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
