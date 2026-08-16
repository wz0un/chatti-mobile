/**
 * App Navigator - React Navigation setup with Bottom Tabs
 */

import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import MainTabs from './MainTabs';
import ChatScreen from '../screens/ChatScreen';
import AddContactScreen from '../screens/AddContactScreen';
import ContactRequestsScreen from '../screens/ContactRequestsScreen';
import DirectMessageScreen from '../screens/DirectMessageScreen';
import AuthService from '../services/AuthService';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from '../i18n';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
    const { theme, isDark } = useTheme();
    const [isLoading, setIsLoading] = useState(true);
    const [initialRoute, setInitialRoute] = useState('Login');
    const [initialParams, setInitialParams] = useState(null);
    const { t } = useTranslation();

    const navigationTheme = {
        ...(isDark ? DarkTheme : DefaultTheme),
        colors: {
            ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
            primary: theme.primary,
            background: theme.background,
            card: theme.surface,
            text: theme.text,
            border: theme.border,
            notification: theme.primary,
        },
    };

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const user = await AuthService.getCurrentUser();
            if (user) {
                setInitialRoute('Main');
                setInitialParams({ username: user.fullUsername });
            }
        } catch (error) {
            console.error('Error checking auth:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    return (
        <NavigationContainer theme={navigationTheme}>
            <Stack.Navigator
                initialRouteName={initialRoute}
                screenOptions={{
                    headerStyle: {
                        backgroundColor: theme.surface,
                    },
                    headerTintColor: theme.primary,
                    headerTitleStyle: {
                        fontWeight: 'bold',
                        fontSize: 18,
                    },
                    headerShadowVisible: false,
                    headerBackTitleVisible: false,
                }}
            >
                <Stack.Screen
                    name="Login"
                    component={LoginScreen}
                    options={{
                        title: t('login.title'),
                        headerShown: false,
                    }}
                />
                <Stack.Screen
                    name="Main"
                    component={MainTabs}
                    initialParams={initialRoute === 'Main' ? initialParams : undefined}
                    options={{
                        headerShown: false,
                    }}
                />
                <Stack.Screen
                    name="Chat"
                    component={ChatScreen}
                    options={{
                        headerTitleStyle: { color: theme.text },
                    }}
                />
                <Stack.Screen
                    name="AddContact"
                    component={AddContactScreen}
                    options={{
                        headerTitleStyle: { color: theme.text },
                        title: t('addContact.title'),
                    }}
                />
                <Stack.Screen
                    name="ContactRequests"
                    component={ContactRequestsScreen}
                    options={{
                        headerTitleStyle: { color: theme.text },
                        title: t('contactRequests.title'),
                    }}
                />
                <Stack.Screen
                    name="DirectMessage"
                    component={DirectMessageScreen}
                    options={{
                        headerTitleStyle: { color: theme.text },
                    }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default AppNavigator;
