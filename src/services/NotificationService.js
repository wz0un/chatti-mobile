/**
 * Notification Service for React Native
 * Using Expo Notifications API
 */

import * as Notifications from 'expo-notifications';
import { Platform, AppState } from 'react-native';

// Configure how notifications are shown when app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async () => {
        return {
            shouldShowAlert: true, // Always show notifications
            shouldPlaySound: true, // Always play sound
            shouldSetBadge: true,
        };
    },
});

class NotificationService {
    constructor() {
        this.permissionGranted = false;
    }

    /**
     * Initialize notification service and request permissions
     */
    async initialize() {
        try {
            // Request permissions
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                console.log('⚠️ Notification permissions not granted');
                this.permissionGranted = false;
                return false;
            }

            console.log('✅ Notification permissions granted');
            this.permissionGranted = true;

            // Configure notification channels for Android
            if (Platform.OS === 'android') {
                // Chat messages channel
                await Notifications.setNotificationChannelAsync('chat-messages', {
                    name: 'Mensajes de Chat',
                    importance: Notifications.AndroidImportance.HIGH,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#FF6B35',
                    sound: true,
                    enableVibrate: true,
                    showBadge: true,
                });
                
                // Encrypted messages channel
                await Notifications.setNotificationChannelAsync('encrypted-messages', {
                    name: 'Mensajes Cifrados',
                    importance: Notifications.AndroidImportance.HIGH,
                    vibrationPattern: [0, 100, 100, 100, 100, 100],
                    lightColor: '#4ECDC4',
                    sound: true,
                    enableVibrate: true,
                    showBadge: true,
                });
                
                // User events channel
                await Notifications.setNotificationChannelAsync('user-events', {
                    name: 'Eventos de Usuario',
                    importance: Notifications.AndroidImportance.DEFAULT,
                    vibrationPattern: [0, 100, 100],
                    lightColor: '#FF6B35',
                    sound: false,
                    enableVibrate: true,
                    showBadge: false,
                });
            }

            return true;
        } catch (error) {
            console.error('Error initializing notifications:', error);
            return false;
        }
    }

    /**
     * Get Expo Push Token
     */
    async getExpoPushToken() {
        try {
            if (!this.permissionGranted) {
                const granted = await this.initialize();
                if (!granted) return null;
            }

            // Check if we're in Expo Go (push notifications don't work)
            const isExpoGo = __DEV__ && !Platform.select({ native: false, default: true });
            
            if (isExpoGo) {
                console.log('⚠️ Running in Expo Go - Push notifications not supported');
                return 'expo-go-mock-token';
            }

            // Get the token
            const tokenData = await Notifications.getExpoPushTokenAsync({
                projectId: 'bba1628d-3c75-4e56-ac00-fc572407c45b'
            });

            console.log('✅ Expo Push Token:', tokenData.data);
            return tokenData.data;
        } catch (error) {
            console.error('Error getting push token:', error);
            // Return mock token for development
            return 'development-mock-token';
        }
    }

    /**
     * Show notification for new message
     * Works with local notifications in Expo Go
     */
    async notifyNewMessage(username, content, roomId) {
        if (!this.permissionGranted) {
            console.log('⚠️ No notification permissions');
            return;
        }

        try {
            console.log('🔔 Showing notification for message from:', username);
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: `💬 ${username}`,
                    body: content.length > 50 ? content.substring(0, 50) + '...' : content,
                    data: {
                        roomId,
                        type: 'message',
                        username
                    },
                    sound: true,
                    priority: Notifications.AndroidNotificationPriority.HIGH,
                    categoryIdentifier: 'chat-message',
                    channelId: 'chat-messages',
                },
                trigger: null, // Show immediately
            });
        } catch (error) {
            console.error('Error showing message notification:', error);
        }
    }

    /**
     * Show notification when user joins
     */
    async notifyUserJoined(username, roomId) {
        if (!this.permissionGranted) return;

        try {
            console.log('🔔 Showing join notification for:', username);
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: `👋 ${username} se unió`,
                    body: `${username} se ha unido al chat`,
                    data: {
                        roomId,
                        type: 'user_joined',
                        username
                    },
                    sound: false,
                    priority: Notifications.AndroidNotificationPriority.DEFAULT,
                    channelId: 'user-events',
                },
                trigger: null,
            });
        } catch (error) {
            console.error('Error showing join notification:', error);
        }
    }

    /**
     * Show notification when user leaves
     */
    async notifyUserLeft(username, roomId) {
        if (!this.permissionGranted) return;

        try {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: `👋 ${username} left`,
                    body: `${username} has left the chat`,
                    data: {
                        roomId,
                        type: 'user_left',
                        username
                    },
                    sound: false,
                    priority: Notifications.AndroidNotificationPriority.LOW,
                },
                trigger: null,
            });
        } catch (error) {
            console.error('Error showing leave notification:', error);
        }
    }

    /**
     * Cancel all notifications
     */
    async cancelAllNotifications() {
        try {
            await Notifications.cancelAllScheduledNotificationsAsync();
        } catch (error) {
            console.error('Error canceling notifications:', error);
        }
    }

    /**
     * Get notification response (when user taps notification)
     */
    addNotificationResponseListener(callback) {
        return Notifications.addNotificationResponseReceivedListener(callback);
    }

    /**
     * Remove notification listener
     */
    removeNotificationListener(subscription) {
        if (subscription) {
            subscription.remove();
        }
    }

    /**
     * Show notification for encrypted message
     */
    async notifyEncryptedMessage(senderUsername, conversationId) {
        if (!this.permissionGranted) {
            console.log('⚠️ No notification permissions');
            return;
        }

        try {
            console.log('🔔 Showing encrypted message notification from:', senderUsername);
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: `🔒 ${senderUsername}`,
                    body: 'Nuevo mensaje cifrado',
                    data: {
                        conversationId,
                        type: 'encrypted_message',
                        username: senderUsername
                    },
                    sound: true,
                    priority: Notifications.AndroidNotificationPriority.HIGH,
                    categoryIdentifier: 'encrypted-message',
                    channelId: 'encrypted-messages',
                },
                trigger: null,
            });
        } catch (error) {
            console.error('Error showing encrypted message notification:', error);
        }
    }

    /**
     * Test notification (for debugging)
     */
    async testNotification() {
        try {
            console.log('🔔 Sending test notification');
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: '💬 Chat-ti Test',
                    body: 'Las notificaciones están funcionando correctamente!',
                    data: { test: true },
                    sound: true,
                },
                trigger: null,
            });
            return true;
        } catch (error) {
            console.error('Error sending test notification:', error);
            return false;
        }
    }
}

export default NotificationService;
