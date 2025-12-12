/**
 * Direct Message Service for React Native
 * Handles encrypted 1-to-1 conversations
 */

import EncryptionService from './EncryptionService';

class DirectMessageService {
    constructor() {
        this.ws = null;
        this.conversationId = null;
        this.userId = null;
        this.username = null;
        this.recipientId = null;
        this.recipientPublicKey = null;
        this.listeners = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.messageCache = []; // Decrypted messages cache
    }

    /**
     * Connect to a direct message conversation
     */
    async connect(conversationId, userId, username, recipientId, workerUrl) {
        this.conversationId = conversationId;
        this.userId = userId;
        this.username = username;
        this.recipientId = recipientId;

        // Initialize encryption
        await EncryptionService.initialize();
        const publicKey = await EncryptionService.getPublicKey();

        // Determine WebSocket URL
        const wsUrl = workerUrl.replace('http://', 'ws://').replace('https://', 'wss://');
        const url = `${wsUrl}/api/dm/${conversationId}`;

        console.log('Connecting to DM:', url);

        // Create WebSocket connection
        this.ws = new WebSocket(url);

        // Event handlers
        this.ws.onopen = async () => {
            console.log('✅ Connected to DM conversation:', conversationId);
            this.reconnectAttempts = 0;

            // Send join message with public key
            this.send('join', {
                userId: this.userId,
                username: this.username,
                publicKey: publicKey
            });

            this.emit('connected', { conversationId });
        };

        this.ws.onmessage = async (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('📨 Received DM:', data.type);

                await this.handleIncomingMessage(data);
            } catch (error) {
                console.error('Error parsing DM:', error);
            }
        };

        this.ws.onerror = (error) => {
            console.error('❌ DM WebSocket error:', error);
            this.emit('error', error);
        };

