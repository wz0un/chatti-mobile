/**
 * App Navigator - React Navigation setup
 */

import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import RoomListScreen from '../screens/RoomListScreen';
import ChatScreen from '../screens/ChatScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ContactsScreen from '../screens/ContactsScreen';
import AddContactScreen from '../screens/AddContactScreen';
import ContactRequestsScreen from '../screens/ContactRequestsScreen';
import ConversationsScreen from '../screens/ConversationsScreen';
import DirectMessageScreen from '../screens/DirectMessageScreen';
import AuthService from '../services/AuthService';
import colors from '../theme/colors';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [initialRoute, setInitialRoute] = useState('Login');
    const [initialParams, setInitialParams] = useState(null);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const user = await AuthService.getCurrentUser();
            if (user) {
                setInitialRoute('RoomList');
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
                        title: 'Chat-ti',
                        headerShown: false,
                    }}
                />
                <Stack.Screen
                    name="RoomList"
                    component={RoomListScreen}
                    initialParams={initialRoute === 'RoomList' ? initialParams : undefined}
                    options={{
                        title: 'Salas',
                        headerBackVisible: false,
                    }}
                />
                <Stack.Screen
                    name="Chat"
                    component={ChatScreen}
                    options={{
                        headerBackTitle: 'Salas',
                    }}
                />
                <Stack.Screen
                    name="Profile"
                    component={ProfileScreen}
                    options={{
                        title: 'Mi Perfil',
                        headerBackTitle: 'Atrás',
                    }}
                />
                <Stack.Screen
                    name="Contacts"
                    component={ContactsScreen}
                    options={{
                        title: 'Contactos',
                        headerBackTitle: 'Atrás',
                    }}
                />
                <Stack.Screen
                    name="AddContact"
                    component={AddContactScreen}
                    options={{
                        title: 'Agregar Contacto',
                        headerBackTitle: 'Atrás',
                    }}
                />
                <Stack.Screen
                    name="ContactRequests"
                    component={ContactRequestsScreen}
                    options={{
                        title: 'Solicitudes de Contacto',
                        headerBackTitle: 'Atrás',
                    }}
                />
                <Stack.Screen
                    name="Conversations"
                    component={ConversationsScreen}
                    options={{
                        title: 'Chats Privados',
                        headerBackTitle: 'Atrás',
                    }}
                />
                <Stack.Screen
                    name="DirectMessage"
                    component={DirectMessageScreen}
                    options={{
                        headerBackTitle: 'Atrás',
                    }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default AppNavigator;
