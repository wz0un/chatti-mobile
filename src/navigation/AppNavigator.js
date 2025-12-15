/**
 * App Navigator - React Navigation setup
 */

import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import ChatScreen from '../screens/ChatScreen';
import AddContactScreen from '../screens/AddContactScreen';
import ContactRequestsScreen from '../screens/ContactRequestsScreen';
import DirectMessageScreen from '../screens/DirectMessageScreen';
import TabNavigator from './TabNavigator';
import AuthService from '../services/AuthService';
import colors from '../theme/colors';
import { useTranslation } from '../i18n';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [initialRoute, setInitialRoute] = useState('Login');
    const [initialParams, setInitialParams] = useState(null);
    const { t } = useTranslation();

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const user = await AuthService.getCurrentUser();
            if (user) {
                setInitialRoute('MainTabs');
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
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator
                initialRouteName={initialRoute}
                screenOptions={{
                    headerStyle: {
                        backgroundColor: colors.primary,
                    },
                    headerTintColor: colors.textInverse,
                    headerTitleStyle: {
                        fontWeight: 'bold',
                    },
                }}
            >
                <Stack.Screen
                    name="Login"
                    component={LoginScreen}
                    options={{
                        title: t('common.appName'),
                        headerShown: false,
                    }}
                />
                <Stack.Screen
                    name="MainTabs"
                    component={TabNavigator}
                    initialParams={initialRoute === 'MainTabs' ? initialParams : undefined}
                    options={{
                        headerShown: false,
                    }}
                />
                <Stack.Screen
                    name="Chat"
                    component={ChatScreen}
                    options={{
                        headerBackTitle: t('navigator.roomsBack'),
                    }}
                />
                <Stack.Screen
                    name="AddContact"
                    component={AddContactScreen}
                    options={{
                        title: t('navigator.addContact'),
                        headerBackTitle: t('navigator.back'),
                    }}
                />
                <Stack.Screen
                    name="ContactRequests"
                    component={ContactRequestsScreen}
                    options={{
                        title: t('navigator.contactRequests'),
                        headerBackTitle: t('navigator.back'),
                    }}
                />
                <Stack.Screen
                    name="DirectMessage"
                    component={DirectMessageScreen}
                    options={{
                        headerBackTitle: t('navigator.back'),
                    }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default AppNavigator;
