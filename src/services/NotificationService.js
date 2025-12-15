/**
 * Notification Service for React Native
 * Using Expo Notifications API
 */

import * as Notifications from 'expo-notifications';
import { getTranslator } from '../i18n';
import { Platform, AppState } from 'react-native';

// Configure how notifications are shown when app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
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
                this.permissionGranted = false;
                return false;
            }

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

            let isExpoGo = false;
            try {
                const Constants = require('expo-constants').default;
                if (Constants) {
                    isExpoGo = Constants.executionEnvironment === 'storeClient';
                }
            } catch (e) {
                if (__DEV__) {
                    isExpoGo = true;
                }
            }
            
            if (isExpoGo) {
                return 'expo-go-mock-token';
            }

            const tokenData = await Notifications.getExpoPushTokenAsync({
                projectId: 'bba1628d-3c75-4e56-ac00-fc572407c45b'
            });

            if (tokenData?.data) {
                return tokenData.data;
            }
            return null;
        } catch (error) {
            if (__DEV__) {
                return 'development-mock-token';
            }
            return null;
        }
    }

    /**
     * Show notification for new message
     * Works with local notifications in Expo Go
     */
    async notifyNewMessage(username, content, roomId) {
        if (!this.permissionGranted) return;

        try {
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
            const translate = await getTranslator();
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: translate('notifications.joinTitle', { username }),
                    body: translate('notifications.joinBody', { username }),
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
            const translate = await getTranslator();
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: translate('notifications.leftTitle', { username }),
                    body: translate('notifications.leftBody', { username }),
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
        if (!this.permissionGranted) return;

        try {
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
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: '💬 Chat-Ti Test',
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
