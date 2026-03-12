/**
 * Global Notification Service
 * Handles background notifications and app state management
 */

import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationService from './NotificationService';
import ApiService from './ApiService';
import AuthService from './AuthService';

class GlobalNotificationService {
    constructor() {
        this.notificationService = new NotificationService();
        this.appStateSubscription = null;
        this.notificationSubscription = null;
        this.isInitialized = false;
    }

    /**
     * Initialize global notification handling
     */
    async initialize() {
        if (this.isInitialized) return;

        try {
            // Initialize notification service
            await this.notificationService.initialize();

            // Listen for app state changes
            this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange.bind(this));

            // Listen for notification responses (when user taps notification)
            this.notificationSubscription = Notifications.addNotificationResponseReceivedListener(
                this.handleNotificationResponse.bind(this)
            );

            console.log('✅ Global notification service initialized');
            this.isInitialized = true;
        } catch (error) {
            console.error('Error initializing global notifications:', error);
        }
    }

    /**
     * Handle app state changes
     */
    handleAppStateChange(nextAppState) {
        console.log('App state changed to:', nextAppState);

        if (nextAppState === 'background' || nextAppState === 'inactive') {
            // App went to background - notifications will now show
            console.log('📱 App in background - notifications enabled');
        } else if (nextAppState === 'active') {
            // App became active - clear any pending notifications
            console.log('📱 App active - clearing notifications');
            this.clearAllNotifications();
            this.checkPendingNotifications();
        }
    }

    /**
     * Handle notification tap
     */
    handleNotificationResponse(response) {
        const data = response.notification.request.content.data;
        console.log('📱 Notification tapped:', data);

        // Handle different notification types
        if (data.type === 'message' && data.roomId) {
            // Navigate to chat room
            console.log('Navigate to room:', data.roomId);
        } else if (data.type === 'encrypted_message' && data.conversationId) {
            // Navigate to DM conversation
            console.log('Navigate to conversation:', data.conversationId);
        } else if (data.type === 'contact_request') {
            // Navigate to requests list
            console.log('Navigate to contact requests');
            // Assuming we have access to navigation here or through a ref
        }
    }

    /**
     * Check for unread conversations and show a grouped notification
     */
    async checkPendingNotifications() {
        try {
            const user = await AuthService.getCurrentUser();
            if (!user) return;

            const convos = await ApiService.getUserConversations(user.userId);
            if (!convos || !Array.isArray(convos)) return;

            const lastSeenDataStr = await AsyncStorage.getItem(`lastSeen_${user.userId}`);
            const lastSeenData = lastSeenDataStr ? JSON.parse(lastSeenDataStr) : {};

            let unreadCount = 0;
            let lastUnreadSender = '';

            for (const convo of convos) {
                const msgTime = convo.lastMessage?.timestamp || convo.lastMessageTime || convo.createdAt;
                const timestamp = msgTime ? new Date(msgTime).getTime() : 0;
                
                const otherParticipant = convo.participants?.find(p => String(p).toLowerCase() !== String(user.userId).toLowerCase());
                const rId = convo.recipient?.userId || convo.recipientId || otherParticipant || convo.id;
                const recipientId = String(rId).toLowerCase();

                const lastSeenTime = Number(lastSeenData[recipientId]) || 0;
                
                if (timestamp > lastSeenTime && timestamp > 0) {
                    unreadCount++;
                    lastUnreadSender = convo.recipient?.username || convo.recipientUsername || 'Alguien';
                }
            }

            if (unreadCount > 0) {
                await this.showNotification(
                    unreadCount === 1 ? `💬 Nuevo mensaje de ${lastUnreadSender}` : `💬 Tienes mensajes en ${unreadCount} chats`,
                    'Toca para abrir y leer tus mensajes nuevos.',
                    { type: 'pending_messages' }
                );
            }
        } catch (error) {
            console.error('Error checking pending notifications:', error);
        }
    }

    /**
     * Clear all notifications
     */
    async clearAllNotifications() {
        try {
            await Notifications.dismissAllNotificationsAsync();
        } catch (error) {
            console.error('Error clearing notifications:', error);
        }
    }

    /**
     * Show notification (proxy to notification service)
     */
    async showNotification(title, body, data = {}) {
        try {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title,
                    body,
                    data,
                    sound: true,
                    priority: Notifications.AndroidNotificationPriority.HIGH,
                },
                trigger: null,
            });
        } catch (error) {
            console.error('Error showing notification:', error);
        }
    }

    /**
     * Cleanup
     */
    cleanup() {
        if (this.appStateSubscription) {
            this.appStateSubscription.remove();
        }
        if (this.notificationSubscription) {
            this.notificationSubscription.remove();
        }
        this.isInitialized = false;
    }
}

// Export singleton instance
export default new GlobalNotificationService();