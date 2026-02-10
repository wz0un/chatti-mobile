/**
 * Chat-ti Mobile App
 * Main entry point
 */

import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import AppNavigator from './src/navigation/AppNavigator';
import GlobalNotificationService from './src/services/GlobalNotificationService';

export default function App() {
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    // Initialize global notification service
    GlobalNotificationService.initialize();

    // Listen for incoming notifications
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    // Listen for notification responses (user taps notification)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      // You can navigate to specific screen based on notification data
    });

    return () => {
      GlobalNotificationService.cleanup();
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
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
