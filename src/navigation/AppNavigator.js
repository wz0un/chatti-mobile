/**
 * App Navigator - React Navigation setup with Bottom Tabs
 */

import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import MainTabs from './MainTabs';
import ChatScreen from '../screens/ChatScreen';
import AddContactScreen from '../screens/AddContactScreen';
import ContactRequestsScreen from '../screens/ContactRequestsScreen';
import DirectMessageScreen from '../screens/DirectMessageScreen';
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
                        headerBackTitle: t('common.back'),
                    }}
                />
                <Stack.Screen
                    name="AddContact"
                    component={AddContactScreen}
                    options={{
                        title: t('addContact.title'),
                        headerBackTitle: t('common.back'),
                    }}
                />
                <Stack.Screen
                    name="ContactRequests"
                    component={ContactRequestsScreen}
                    options={{
                        title: t('contactRequests.title'),
                        headerBackTitle: t('common.back'),
                    }}
                />
                <Stack.Screen
                    name="DirectMessage"
                    component={DirectMessageScreen}
                    options={{
                        headerBackTitle: t('common.back'),
                    }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default AppNavigator;
