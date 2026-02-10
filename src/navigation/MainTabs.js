/**
 * Main Tabs Navigator - Bottom navigation like Telegram
 */

import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RoomListScreen from '../screens/RoomListScreen';
import ConversationsScreen from '../screens/ConversationsScreen';
import ContactsScreen from '../screens/ContactsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ApiService from '../services/ApiService';
import AuthService from '../services/AuthService';
import colors from '../theme/colors';

const Tab = createBottomTabNavigator();

const TabIcon = ({ emoji, label, focused }) => (
    <View style={styles.tabIconContainer}>
        <Text style={styles.tabEmoji}>{emoji}</Text>
        <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>
            {label}
        </Text>
    </View>
);

const MainTabs = ({ route, navigation }) => {
    const username = route.params?.username;
    const [currentUser, setCurrentUser] = useState(null);
    const [unreadChatsCount, setUnreadChatsCount] = useState(0);
    const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

    // Initial auth check
    useEffect(() => {
        const loadUser = async () => {
            const user = await AuthService.getCurrentUser();
            setCurrentUser(user);
        };
        loadUser();
    }, []);

    // Polling and updates
    useEffect(() => {
        if (!currentUser) return;

        checkUnreadChats();
        checkPendingRequests();

        const interval = setInterval(() => {
            checkUnreadChats();
            checkPendingRequests();
        }, 30000); // Check every 30s

        // Also update when screen comes into focus
        const unsubscribe = navigation.addListener('focus', () => {
            checkUnreadChats();
            checkPendingRequests();
        });

        return () => {
            clearInterval(interval);
            unsubscribe();
        };
    }, [currentUser, navigation]);

    const checkUnreadChats = async () => {
        if (!currentUser) return;

        try {
            const conversations = await ApiService.getUserConversations(currentUser.userId);
            const lastSeenStr = await AsyncStorage.getItem(`lastSeen_${currentUser.userId}`) || '{}';
            const lastSeen = JSON.parse(lastSeenStr);

            let count = 0;
            if (conversations && Array.isArray(conversations)) {
                conversations.forEach(convo => {
                    const recipientId = convo.recipient?.userId ||
                        convo.recipientId ||
                        convo.participants?.find(id => String(id).toLowerCase() !== String(currentUser.userId).toLowerCase());

                    const lastMsgTimestamp = convo.lastMessage?.timestamp || convo.lastMessageTime || convo.createdAt;
                    const lastSeenTimestamp = lastSeen[recipientId] || 0;

                    if (lastMsgTimestamp && lastMsgTimestamp > lastSeenTimestamp) {
                        count++;
                    }
                });
            }
            setUnreadChatsCount(count);
        } catch (error) {
            console.error('Error checking unread chats:', error);
        }
    };

    const checkPendingRequests = async () => {
        if (!currentUser) return;
        try {
            const requests = await ApiService.getContactRequests(currentUser.userId);
            setPendingRequestsCount(requests?.length || 0);
        } catch (error) {
            console.error('Error checking requests:', error);
        }
    };

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: styles.tabBar,
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textSecondary,
                tabBarShowLabel: false,
            }}
        >
            <Tab.Screen
                name="RoomListTab"
                component={RoomListScreen}
                initialParams={{ username }}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon emoji="🏠" label="Salas" focused={focused} />
                    ),
                }}
            />
            <Tab.Screen
                name="ConversationsTab"
                component={ConversationsScreen}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon emoji="💬" label="Chats" focused={focused} />
                    ),
                    tabBarBadge: unreadChatsCount > 0 ? unreadChatsCount : undefined,
                    tabBarBadgeStyle: styles.badge,
                }}
            />
            <Tab.Screen
                name="ContactsTab"
                component={ContactsScreen}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon emoji="👥" label="Contactos" focused={focused} />
                    ),
                    tabBarBadge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined,
                    tabBarBadgeStyle: styles.badge,
                }}
            />
            <Tab.Screen
                name="ProfileTab"
                component={ProfileScreen}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon emoji="⚙️" label="Ajustes" focused={focused} />
                    ),
                }}
            />
        </Tab.Navigator>
    );
};

const styles = StyleSheet.create({
    tabBar: {
        backgroundColor: colors.surface,
        borderTopWidth: 0.5,
        borderTopColor: colors.border,
        height: 65,
        paddingBottom: 8,
        paddingTop: 8,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    tabIconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabEmoji: {
        fontSize: 24,
        marginBottom: 2,
    },
    tabLabel: {
        fontSize: 11,
        fontWeight: '500',
        color: colors.textSecondary,
    },
    tabLabelFocused: {
        color: colors.primary,
        fontWeight: '600',
    },
    badge: {
        backgroundColor: colors.badge,
        color: colors.badgeText,
        fontSize: 10,
        fontWeight: 'bold',
    },
});

export default MainTabs;
