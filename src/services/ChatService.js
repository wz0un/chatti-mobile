/**
 * Chat Service for React Native
 * Adapted from web version to work with React Native's WebSocket API
 */

import NotificationService from './NotificationService';
import ChatHistoryService from './ChatHistoryService';

class ChatService {
    constructor() {
        this.ws = null;
        this.roomId = null;
        this.userId = null;
        this.username = null;
        this.workerUrl = null;
        this.listeners = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.notificationService = new NotificationService();
        this.messageCache = []; // Track messages for saving
        this.messageIds = new Set();
        this.reconnectTimer = null;
        this.intentionalDisconnect = false;
        this._socketGeneration = 0;
        this._autoReconnect = false;
    }

    /**
     * Initialize notification service
     */
    async initNotifications() {
        await this.notificationService.initialize();
    }

    /**
     * Connect to a chat room
     */
    connect(roomId, username, workerUrl = 'ws://localhost:8788', userId = null) {
        const autoReconnect = this._autoReconnect === true;
        this._autoReconnect = false;
        this.intentionalDisconnect = false;

        this.roomId = roomId;
        this.username = username;
        this.workerUrl = workerUrl;
        // An explicit userId always wins. Automatic retries pass the original one
        // explicitly; a new manual connection without userId must not inherit a
        // previous identity.
        this.userId = userId || (autoReconnect ? this.userId : null) || this.generateUserId();

        // Initialize chat history for rooms (preserve initial-connect behavior).
        if (userId && !autoReconnect) {
            ChatHistoryService.setUserId(userId);
            this._loadSavedRoomHistory(roomId);
        }

        // Determine WebSocket URL
        const wsUrl = this.workerUrl.replace('http://', 'ws://').replace('https://', 'wss://');
        const url = `${wsUrl}/api/room/${this.roomId}`;

        console.log('Connecting to:', url);

        // Replace any existing socket. The generation bump invalidates its
        // callbacks before the best-effort close, so a late open/close can never
        // act for this instance; the resource itself is also closed here.
        const generation = this._invalidateSocket();
        // If the constructor throws, this.ws stays null: the previous socket is
        // gone and send() can no longer write through it.
        const ws = new WebSocket(url);
        this.ws = ws;

        // Event handlers
        ws.onopen = () => {
            if (generation !== this._socketGeneration || this.intentionalDisconnect) return;
            console.log('✅ Connected to chat room:', this.roomId);
            this.reconnectAttempts = 0;

            // Send join message
            this.send('join', {
                username: this.username,
                userId: this.userId
            });

            this.emit('connected', { roomId: this.roomId, username: this.username });
        };

        ws.onmessage = (event) => {
            if (generation !== this._socketGeneration) return;
            try {
                const data = JSON.parse(event.data);
                console.log('📨 Received:', data.type, data);

                // (Redundant local notifications removed as they fire on connection)

                // Save non-system messages for history
                if (data.type === 'message' && data.content && data.id) {
                    if (!this.messageIds.has(data.id)) {
                        this.messageIds.add(data.id);
                        this.messageCache.push(data);
                        ChatHistoryService.appendRoomMessages(this.roomId, [data]);
                    }
                }

                this.emit(data.type, data);
            } catch (error) {
                console.error('Error parsing message:', error);
            }
        };

        ws.onerror = (error) => {
            if (generation !== this._socketGeneration) return;
            console.error('❌ WebSocket error:', error);
            console.error('Connection URL was:', url);
            this.emit('error', error);
        };

        ws.onclose = (event) => {
            if (generation !== this._socketGeneration) return;
            if (this.ws === ws) {
                this.ws = null;
            }
            console.log('🔌 Disconnected from chat room. Code:', event.code, 'Reason:', event.reason);
            console.log('Was clean close:', event.wasClean);
            this.emit('disconnected', { code: event.code, reason: event.reason });

            if (this.intentionalDisconnect) return;

            // Attempt to reconnect only for unexpected disconnections
            if (this.reconnectAttempts < this.maxReconnectAttempts && event.code !== 1000) {
                this.reconnectAttempts++;
                console.log(`Reconnecting... (attempt ${this.reconnectAttempts})`);
                const delay = 2000 * this.reconnectAttempts;
                // Tie the retry to this socket generation so a newer connection,
                // or a manual disconnect, can never be overridden by this timer.
                const retryGeneration = generation;
                this.reconnectTimer = setTimeout(() => {
                    this.reconnectTimer = null;
                    if (this.intentionalDisconnect) return;
                    if (retryGeneration !== this._socketGeneration) return;
                    this._autoReconnect = true;
                    this.connect(this.roomId, this.username, this.workerUrl, this.userId);
                }, delay);
            } else if (event.code !== 1000) {
                console.error('Max reconnection attempts reached');
                this.emit('error', { message: 'Could not connect to chat server' });
            }
        };
    }

    /**
     * Send a chat message
     */
    sendMessage(content) {
        if (!content || !content.trim()) return;

        this.send('message', {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            content: content.trim()
        });
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
            try {
                this.ws.send(JSON.stringify({
                    type,
                    ...data
                }));
            } catch (error) {
                console.error('Error sending message:', error);
                this.emit('error', error);
            }
        } else {
            console.warn('WebSocket not connected, state:', this.ws?.readyState);
            this.emit('error', { message: 'Not connected to chat server' });
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
     * Invalidate the current socket callbacks and close its resource.
     * Returns the new socket generation. Used before replacing a socket and on
     * disconnect, so late open/close events and a throwing close() are harmless.
     */
    _invalidateSocket() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        // Bump first: any callback fired synchronously by close() is already stale.
        this._socketGeneration += 1;

        const previous = this.ws;
        this.ws = null;
        if (previous) {
            try {
                previous.close();
            } catch (error) {
                // React Native can throw when closing a CONNECTING socket; the
                // generation bump above already made its callbacks inert.
                console.error('Error closing WebSocket:', error);
            }
        }

        return this._socketGeneration;
    }

    /**
     * Disconnect from chat
     */
    disconnect() {
        this.intentionalDisconnect = true;
        // Cancel any pending retry and invalidate late open/close callbacks,
        // even when close() throws.
        this._invalidateSocket();

        // Save room messages before disconnecting
        if (this.roomId && this.messageCache.length > 0) {
            ChatHistoryService.saveRoomMessages(this.roomId, this.messageCache);
        }

        this.messageCache = [];
        this.messageIds = new Set();
        this.listeners.clear();
    }

    /**
     * Generate unique user ID
     */
    generateUserId() {
        return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Check if connected
     */
    isConnected() {
        return this.ws && this.ws.readyState === WebSocket.OPEN;
    }

    /**
     * Load saved room history from local storage
     */
    async _loadSavedRoomHistory(roomId) {
        try {
            const enabled = await ChatHistoryService.isHistoryEnabled();
            if (!enabled) return;

            const savedMessages = await ChatHistoryService.loadRoomMessages(roomId);
            if (savedMessages.length > 0) {
                this.messageCache = savedMessages;
                savedMessages.forEach(m => this.messageIds.add(m.id));
                this.emit('saved_history', { messages: savedMessages });
            }
        } catch (error) {
            console.error('Error loading room history:', error);
        }
    }
}

export default ChatService;
