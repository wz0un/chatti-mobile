/**
 * Chat Service for React Native
 * Adapted from web version to work with React Native's WebSocket API
 */

import NotificationService from './NotificationService';

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
    connect(roomId, username, workerUrl = 'ws://localhost:8787') {
        this.roomId = roomId;
        this.username = username;
        this.userId = this.generateUserId();

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

                this.emit(data.type, data);
            } catch (error) {
                console.error('Error parsing message:', error);
            }
        };

        this.ws.onerror = (error) => {
            console.error('❌ WebSocket error:', error);
            this.emit('error', error);
        };

        this.ws.onclose = (event) => {
            console.log('🔌 Disconnected from chat room. Code:', event.code, 'Reason:', event.reason);
            this.emit('disconnected', { code: event.code, reason: event.reason });

            // Attempt to reconnect
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                console.log(`Reconnecting... (attempt ${this.reconnectAttempts})`);
                setTimeout(() => this.connect(roomId, username, workerUrl), 2000 * this.reconnectAttempts);
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
     * Disconnect from chat
     */
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
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
}

export default ChatService;
