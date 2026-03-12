/**
 * Main Tabs Navigator - Bottom navigation like Telegram
 */

import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RoomListScreen from '../screens/RoomListScreen';
import ConversationsScreen from '../screens/ConversationsScreen';
import ContactsScreen from '../screens/ContactsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ApiService from '../services/ApiService';
import AuthService from '../services/AuthService';
import { useTranslation } from '../i18n';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius } from '../theme/colors';
import * as Notifications from 'expo-notifications';

const Tab = createBottomTabNavigator();

const TabIcon = ({ emoji, label, focused, theme, isDark }) => (
    <View style={[styles.tabIconWrapper, focused && styles.tabIconWrapperFocused]}>
        <View style={styles.tabIconContainer}>
            <Text style={[styles.tabEmoji, { opacity: focused ? 1 : 0.6, transform: [{ scale: focused ? 1.1 : 1 }] }]}>
                {emoji}
            </Text>
        </View>
        <Text
            style={[
                styles.tabLabel,
                { color: focused ? theme.primary : theme.textTertiary, fontWeight: focused ? '700' : '500' }
            ]}
            numberOfLines={1}
        >
            {label}
        </Text>
        {focused && <View style={[styles.activeIndicator, { backgroundColor: theme.primary }]} />}
    </View>
);

const MainTabs = ({ route, navigation }) => {
    const { theme, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const username = route.params?.username;
    const [currentUser, setCurrentUser] = useState(null);
    const [unreadChatsCount, setUnreadChatsCount] = useState(0);
    const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
    const { t } = useTranslation();

    useEffect(() => {
        const loadUser = async () => {
            const user = await AuthService.getCurrentUser();
            setCurrentUser(user);
        };
        loadUser();
    }, []);

    useEffect(() => {
        if (!currentUser) return;

        checkUnreadChats();
        checkPendingRequests();

        const interval = setInterval(() => {
            checkUnreadChats();
            checkPendingRequests();
        }, 30000);

        const notificationListener = Notifications.addNotificationReceivedListener(notification => {
            checkUnreadChats();
            checkPendingRequests();
        });

        const unsubscribe = navigation.addListener('focus', () => {
            checkUnreadChats();
            checkPendingRequests();
        });

        return () => {
            clearInterval(interval);
            unsubscribe();
            Notifications.removeNotificationSubscription(notificationListener);
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
                tabBarStyle: [
                    styles.tabBar, 
                    { 
                        backgroundColor: theme.surface,
                        height: Platform.OS === 'ios' ? 88 : 70 + Math.max(insets.bottom, 0),
                        paddingBottom: Platform.OS === 'ios' ? insets.bottom : Math.max(insets.bottom, 10),
                    }
                ],
                tabBarActiveTintColor: theme.primary,
                tabBarInactiveTintColor: theme.textTertiary,
                tabBarShowLabel: false,
                tabBarHideOnKeyboard: true,
            }}
        >
            <Tab.Screen
                name="RoomListTab"
                component={RoomListScreen}
                initialParams={{ username }}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon emoji="🏠" label={t('tabs.rooms')} focused={focused} theme={theme} isDark={isDark} />
                    ),
                }}
            />
            <Tab.Screen
                name="ConversationsTab"
                component={ConversationsScreen}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon emoji="💬" label={t('tabs.chats')} focused={focused} theme={theme} isDark={isDark} />
                    ),
                    tabBarBadge: unreadChatsCount > 0 ? unreadChatsCount : undefined,
                    tabBarBadgeStyle: [styles.badge, { backgroundColor: theme.error }],
                }}
            />
            <Tab.Screen
                name="ContactsTab"
                component={ContactsScreen}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon emoji="👥" label={t('tabs.contacts')} focused={focused} theme={theme} isDark={isDark} />
                    ),
                    tabBarBadge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined,
                    tabBarBadgeStyle: [styles.badge, { backgroundColor: theme.error }],
                }}
            />
            <Tab.Screen
                name="ProfileTab"
                component={ProfileScreen}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon emoji="⚙️" label={t('tabs.profile')} focused={focused} theme={theme} isDark={isDark} />
                    ),
                }}
            />
        </Tab.Navigator>
    );
};

const styles = StyleSheet.create({
    tabBar: {
        borderTopWidth: 0,
        height: 70,
        paddingBottom: 10,
        paddingTop: 10,
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    tabIconWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 80,
        paddingTop: 4,
    },
    tabIconContainer: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    tabEmoji: {
        fontSize: 22,
    },
    tabLabel: {
        fontSize: 10,
        textAlign: 'center',
        width: '90%',
    },
    activeIndicator: {
        position: 'absolute',
        top: -10,
        width: 24,
        height: 3,
        borderRadius: 2,
    },
    badge: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
        marginTop: -2,
    },
});

export default MainTabs;
