/**
 * Direct Message Screen - Encrypted 1-to-1 Chat
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
    TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DirectMessageService from '../services/DirectMessageService';
import ChatHistoryService from '../services/ChatHistoryService';
import ChatMessage from '../components/ChatMessage';
import ChatInput from '../components/ChatInput';
import TypingIndicator from '../components/TypingIndicator';
import { spacing, borderRadius, typography, shadows } from '../theme/colors';
import { useTranslation } from '../i18n';
import { useTheme } from '../theme/ThemeContext';

const WORKER_URL = process.env.EXPO_PUBLIC_WORKER_URL || 'http://localhost:8788';

const DirectMessageScreen = ({ route, navigation }) => {
    const { theme, isDark } = useTheme();
    const {
        conversationId,
        recipientId,
        recipientUsername,
        recipientPublicKey,
        userId,
        username
    } = route.params;

    const [androidOffset, setAndroidOffset] = useState(30);
    const [messageList, setMessageList] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isTyping, setIsTyping] = useState(new Set());
    const [isEncrypted, setIsEncrypted] = useState(true);
    const [connectionError, setConnectionError] = useState(null);
    const [isTemporary, setIsTemporary] = useState(false);
    const [historyEnabled, setHistoryEnabled] = useState(false);
    const { t } = useTranslation();

    const dmServiceRef = useRef(null);
    const flatListRef = useRef(null);

    const updateLastSeen = useCallback(async () => {
        try {
            const lastSeenStr = await AsyncStorage.getItem(`lastSeen_${userId}`) || '{}';
            const lastSeen = JSON.parse(lastSeenStr);
            lastSeen[recipientId] = Date.now();
            await AsyncStorage.setItem(`lastSeen_${userId}`, JSON.stringify(lastSeen));
        } catch (error) {
            console.error('Error updating lastSeen:', error);
        }
    }, [userId, recipientId]);

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
        // Check chat history settings
        const checkSettings = async () => {
            ChatHistoryService.setUserId(userId);
            const enabled = await ChatHistoryService.isHistoryEnabled();
            setHistoryEnabled(enabled);
            const temp = await ChatHistoryService.isConversationTemporary(conversationId);
            setIsTemporary(temp);
        };
        checkSettings();
    }, [conversationId, userId]);

    const handleToggleTemporary = async () => {
        if (dmServiceRef.current) {
            const newValue = !isTemporary;
            await dmServiceRef.current.setTemporary(newValue);
            setIsTemporary(newValue);
        }
    };

    useEffect(() => {
        updateLastSeen();
        navigation.setOptions({
            title: recipientUsername || t('directMessage.fallbackTitle', { id: recipientId.substring(0, 8) }),
            headerRight: () => (
                <View style={styles.headerRight}>
                    {historyEnabled && (
                        <TouchableOpacity
                            onPress={handleToggleTemporary}
                            style={styles.tempToggle}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Text style={styles.tempToggleIcon}>
                                {isTemporary ? '🕐' : '💾'}
                            </Text>
                        </TouchableOpacity>
                    )}
                    <View style={[
                        styles.statusIndicator,
                        { backgroundColor: isConnected ? theme.success : theme.error }
                    ]} />
                    <Text style={[styles.headerText, { color: theme.textTertiary }]}>
                        {isEncrypted ? t('common.encrypted') : t('common.notEncrypted')}
                    </Text>
                </View>
            ),
        });
    }, [navigation, recipientUsername, recipientId, isConnected, isEncrypted, isTemporary, historyEnabled, t, theme, updateLastSeen]);

    useEffect(() => {
        const dmService = new DirectMessageService();
        dmServiceRef.current = dmService;

        dmService.connect(conversationId, userId, username, recipientId, WORKER_URL, recipientPublicKey);

        dmService.on('connected', () => { setIsConnected(true); setConnectionError(null); });
        dmService.on('disconnected', () => { setIsConnected(false); });
        dmService.on('error', (error) => { setConnectionError(error.message || t('directMessage.connectionError')); setIsConnected(false); });

        dmService.on('history', (data) => {
            setMessageList(data.messages);
            updateLastSeen();
        });

        dmService.on('message', (data) => {
            setMessageList(currentList => {
                if (currentList.some(m => m.id === data.id)) return currentList;
                updateLastSeen();
                return [...currentList, data];
            });
        });

        dmService.on('typing', (data) => {
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

        dmService.on('key_exchanged', () => { setIsEncrypted(true); });

        return () => { dmService.disconnect(); };
    }, [conversationId, userId, username, recipientId, recipientPublicKey, t, updateLastSeen]);

    useEffect(() => {
        if (messageList.length > 0) {
            setTimeout(() => { flatListRef.current?.scrollToEnd({ animated: true }); }, 100);
        }
    }, [messageList]);

    const handleSendMessage = (message) => {
        if (dmServiceRef.current) dmServiceRef.current.sendMessage(message);
    };

    const handleTyping = (typing) => {
        if (dmServiceRef.current) dmServiceRef.current.sendTypingIndicator(typing);
    };

    const renderMessage = ({ item }) => (
        <ChatMessage
            message={item.content}
            author={item.senderId === userId ? username : recipientUsername}
            username={username}
            isSystem={false}
            timestamp={item.timestamp}
        />
    );

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

                {!isConnected && !connectionError && (
                    <View style={[styles.warningBanner, { backgroundColor: theme.warning }]}>
                        <Text style={styles.bannerText}>{t('common.connectingEncrypted')}</Text>
                    </View>
                )}

                {historyEnabled && isTemporary && (
                    <View style={[styles.tempBanner, { backgroundColor: theme.surfaceSecondary || theme.surface }]}>
                        <Text style={[styles.tempBannerText, { color: theme.textSecondary }]}>
                            🕐 {t('chatHistory.temporaryBanner')}
                        </Text>
                    </View>
                )}

                <FlatList
                    ref={flatListRef}
                    data={messageList}
                    renderItem={renderMessage}
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
                        theme={theme}
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
    warningBanner: {
        padding: 8,
        alignItems: 'center',
    },
    errorBanner: {
        padding: 8,
        alignItems: 'center',
    },
    bannerText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    inputArea: {
        width: '100%',
    },
    typingContainer: {
        paddingLeft: spacing.lg,
        paddingBottom: spacing.xs,
    },
    tempToggle: {
        marginRight: 8,
        padding: 2,
    },
    tempToggleIcon: {
        fontSize: 16,
    },
    tempBanner: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        alignItems: 'center',
    },
    tempBannerText: {
        fontSize: 12,
        fontWeight: '600',
    },
});

export default DirectMessageScreen;
