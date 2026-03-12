/**
 * Chat Screen - Public Group Chat
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    FlatList,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Text,
    ActivityIndicator,
    Dimensions,
    StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import ChatService from '../services/ChatService';
import ChatMessage from '../components/ChatMessage';
import ChatInput from '../components/ChatInput';
import TypingIndicator from '../components/TypingIndicator';
import { spacing, typography } from '../theme/colors';
import { useTranslation } from '../i18n';
import { useTheme } from '../theme/ThemeContext';

const WORKER_URL = process.env.EXPO_PUBLIC_WORKER_URL || 'http://localhost:8788';

const ChatScreen = ({ route, navigation }) => {
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();
    const { username, roomId, roomName, userId } = route.params;
    const [messageList, setMessageList] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isTyping, setIsTyping] = useState(new Set());
    const [androidOffset, setAndroidOffset] = useState(30);
    const { t } = useTranslation();

    const chatServiceRef = useRef(null);
    const flatListRef = useRef(null);

    useEffect(() => {
        if (Platform.OS === 'android') {
            const screenHeight = Dimensions.get('screen').height;
            const windowHeight = Dimensions.get('window').height;
            const statusBarHeight = StatusBar.currentHeight || 0;
            const navbarHeight = screenHeight - windowHeight - statusBarHeight;
            // Restaurando la lógica exacta de la rama feature/chat-one-emote
            setAndroidOffset(navbarHeight > 15 ? 45 : 100);
        }
    }, []);

    useEffect(() => {
        navigation.setOptions({
            title: roomName || t('chat.defaultTitle'),
            headerRight: () => (
                <View style={styles.headerRight}>
                    <View style={[
                        styles.statusIndicator,
                        { backgroundColor: isConnected ? theme.success : theme.error }
                    ]} />
                    <Text style={[styles.headerText, { color: theme.textTertiary }]}>
                        {isConnected ? t('common.online') : t('common.offline')}
                    </Text>
                </View>
            ),
        });
    }, [navigation, roomName, isConnected, theme, t]);

    useEffect(() => {
        const chatService = new ChatService();
        chatServiceRef.current = chatService;

        chatService.connect(roomId, username, WORKER_URL);

        chatService.on('connected', () => setIsConnected(true));
        chatService.on('disconnected', () => setIsConnected(false));

        chatService.on('history', (data) => {
            setMessageList(data.messages);
        });

        chatService.on('message', (data) => {
            setMessageList(currentList => {
                if (currentList.some(m => m.id === data.id)) return currentList;
                return [...currentList, data];
            });
        });

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

        return () => {
            chatService.disconnect();
        };
    }, [roomId, username]);

    useEffect(() => {
        if (messageList.length > 0) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messageList]);

    const handleSendMessage = (message) => {
        if (chatServiceRef.current) {
            chatServiceRef.current.sendMessage(message);
        }
    };

    const handleTyping = (typing) => {
        if (chatServiceRef.current) {
            chatServiceRef.current.sendTypingIndicator(typing);
        }
    };

    const renderMessage = ({ item }) => (
        <ChatMessage
            message={item.content}
            author={item.username}
            username={username}
            isSystem={item.isSystem}
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
                {!isConnected && (
                    <View style={[styles.connectingBanner, { backgroundColor: theme.warning }]}>
                        <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.connectingText}>{t('common.connecting')}</Text>
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
    },
    inputArea: {
        width: '100%',
    },
    typingContainer: {
        paddingLeft: spacing.lg,
        paddingBottom: spacing.xs,
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
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    connectingBanner: {
        flexDirection: 'row',
        padding: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    connectingText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
});

export default ChatScreen;
