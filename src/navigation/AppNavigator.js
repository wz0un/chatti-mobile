/**
 * App Navigator - React Navigation setup
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import RoomListScreen from '../screens/RoomListScreen';
import ChatScreen from '../screens/ChatScreen';
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
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default AppNavigator;
