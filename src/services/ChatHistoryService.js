/**
 * Chat History Service
 * Handles local-only persistence of chat messages.
 * 
 * DM messages: Encrypted at rest using the user's local key pair.
 * Room messages: Stored in plaintext (not E2E encrypted by design).
 * 
 * Privacy model:
 * - Disabled by default (ephemeral mode)
 * - User must explicitly enable via Settings
 * - Individual conversations can be marked as "temporary"
 * - All data is wiped on logout
 * - DM content is encrypted before writing to AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const HISTORY_ENABLED_KEY = 'chat_history_enabled';
const TEMPORARY_CONVOS_KEY = 'chat_history_temporary_convos';
const DM_HISTORY_PREFIX = 'chat_history_dm_';
const ROOM_HISTORY_PREFIX = 'chat_history_room_';
const MAX_MESSAGES_PER_CONVERSATION = 500;
const LOCAL_ENCRYPTION_KEY = 'chat_history_local_key';

class ChatHistoryService {
    constructor() {
        this._cachedEnabled = null;
        this._cachedTemporary = null;
        this._currentUserId = null;
        this._localKey = null;
    }

    /**
     * Set the current user ID (must be called before using the service)
     */
    setUserId(userId) {
        if (this._currentUserId !== userId) {
            this._currentUserId = userId;
            this._cachedEnabled = null;
            this._cachedTemporary = null;
            this._localKey = null;
        }
    }

    // ─── Local Encryption Key ──────────────────────────────────

    /**
     * Get or generate a local encryption key for encrypting DM history at rest.
     * This key is unique per user and stored in AsyncStorage.
     */
    async _getLocalKey() {
        if (this._localKey) return this._localKey;
        try {
            const storageKey = `${LOCAL_ENCRYPTION_KEY}_${this._currentUserId}`;
            let key = await AsyncStorage.getItem(storageKey);
            if (!key) {
                // Generate a random 256-bit key and store it
                const randomBytes = new Uint8Array(32);
                crypto.getRandomValues(randomBytes);
                const rawHex = Array.from(randomBytes)
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('');
                key = await Crypto.digestStringAsync(
                    Crypto.CryptoDigestAlgorithm.SHA256,
                    rawHex + this._currentUserId
                );
                await AsyncStorage.setItem(storageKey, key);
            }
            this._localKey = key;
            return key;
        } catch (error) {
            console.error('Error getting local encryption key:', error);
            return null;
        }
    }

    /**
     * Encrypt a string using XOR cipher with the local key + IV
     */
    async _encryptString(plaintext) {
        try {
            const key = await this._getLocalKey();
            if (!key) return plaintext;

            // Generate random IV
            const ivBytes = new Uint8Array(16);
            crypto.getRandomValues(ivBytes);
            const iv = Array.from(ivBytes)
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');

            // Derive key material from key + IV
            const keyMaterial = await Crypto.digestStringAsync(
                Crypto.CryptoDigestAlgorithm.SHA256,
                key + iv
            );

            // Encode plaintext to bytes
            const encoder = new TextEncoder();
            const plaintextBytes = encoder.encode(plaintext);

            // XOR encrypt
            const encryptedBytes = new Uint8Array(plaintextBytes.length);
            for (let i = 0; i < plaintextBytes.length; i++) {
                const keyByte = parseInt(keyMaterial.substring((i * 2) % 64, (i * 2) % 64 + 2), 16);
                encryptedBytes[i] = plaintextBytes[i] ^ keyByte;
            }

            // Encode to base64
            let binary = '';
            for (let i = 0; i < encryptedBytes.length; i++) {
                binary += String.fromCharCode(encryptedBytes[i]);
            }
            const encryptedBase64 = btoa(binary);

            return JSON.stringify({ iv, data: encryptedBase64 });
        } catch (error) {
            console.error('Error encrypting string:', error);
            return plaintext;
        }
    }

    /**
     * Decrypt a string encrypted with _encryptString
     */
    async _decryptString(encryptedPayload) {
        try {
            const key = await this._getLocalKey();
            if (!key) return encryptedPayload;

            let parsed;
            try {
                parsed = JSON.parse(encryptedPayload);
            } catch {
                // Not encrypted (legacy or room data), return as-is
                return encryptedPayload;
            }

            if (!parsed.iv || !parsed.data) return encryptedPayload;

            const { iv, data } = parsed;

            // Derive same key material
            const keyMaterial = await Crypto.digestStringAsync(
                Crypto.CryptoDigestAlgorithm.SHA256,
                key + iv
            );

            // Decode base64
            const binaryStr = atob(data);
            const encryptedBytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) {
                encryptedBytes[i] = binaryStr.charCodeAt(i);
            }

            // XOR decrypt
            const decryptedBytes = new Uint8Array(encryptedBytes.length);
            for (let i = 0; i < encryptedBytes.length; i++) {
                const keyByte = parseInt(keyMaterial.substring((i * 2) % 64, (i * 2) % 64 + 2), 16);
                decryptedBytes[i] = encryptedBytes[i] ^ keyByte;
            }

            const decoder = new TextDecoder();
            return decoder.decode(decryptedBytes);
        } catch (error) {
            console.error('Error decrypting string:', error);
            return '[Error decrypting history]';
        }
    }

    // ─── Storage Key Helpers ───────────────────────────────────

    _getDmKey(conversationId) {
        return `${DM_HISTORY_PREFIX}${this._currentUserId}_${conversationId}`;
    }

    _getRoomKey(roomId) {
        return `${ROOM_HISTORY_PREFIX}${this._currentUserId}_${roomId}`;
    }

    // ─── Global History Toggle ─────────────────────────────────

    async isHistoryEnabled() {
        if (this._cachedEnabled !== null) return this._cachedEnabled;
        try {
            const value = await AsyncStorage.getItem(HISTORY_ENABLED_KEY);
            this._cachedEnabled = value === 'true';
            return this._cachedEnabled;
        } catch (error) {
            console.error('Error reading history setting:', error);
            return false;
        }
    }

    async setHistoryEnabled(enabled) {
        try {
            await AsyncStorage.setItem(HISTORY_ENABLED_KEY, String(enabled));
            this._cachedEnabled = enabled;
            return true;
        } catch (error) {
            console.error('Error saving history setting:', error);
            return false;
        }
    }

    // ─── Temporary Conversations ───────────────────────────────

    async _getTemporaryConvos() {
        if (this._cachedTemporary !== null) return this._cachedTemporary;
        try {
            const data = await AsyncStorage.getItem(TEMPORARY_CONVOS_KEY);
            this._cachedTemporary = data ? new Set(JSON.parse(data)) : new Set();
            return this._cachedTemporary;
        } catch (error) {
            console.error('Error reading temporary convos:', error);
            this._cachedTemporary = new Set();
            return this._cachedTemporary;
        }
    }

    async isConversationTemporary(conversationId) {
        const tempConvos = await this._getTemporaryConvos();
        return tempConvos.has(conversationId);
    }

    async setConversationTemporary(conversationId, isTemporary) {
        try {
            const tempConvos = await this._getTemporaryConvos();
            if (isTemporary) {
                tempConvos.add(conversationId);
                await this.deleteConversationHistory(conversationId);
            } else {
                tempConvos.delete(conversationId);
            }
            this._cachedTemporary = tempConvos;
            await AsyncStorage.setItem(
                TEMPORARY_CONVOS_KEY,
                JSON.stringify([...tempConvos])
            );
            return true;
        } catch (error) {
            console.error('Error setting temporary conversation:', error);
            return false;
        }
    }

    // ─── Persistence Check ─────────────────────────────────────

    async shouldPersist(conversationId) {
        const enabled = await this.isHistoryEnabled();
        if (!enabled) return false;
        const isTemp = await this.isConversationTemporary(conversationId);
        return !isTemp;
    }

    // ─── DM Messages (Encrypted at Rest) ──────────────────────

    /**
     * Save DM messages — content is encrypted before writing
     */
    async saveDmMessages(conversationId, messages) {
        try {
            if (!await this.shouldPersist(conversationId)) return false;
            if (!this._currentUserId) return false;

            const toSave = messages.slice(-MAX_MESSAGES_PER_CONVERSATION);
            const cleaned = toSave.map(msg => ({
                id: msg.id,
                senderId: msg.senderId,
                recipientId: msg.recipientId,
                content: msg.content,
                timestamp: msg.timestamp,
            }));

            // Encrypt the entire message array as JSON
            const plainJson = JSON.stringify(cleaned);
            const encrypted = await this._encryptString(plainJson);

            const key = this._getDmKey(conversationId);
            await AsyncStorage.setItem(key, encrypted);
            return true;
        } catch (error) {
            console.error('Error saving DM messages:', error);
            return false;
        }
    }

    /**
     * Load DM messages — decrypts from storage
     */
    async loadDmMessages(conversationId) {
        try {
            if (!this._currentUserId) return [];
            const key = this._getDmKey(conversationId);
            const raw = await AsyncStorage.getItem(key);
            if (!raw) return [];

            const decryptedJson = await this._decryptString(raw);
            return JSON.parse(decryptedJson);
        } catch (error) {
            console.error('Error loading DM messages:', error);
            return [];
        }
    }

    /**
     * Append new DM messages to existing history (encrypted)
     */
    async appendDmMessages(conversationId, newMessages) {
        try {
            if (!await this.shouldPersist(conversationId)) return false;
            if (!this._currentUserId || newMessages.length === 0) return false;

            const existing = await this.loadDmMessages(conversationId);
            const existingIds = new Set(existing.map(m => m.id));
            const unique = newMessages.filter(m => !existingIds.has(m.id));
            if (unique.length === 0) return true;

            const merged = [...existing, ...unique].slice(-MAX_MESSAGES_PER_CONVERSATION);
            // Re-encrypt the merged result
            const plainJson = JSON.stringify(merged);
            const encrypted = await this._encryptString(plainJson);
            const key = this._getDmKey(conversationId);
            await AsyncStorage.setItem(key, encrypted);
            return true;
        } catch (error) {
            console.error('Error appending DM messages:', error);
            return false;
        }
    }

    /**
     * Get last DM message (for conversation list preview)
     */
    async getLastDmMessage(conversationId) {
        try {
            const messages = await this.loadDmMessages(conversationId);
            return messages.length > 0 ? messages[messages.length - 1] : null;
        } catch (error) {
            console.error('Error getting last DM message:', error);
            return null;
        }
    }

    // ─── Room Messages (Plaintext) ─────────────────────────────

    /**
     * Save room messages — stored in plaintext
     */
    async saveRoomMessages(roomId, messages) {
        try {
            if (!await this.isHistoryEnabled()) return false;
            if (!this._currentUserId) return false;

            const toSave = messages.slice(-MAX_MESSAGES_PER_CONVERSATION);
            const cleaned = toSave
                .filter(msg => !msg.isSystem) // Don't save system messages
                .map(msg => ({
                    id: msg.id,
                    username: msg.username,
                    content: msg.content,
                    timestamp: msg.timestamp,
                }));

            const key = this._getRoomKey(roomId);
            await AsyncStorage.setItem(key, JSON.stringify(cleaned));
            return true;
        } catch (error) {
            console.error('Error saving room messages:', error);
            return false;
        }
    }

    /**
     * Load room messages from storage
     */
    async loadRoomMessages(roomId) {
        try {
            if (!this._currentUserId) return [];
            const key = this._getRoomKey(roomId);
            const data = await AsyncStorage.getItem(key);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error loading room messages:', error);
            return [];
        }
    }

    /**
     * Append new room messages
     */
    async appendRoomMessages(roomId, newMessages) {
        try {
            if (!await this.isHistoryEnabled()) return false;
            if (!this._currentUserId || newMessages.length === 0) return false;

            // Filter out system messages
            const userMessages = newMessages.filter(m => !m.isSystem);
            if (userMessages.length === 0) return true;

            const existing = await this.loadRoomMessages(roomId);
            const existingIds = new Set(existing.map(m => m.id));
            const unique = userMessages.filter(m => !existingIds.has(m.id));
            if (unique.length === 0) return true;

            const merged = [...existing, ...unique].slice(-MAX_MESSAGES_PER_CONVERSATION);
            const key = this._getRoomKey(roomId);
            await AsyncStorage.setItem(key, JSON.stringify(merged));
            return true;
        } catch (error) {
            console.error('Error appending room messages:', error);
            return false;
        }
    }

    // ─── Shared Operations ─────────────────────────────────────

    /**
     * Delete history for a specific conversation (DM or room)
     */
    async deleteConversationHistory(conversationId) {
        try {
            if (!this._currentUserId) return false;
            // Try both DM and room keys
            await AsyncStorage.removeItem(this._getDmKey(conversationId));
            await AsyncStorage.removeItem(this._getRoomKey(conversationId));
            return true;
        } catch (error) {
            console.error('Error deleting conversation history:', error);
            return false;
        }
    }

    /**
     * Delete ALL chat history for the current user
     */
    async clearAllHistory() {
        try {
            const allKeys = await AsyncStorage.getAllKeys();
            const historyKeys = allKeys.filter(key =>
                key.startsWith(DM_HISTORY_PREFIX) ||
                key.startsWith(ROOM_HISTORY_PREFIX) ||
                key.startsWith(LOCAL_ENCRYPTION_KEY)
            );

            if (historyKeys.length > 0) {
                await AsyncStorage.multiRemove(historyKeys);
            }

            await AsyncStorage.removeItem(TEMPORARY_CONVOS_KEY);
            await AsyncStorage.removeItem(HISTORY_ENABLED_KEY);

            this._cachedEnabled = null;
            this._cachedTemporary = null;
            this._localKey = null;

            console.log(`Cleared ${historyKeys.length} chat history entries`);
            return true;
        } catch (error) {
            console.error('Error clearing all history:', error);
            return false;
        }
    }
}

export default new ChatHistoryService();
