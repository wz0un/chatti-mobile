/**
 * Chat-ti Mobile App
 * Main entry point
 */

import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import AppNavigator from './src/navigation/AppNavigator';
import GlobalNotificationService from './src/services/GlobalNotificationService';
import { LanguageProvider } from './src/i18n';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { AlertProvider } from './src/theme/AlertContext';

function AppContent() {
  const { isDark } = useTheme();
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
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  return (
    <>
      <AppNavigator />
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AlertProvider>
        <LanguageProvider>
          <AppContent />
        </LanguageProvider>
      </AlertProvider>
    </ThemeProvider>
  );
}

