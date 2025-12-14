/**
 * Tab Navigator - Bottom navigation bar
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ConversationsScreen from '../screens/ConversationsScreen';
import ContactsScreen from '../screens/ContactsScreen';
import RoomListScreen from '../screens/RoomListScreen';
import ProfileScreen from '../screens/ProfileScreen';
import colors from '../theme/colors';

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
    const insets = useSafeAreaInsets();
    
    // Calculate bottom padding for Android navigation bar
    const bottomPadding = Platform.OS === 'android' ? Math.max(insets.bottom, 8) : 8;
    
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: [
                    styles.tabBar,
                    {
                        paddingBottom: bottomPadding,
                        height: 70 + bottomPadding - 8, // Adjust height based on padding
                    }
                ],
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textLight,
                tabBarLabelStyle: styles.tabLabel,
            }}
        >
            <Tab.Screen
                name="Chats"
                component={ConversationsScreen}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <Text style={{ fontSize: size, color }}>💬</Text>
                    ),
                    tabBarLabel: 'Chats',
                }}
            />
            <Tab.Screen
                name="Contactos"
                component={ContactsScreen}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <Text style={{ fontSize: size, color }}>👥</Text>
                    ),
                    tabBarLabel: 'Contactos',
                }}
            />
            <Tab.Screen
                name="Salas"
                component={RoomListScreen}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <Text style={{ fontSize: size, color }}>🏠</Text>
                    ),
                    tabBarLabel: 'Salas',
                }}
            />
            <Tab.Screen
                name="Perfil"
                component={ProfileScreen}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <Text style={{ fontSize: size, color }}>👤</Text>
                    ),
                    tabBarLabel: 'Perfil',
                }}
            />
        </Tab.Navigator>
    );
};

const styles = StyleSheet.create({
    tabBar: {
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: 8,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    tabLabel: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 4,
    },
});

export default TabNavigator;

