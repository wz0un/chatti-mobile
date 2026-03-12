/**
 * Conversations Screen
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    Text,
    RefreshControl,
    TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from '../services/ApiService';
import AuthService from '../services/AuthService';
import ConversationListItem from '../components/ConversationListItem';
import { useTranslation } from '../i18n';
import { useTheme } from '../theme/ThemeContext';
import { useAlert } from '../theme/AlertContext';
import { spacing, borderRadius, shadows, typography } from '../theme/colors';
import * as Notifications from 'expo-notifications';
import GlobalNotificationService from '../services/GlobalNotificationService';

const ConversationsScreen = ({ navigation }) => {
    const { theme } = useTheme();
    const { alert } = useAlert();
    const insets = useSafeAreaInsets();
    const [conversations, setConversations] = useState([]);
    const [filteredConversations, setFilteredConversations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [lastSeenData, setLastSeenData] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [isOnline, setIsOnline] = useState(true);
    const { t } = useTranslation();

    useEffect(() => {
        const unsubscribe = GlobalNotificationService.addConnectionListener(setIsOnline);
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    useEffect(() => {
        loadCurrentUser();
    }, []);

    useEffect(() => {
        if (currentUser) {
            loadConversations();
            loadLastSeen();
        }
    }, [currentUser]);

    useEffect(() => {
        let interval;
        let notificationListener;
        if (currentUser) {
            interval = setInterval(() => {
                loadConversations(false);
            }, 30000);

            // Listen for foreground push notifications to refresh immediately
            notificationListener = Notifications.addNotificationReceivedListener(notification => {
                loadConversations(false);
                loadLastSeen();
            });
        }
        return () => {
            clearInterval(interval);
            if (notificationListener) {
                Notifications.removeNotificationSubscription(notificationListener);
            }
        };
    }, [currentUser]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            if (currentUser) {
                loadConversations(false);
                loadLastSeen();
            }
        });
        return unsubscribe;
    }, [navigation, currentUser]);

    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredConversations(conversations);
        } else {
            const query = searchQuery.toLowerCase();
            const filtered = conversations.filter(convo => {
                const username = (convo.recipient?.username || convo.recipientUsername || '').toLowerCase();
                return username.includes(query);
            });
            setFilteredConversations(filtered);
        }
    }, [searchQuery, conversations]);

    const loadCurrentUser = async () => {
        const user = await AuthService.getCurrentUser();
        setCurrentUser(user);
    };

    const loadLastSeen = async () => {
        if (!currentUser) return;
        try {
            const data = await AsyncStorage.getItem(`lastSeen_${currentUser.userId}`);
            if (data) {
                setLastSeenData(JSON.parse(data));
            }
        } catch (error) {
            console.error('Error loading lastSeen:', error);
        }
    };

    const loadConversations = async (showLoading = true) => {
        if (!currentUser) return;
        try {
            if (showLoading) setLoading(true);
            const convos = await ApiService.getUserConversations(currentUser.userId);

            if (!convos || !Array.isArray(convos)) {
                setConversations([]);
                return;
            }

            const uniqueConvos = [];
            const seenRecipients = new Set();
            const currentUserId = String(currentUser.userId).toLowerCase();

            const sortedConvos = [...convos].sort((a, b) => {
                const timeA = new Date(a.lastMessage?.timestamp || a.lastMessageTime || a.createdAt || 0).getTime();
                const timeB = new Date(b.lastMessage?.timestamp || b.lastMessageTime || b.createdAt || 0).getTime();
                return timeB - timeA;
            });

            for (const convo of sortedConvos) {
                const otherParticipant = convo.participants?.find(p => String(p).toLowerCase() !== currentUserId);
                const rId = convo.recipient?.userId || convo.recipientId || otherParticipant || convo.id;
                const normalizedRecipientId = String(rId).toLowerCase();

                if (!seenRecipients.has(normalizedRecipientId)) {
                    uniqueConvos.push({
                        ...convo,
                        normalizedRecipientId,
                        recipientUsername: convo.recipient?.username || convo.recipientUsername || 'Usuario'
                    });
                    seenRecipients.add(normalizedRecipientId);
                }
            }
            setConversations(uniqueConvos);
        } catch (error) {
            console.error('Error loading conversations:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleLongPress = (conversation) => {
        alert({
            title: t('conversations.deleteTitle'),
            message: t('conversations.deleteMessage'),
            confirmText: t('conversations.deleteConfirm'),
            type: 'error',
            onConfirm: () => deleteConversation(conversation.conversationId || conversation.id)
        });
    };

    const deleteConversation = async (conversationId) => {
        try {
            setLoading(true);
            await ApiService.deleteConversation(currentUser.userId, conversationId);
            loadConversations();
        } catch (error) {
            console.error('Error deleting conversation:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderConversation = ({ item }) => {
        const recipientId = item.normalizedRecipientId;
        const msgTime = item.lastMessage?.timestamp || item.lastMessageTime || item.createdAt;
        const timestamp = msgTime ? new Date(msgTime).getTime() : 0;
        const lastSeenTime = Number(lastSeenData[recipientId]) || 0;
        const isUnread = timestamp > lastSeenTime && timestamp > 0;

        return (
            <ConversationListItem
                conversation={item}
                currentUserId={currentUser?.userId}
                isUnread={isUnread}
                onPress={() => {
                    navigation.navigate('DirectMessage', {
                        conversationId: item.conversationId || item.id,
                        recipientId: recipientId,
                        recipientUsername: item.recipient?.fullUsername || item.recipientUsername || recipientId,
                        recipientPublicKey: item.recipient?.publicKey,
                        userId: currentUser.userId,
                        username: currentUser.fullUsername,
                    });
                }}
                onLongPress={() => handleLongPress(item)}
            />
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
            <View style={[styles.header, { backgroundColor: theme.surface }]}>
                <View style={styles.headerTitleContainer}>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>{t('conversations.headerTitle')}</Text>
                    <View style={[styles.onlineIndicator, { backgroundColor: isOnline ? theme.success : theme.error }]} />
                </View>
            </View>

            <View style={[styles.searchContainer, { backgroundColor: theme.background }]}>
                <View style={[styles.searchWrapper, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
                    <Text style={styles.searchIcon}>🔍</Text>
                    <TextInput
                        style={[styles.searchInput, { color: theme.text }]}
                        placeholder={t('usersList.placeholder')}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor={theme.textTertiary}
                    />
                </View>
            </View>

            {loading && conversations.length === 0 ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            ) : filteredConversations.length === 0 ? (
                <View style={styles.centerContainer}>
                    <Text style={[styles.emptyIcon, { color: theme.primary + '40' }]}>💬</Text>
                    <Text style={[styles.emptyText, { color: theme.text }]}>
                        {searchQuery ? t('usersList.emptySearch') : t('conversations.emptyTitle')}
                    </Text>
                    <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
                        {searchQuery ? t('common.error') : t('conversations.emptySubtitle')}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={filteredConversations}
                    renderItem={renderConversation}
                    keyExtractor={(item) => (item.id || item.conversationId) + '-' + item.normalizedRecipientId}
                    contentContainerStyle={[styles.list, { paddingBottom: 100 + insets.bottom }]}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => { setRefreshing(true); loadConversations(false); loadLastSeen(); }}
                            colors={[theme.primary]}
                            tintColor={theme.primary}
                        />
                    }
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    headerTitle: {
        ...typography.h2,
        fontWeight: '900',
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    onlineIndicator: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginLeft: spacing.sm,
    },
    searchContainer: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
    },
    searchWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.md,
        height: 48,
        borderWidth: 1,
    },
    searchIcon: {
        fontSize: 16,
        marginRight: spacing.sm,
        opacity: 0.7,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
    },
    list: {
        paddingBottom: 100,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    emptyIcon: {
        fontSize: 80,
        marginBottom: spacing.lg,
    },
    emptyText: {
        ...typography.h3,
        marginBottom: spacing.xs,
        textAlign: 'center',
    },
    emptySubtext: {
        ...typography.body,
        textAlign: 'center',
    },
});

export default ConversationsScreen;
