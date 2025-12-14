/**
 * Global Notification Service
 * Handles background notifications and app state management
 */

import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import NotificationService from './NotificationService';

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
            await this.notificationService.initialize();
            this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange.bind(this));
            this.notificationSubscription = Notifications.addNotificationResponseReceivedListener(
                this.handleNotificationResponse.bind(this)
            );
            this.isInitialized = true;
        } catch (error) {
            console.error('Error initializing global notifications:', error);
        }
    }

    /**
     * Handle app state changes
     */
    handleAppStateChange(nextAppState) {
        if (nextAppState === 'active') {
            this.clearAllNotifications();
        }
    }

    /**
     * Handle notification tap
     */
    handleNotificationResponse(response) {
        const data = response.notification.request.content.data;
        // Navigation handled by App.js listener
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