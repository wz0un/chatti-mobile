/**
 * Notification Service for React Native
 * Using Expo Notifications API
 */

import * as Notifications from 'expo-notifications';
import { Platform, AppState } from 'react-native';

// Configure how notifications are shown when app is in foreground
// Only show notifications when app is in background
Notifications.setNotificationHandler({
    handleNotification: async () => {
        const appState = AppState.currentState;
        const isAppActive = appState === 'active';

        return {
            shouldShowAlert: !isAppActive,
            shouldPlaySound: !isAppActive,
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

            // Configure notification channel for Android
            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync('chat-messages', {
                    name: 'Chat Messages',
                    importance: Notifications.AndroidImportance.HIGH,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#FF6B35',
                });
            }

            return true;
        } catch (error) {
            console.error('Error initializing notifications:', error);
            return false;
        }
    }

    /**
     * Show notification for new message
     * Only shows when app is in background or inactive
     */
    async notifyNewMessage(username, content, roomId) {
        if (!this.permissionGranted) return;

        // Only show notification if app is not active
        const appState = AppState.currentState;
        if (appState === 'active') {
            console.log('📱 App is active, skipping notification');
            return;
        }

        try {
            console.log('🔔 Showing notification for message from:', username);
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: `💬 ${username}`,
                    body: content,
                    data: {
                        roomId,
                        type: 'message',
                        username
                    },
                    sound: true,
                    priority: Notifications.AndroidNotificationPriority.HIGH,
                    categoryIdentifier: 'chat-message',
                },
                trigger: null, // Show immediately
            });
        } catch (error) {
            console.error('Error showing message notification:', error);
        }
    }

    /**
     * Show notification when user joins
     * Only shows when app is in background or inactive
     */
    async notifyUserJoined(username, roomId) {
        if (!this.permissionGranted) return;

        // Only show notification if app is not active
        const appState = AppState.currentState;
        if (appState === 'active') return;

        try {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: `👋 ${username} joined`,
                    body: `${username} has joined the chat`,
                    data: {
                        roomId,
                        type: 'user_joined',
                        username
                    },
                    sound: false,
                    priority: Notifications.AndroidNotificationPriority.DEFAULT,
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
}

export default NotificationService;