        this.ws.onclose = (event) => {
            console.log('🔌 Disconnected from DM. Code:', event.code);
            this.emit('disconnected', { code: event.code, reason: event.reason });

            // Attempt to reconnect
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                console.log(`Reconnecting to DM... (attempt ${this.reconnectAttempts})`);
                setTimeout(() => {
                    this.connect(conversationId, userId, username, recipientId, workerUrl);
                }, 2000 * this.reconnectAttempts);
            }
        };
    }

    /**
     * Handle incoming messages
     */
    async handleIncomingMessage(data) {
        switch (data.type) {
            case 'history':
                await this.handleHistory(data.messages);
                break;

            case 'encrypted_message':
                await this.handleEncryptedMessage(data);
                break;

            case 'user_joined':
                this.handleUserJoined(data);
                break;

            case 'user_left':
                this.emit('user_left', data);
                break;

            case 'typing':
                this.emit('typing', data);
                break;

            case 'key_exchanged':
                this.handleKeyExchanged(data);
                break;

            default:
                console.log('Unknown DM type:', data.type);
        }
    }

    /**
     * Handle message history
     */
    async handleHistory(messages) {
        console.log('Received DM history:', messages.length, 'messages');

        // Decrypt all messages
        const decryptedMessages = [];

        for (const msg of messages) {
            try {
                const decrypted = await this.decryptIncomingMessage(msg);
                if (decrypted) {
                    decryptedMessages.push(decrypted);
                }
            } catch (error) {
                console.error('Error decrypting history message:', error);
                // Add as encrypted if decryption fails
                decryptedMessages.push({
                    ...msg,
                    content: '[Encrypted Message]',
                    isEncrypted: true
                });
            }
        }

        this.messageCache = decryptedMessages;
        this.emit('history', { messages: decryptedMessages });
    }

    /**
     * Handle encrypted message
     */
    async handleEncryptedMessage(data) {
        try {
            const decrypted = await this.decryptIncomingMessage(data);

            if (decrypted) {
                this.messageCache.push(decrypted);
                this.emit('message', decrypted);
            }
        } catch (error) {
            console.error('Error handling encrypted message:', error);
            // Emit as encrypted if decryption fails
            this.emit('message', {
                ...data,
                content: '[Encrypted Message - Could not decrypt]',
                isEncrypted: true
            });
        }
    }

    /**
     * Decrypt incoming message
     */
    async decryptIncomingMessage(encryptedMsg) {
        try {
            const { encryptedContent, iv, senderId, senderPublicKey } = encryptedMsg;

            // Store sender's public key if we received it
            if (senderId === this.recipientId && senderPublicKey) {
                this.recipientPublicKey = senderPublicKey;
            }

            // Derive shared secret
            const publicKey = senderPublicKey || this.recipientPublicKey;
            if (!publicKey) {
                console.warn('No public key available for decryption');
                return null;
            }

            const sharedSecret = await EncryptionService.deriveSharedSecret(senderId, publicKey);

            // Decrypt message
            const decryptedContent = await EncryptionService.decryptMessage(
                encryptedContent,
                iv,
                sharedSecret
            );

            return {
                id: encryptedMsg.id,
                senderId,
                recipientId: encryptedMsg.recipientId,
                content: decryptedContent,
                timestamp: encryptedMsg.timestamp,
                isEncrypted: false
            };
        } catch (error) {
            console.error('Error decrypting message:', error);
            throw error;
        }
    }

    /**
     * Handle user joined
     */
    handleUserJoined(data) {
        if (data.userId === this.recipientId) {
            this.recipientPublicKey = data.publicKey;
            console.log(`Recipient joined with public key: ${data.publicKey?.substring(0, 20)}...`);
        }

        this.emit('user_joined', data);
    }

    /**
     * Handle key exchange
     */
    handleKeyExchanged(data) {
        if (data.userId === this.recipientId) {
            this.recipientPublicKey = data.publicKey;
            console.log(`Received recipient public key: ${data.publicKey?.substring(0, 20)}...`);
        }

        this.emit('key_exchanged', data);
    }

    /**
     * Send encrypted message
     */
    async sendMessage(content) {
        if (!content || !content.trim()) return;

        try {
            if (!this.recipientPublicKey) {
                console.warn('No recipient public key - cannot encrypt message');
                this.emit('error', { message: 'Recipient not available for encryption' });
                return;
            }

            // Derive shared secret
            const sharedSecret = await EncryptionService.deriveSharedSecret(
                this.recipientId,
                this.recipientPublicKey
            );

            // Encrypt message
            const { encryptedContent, iv } = await EncryptionService.encryptMessage(
                content.trim(),
                sharedSecret
            );

            const publicKey = await EncryptionService.getPublicKey();

            // Send encrypted message
            this.send('encrypted_message', {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                recipientId: this.recipientId,
                encryptedContent,
                iv,
                senderPublicKey: publicKey
            });

            console.log('Sent encrypted message');
        } catch (error) {
            console.error('Error sending encrypted message:', error);
            this.emit('error', error);
        }
    }

    /**
     * Send typing indicator
     */
    sendTypingIndicator(isTyping) {
        this.send('typing', { isTyping });
    }

    /**
     * Send message to server
     */
    send(type, data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type,
                ...data
            }));
        } else {
            console.warn('WebSocket not connected');
        }
    }

    /**
     * Listen to events
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    /**
     * Remove event listener
     */
    off(event, callback) {
        if (!this.listeners.has(event)) return;

        const callbacks = this.listeners.get(event);
        const index = callbacks.indexOf(callback);
        if (index > -1) {
            callbacks.splice(index, 1);
        }
    }

    /**
     * Emit event to listeners
     */
    emit(event, data) {
        if (!this.listeners.has(event)) return;

        this.listeners.get(event).forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in ${event} listener:`, error);
            }
        });
    }

    /**
     * Disconnect from DM
     */
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.messageCache = [];
        this.listeners.clear();
        this.recipientPublicKey = null;
    }

    /**
     * Check if connected
     */
    isConnected() {
        return this.ws && this.ws.readyState === WebSocket.OPEN;
    }
}

export default DirectMessageService;
