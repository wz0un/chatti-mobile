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
        this.listeners = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.notificationService = new NotificationService();
        this.messageCache = []; // Track messages for saving
        this.messageIds = new Set();
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
        this.roomId = roomId;
        this.username = username;
        this.userId = userId || this.generateUserId();

        // Initialize chat history for rooms
        if (userId) {
            ChatHistoryService.setUserId(userId);
            this._loadSavedRoomHistory(roomId);
        }

        // Determine WebSocket URL
        const wsUrl = workerUrl.replace('http://', 'ws://').replace('https://', 'wss://');
        const url = `${wsUrl}/api/room/${roomId}`;

        console.log('Connecting to:', url);

        // Create WebSocket connection (React Native has WebSocket globally)
        this.ws = new WebSocket(url);

        // Event handlers
        this.ws.onopen = () => {
            console.log('✅ Connected to chat room:', roomId);
            this.reconnectAttempts = 0;

            // Send join message
            this.send('join', {
                username: this.username,
                userId: this.userId
            });

            this.emit('connected', { roomId, username });
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('📨 Received:', data.type, data);

                // Trigger notifications for messages from other users
                if (data.type === 'message' && data.username !== this.username) {
                    this.notificationService.notifyNewMessage(
                        data.username,
                        data.content,
                        this.roomId
                    );
                } else if (data.type === 'user_joined' && data.username !== this.username) {
                    this.notificationService.notifyUserJoined(
                        data.username,
                        this.roomId
                    );
                }

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

        this.ws.onerror = (error) => {
            console.error('❌ WebSocket error:', error);
            console.error('Connection URL was:', url);
            this.emit('error', error);
        };

        this.ws.onclose = (event) => {
            console.log('🔌 Disconnected from chat room. Code:', event.code, 'Reason:', event.reason);
            console.log('Was clean close:', event.wasClean);
            this.emit('disconnected', { code: event.code, reason: event.reason });

            // Attempt to reconnect only for unexpected disconnections
            if (this.reconnectAttempts < this.maxReconnectAttempts && event.code !== 1000) {
                this.reconnectAttempts++;
                console.log(`Reconnecting... (attempt ${this.reconnectAttempts})`);
                setTimeout(() => this.connect(roomId, username, workerUrl), 2000 * this.reconnectAttempts);
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
     * Disconnect from chat
     */
    disconnect() {
        // Save room messages before disconnecting
        if (this.roomId && this.messageCache.length > 0) {
            ChatHistoryService.saveRoomMessages(this.roomId, this.messageCache);
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
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
