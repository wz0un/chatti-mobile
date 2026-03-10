/**
 * Chat Screen - Main chat interface
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    FlatList,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Text,
    Dimensions,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ChatService from '../services/ChatService';
import AuthService from '../services/AuthService';
import ChatMessage from '../components/ChatMessage';
import ChatInput from '../components/ChatInput';
import TypingIndicator from '../components/TypingIndicator';
import { spacing, typography } from '../theme/colors';
import { useTranslation } from '../i18n';
import { useTheme } from '../theme/ThemeContext';

const WORKER_URL = process.env.EXPO_PUBLIC_WORKER_URL || 'http://localhost:8788';

const ChatScreen = ({ route, navigation }) => {
    const { theme, isDark } = useTheme();
    const { username, roomId, roomName } = route.params;
    const { t } = useTranslation();

    const [androidOffset, setAndroidOffset] = useState(30);
    const [messageList, setMessageList] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const [usersOnline, setUsersOnline] = useState(0);
    const [isTyping, setIsTyping] = useState(new Set());
    const [connectionError, setConnectionError] = useState(null);

    const chatServiceRef = useRef(null);
    const flatListRef = useRef(null);

    useEffect(() => {
        if (Platform.OS === 'android') {
            const screenHeight = Dimensions.get('screen').height;
            const windowHeight = Dimensions.get('window').height;
            const statusBarHeight = StatusBar.currentHeight || 0;
            const navbarHeight = screenHeight - windowHeight - statusBarHeight;
            setAndroidOffset(navbarHeight > 15 ? 45 : 100);
        }
    }, []);

    useEffect(() => {
        navigation.setOptions({
            title: roomName || `${t('navigator.roomsBack')}: ${roomId}`,
            headerRight: () => (
                <View style={styles.headerRight}>
                    <View style={[
                        styles.statusIndicator,
                        { backgroundColor: isConnected ? theme.success : theme.error }
                    ]} />
                    <Text style={[styles.headerText, { color: theme.textTertiary }]}>
                        {usersOnline === 1
                            ? t('chat.userCountOne', { count: usersOnline })
                            : t('chat.userCountOther', { count: usersOnline })}
                    </Text>
                </View>
            ),
        });
    }, [navigation, roomId, roomName, isConnected, usersOnline, t, theme]);

    useEffect(() => {
        const chatService = new ChatService();
        chatServiceRef.current = chatService;

        // Load user ID for history
        const initChat = async () => {
            const currentUser = await AuthService.getCurrentUser();
            const userId = currentUser?.userId || null;

            chatService.initNotifications().catch(error => console.error('Failed to init notifications:', error));
            chatService.connect(roomId, username, WORKER_URL, userId);
        };

        // Handle saved history from local storage
        chatService.on('saved_history', (data) => {
            setMessageList(prev => {
                if (prev.length === 0) return data.messages;
                return prev;
            });
        });

        chatService.on('connected', () => { setIsConnected(true); setConnectionError(null); });
        chatService.on('disconnected', () => { setIsConnected(false); });
        chatService.on('error', (error) => { setConnectionError(error.message || t('chat.connectionError')); setIsConnected(false); });

        chatService.on('history', (data) => setMessageList(data.messages || []));
        chatService.on('message', (data) => {
            if (data && data.content) {
                setMessageList(currentList => [...currentList, data]);
            }
        });

        chatService.on('user_joined', (data) => {
            setUsersOnline(data.totalUsers);
            setMessageList(currentList => [...currentList, {
                id: `system_join_${Date.now()}`,
                username: t('common.system'),
                content: t('chat.joined', { username: data.username }),
                timestamp: data.timestamp,
                isSystem: true,
            }]);
        });

        chatService.on('user_left', (data) => {
            setUsersOnline(data.totalUsers);
            setMessageList(currentList => [...currentList, {
                id: `system_left_${Date.now()}`,
                username: t('common.system'),
                content: t('chat.left', { username: data.username }),
                timestamp: data.timestamp,
                isSystem: true,
            }]);
        });

        chatService.on('user_list', (data) => setUsersOnline(data.totalUsers));

        chatService.on('typing', (data) => {
            if (data.isTyping) {
                setIsTyping((prev) => new Set(prev).add(data.username));
            } else {
                setIsTyping((prev) => {
                    const newSet = new Set(prev);
                    newSet.delete(data.username);
                    return newSet;
                });
            }
        });

        initChat();

        return () => chatService.disconnect();
    }, [roomId, username, t]);

    useEffect(() => {
        if (messageList.length > 0) {
            setTimeout(() => { flatListRef.current?.scrollToEnd({ animated: true }); }, 100);
        }
    }, [messageList]);

    const handleSendMessage = (message) => {
        if (chatServiceRef.current) chatServiceRef.current.sendMessage(message);
    };

    const handleTyping = (typing) => {
        if (chatServiceRef.current) chatServiceRef.current.sendTypingIndicator(typing);
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior="padding"
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : androidOffset}
            >
                {connectionError && (
                    <View style={[styles.errorBanner, { backgroundColor: theme.error }]}>
                        <Text style={styles.bannerText}>⚠️ {connectionError}</Text>
                    </View>
                )}

                <FlatList
                    ref={flatListRef}
                    data={messageList}
                    renderItem={({ item }) => (
                        <ChatMessage
                            message={item.content}
                            author={item.username}
                            username={username}
                            isSystem={item.isSystem}
                            timestamp={item.timestamp}
                        />
                    )}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.messageList}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
                    showsVerticalScrollIndicator={false}
                />

                <View style={styles.inputArea}>
                    {isTyping.size > 0 && (
                        <View style={styles.typingContainer}>
                            <TypingIndicator usernames={Array.from(isTyping)} />
                        </View>
                    )}
                    <ChatInput
                        onSendMessage={handleSendMessage}
                        onTyping={handleTyping}
                        disabled={!isConnected}
                    />
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    messageList: {
        paddingVertical: spacing.md,
        paddingBottom: spacing.xl,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    statusIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8,
    },
    headerText: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    errorBanner: {
        padding: 8,
        alignItems: 'center',
    },
    bannerText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    inputArea: {
        width: '100%',
    },
    typingContainer: {
        paddingLeft: spacing.lg,
        paddingBottom: spacing.xs,
    }
});

export default ChatScreen;
