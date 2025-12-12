/**
 * App Navigator - React Navigation setup
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import RoomListScreen from '../screens/RoomListScreen';
import ChatScreen from '../screens/ChatScreen';
import UsersListScreen from '../screens/UsersListScreen';
import ConversationsScreen from '../screens/ConversationsScreen';
import DirectMessageScreen from '../screens/DirectMessageScreen';
import colors from '../theme/colors';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
    return (
        <NavigationContainer>
            <Stack.Navigator
                initialRouteName="Login"
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
                    name="UsersList"
                    component={UsersListScreen}
                    options={{
                        title: 'Usuarios',
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
