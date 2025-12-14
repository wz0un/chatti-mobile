/**
 * Chat-Ti Mobile App
 * Main entry point
 */

import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import AppNavigator from './src/navigation/AppNavigator';
import GlobalNotificationService from './src/services/GlobalNotificationService';
import AuthService from './src/services/AuthService';

export default function App() {
  const notificationListener = useRef();
  const responseListener = useRef();
  const appStateListener = useRef();

  useEffect(() => {
    // Initialize global notification service
    GlobalNotificationService.initialize();

    const updateTokenOnStart = async () => {
      try {
        const user = await AuthService.getCurrentUser();
        if (user) {
          await AuthService.updatePushToken();
        }
      } catch (error) {
        console.error('Error updating push token on start:', error);
      }
    };
    updateTokenOnStart();

    appStateListener.current = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        try {
          const user = await AuthService.getCurrentUser();
          if (user) {
            await AuthService.updatePushToken();
          }
        } catch (error) {
          console.error('Error updating push token on app active:', error);
        }
      }
    });

    notificationListener.current = Notifications.addNotificationReceivedListener(() => {
      // Notification shown automatically by handler
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data.type === 'message' && data.roomId) {
        // Navigation handled by navigation system
      } else if (data.type === 'encrypted_message' && data.conversationId) {
        // Navigation handled by navigation system
      }
    });

    Notifications.getLastNotificationResponseAsync();

    return () => {
      GlobalNotificationService.cleanup();
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
      if (appStateListener.current) {
        appStateListener.current.remove();
      }
    };
  }, []);

  return (
    <>
      <AppNavigator />
      <StatusBar style="light" />
    </>
  );
}
