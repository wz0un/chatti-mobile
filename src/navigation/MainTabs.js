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
import { useTranslation } from '../i18n';

const Tab = createBottomTabNavigator();

const TabIcon = ({ emoji, label, focused }) => (
    <View style={[styles.tabIconWrapper, focused && styles.tabIconWrapperFocused]}>
        <View style={[styles.tabIconContainer, focused && styles.tabIconContainerFocused]}>
            <Text style={[styles.tabEmoji, focused && styles.tabEmojiFocused]}>{emoji}</Text>
        </View>
        <Text
            style={[styles.tabLabel, focused && styles.tabLabelFocused]}
            numberOfLines={1}
            adjustsFontSizeToFit
        >
            {label}
        </Text>
        {focused && <View style={styles.activeIndicator} />}
    </View>
);

const MainTabs = ({ route, navigation }) => {
    const username = route.params?.username;
    const [currentUser, setCurrentUser] = useState(null);
    const [unreadChatsCount, setUnreadChatsCount] = useState(0);
    const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
    const { t } = useTranslation();

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
                tabBarHideOnKeyboard: true,
            }}
        >
            <Tab.Screen
                name="RoomListTab"
                component={RoomListScreen}
                initialParams={{ username }}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon emoji="🏠" label={t('tabs.rooms')} focused={focused} />
                    ),
                }}
            />
            <Tab.Screen
                name="ConversationsTab"
                component={ConversationsScreen}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon emoji="💬" label={t('tabs.chats')} focused={focused} />
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
                        <TabIcon emoji="👥" label={t('tabs.contacts')} focused={focused} />
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
                        <TabIcon emoji="⚙️" label={t('tabs.profile')} focused={focused} />
                    ),
                }}
            />
        </Tab.Navigator>
    );
};

const styles = StyleSheet.create({
    tabBar: {
        backgroundColor: colors.surface,
        borderTopWidth: 0, // Sin borde superior para look moderno
        height: 70, // Un poco más alto
        paddingBottom: 10,
        paddingTop: 10,
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        position: 'absolute', // Flotante
        bottom: 0,
        left: 0,
        right: 0,
    },
    tabIconWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        minWidth: 80, // Ancho mínimo para que quepa el texto
        paddingTop: 4,
    },
    tabIconWrapperFocused: {
        // Estímulo extra si se desea
    },
    tabIconContainer: {
        width: 32, // Reducido para dejar espacio al texto
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
        marginBottom: 4,
    },
    tabIconContainerFocused: {
        // backgroundColor: colors.primary + '15', // Opcional: fondo suave tras el icono
    },
    tabEmoji: {
        fontSize: 22,
        opacity: 0.7,
    },
    tabEmojiFocused: {
        opacity: 1,
        transform: [{ scale: 1.1 }], // Efecto de zoom ligero
    },
    tabLabel: {
        fontSize: 10,
        fontWeight: '500',
        color: colors.textTertiary,
        textAlign: 'center',
        width: '90%', // Evitar que pegue a los bordes
    },
    tabLabelFocused: {
        color: colors.primary,
        fontWeight: '700',
        fontSize: 11,
    },
    activeIndicator: {
        position: 'absolute',
        top: -10, // Debajo del borde superior de la barra
        width: 20,
        height: 3,
        backgroundColor: colors.primary,
        borderRadius: 2,
    },
    badge: {
        backgroundColor: colors.badge || '#FF3B30',
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
        marginTop: -2,
    },
});

export default MainTabs;
