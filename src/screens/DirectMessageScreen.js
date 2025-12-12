/**
 * Direct Message Screen - Encrypted 1-to-1 Chat
 */

import React, { useState, useEffect, useRef } from 'react';
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
import DirectMessageService from '../services/DirectMessageService';
import ChatMessage from '../components/ChatMessage';
import ChatInput from '../components/ChatInput';
import TypingIndicator from '../components/TypingIndicator';
import colors from '../theme/colors';

// Configuration
const isProduction = true;
const WORKER_URL = isProduction
    ? 'https://chatti-workers.wz0un.workers.dev'
    : 'http://127.0.0.1:8787';

const DirectMessageScreen = ({ route, navigation }) => {
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

    const dmServiceRef = useRef(null);
    const messageListRef = useRef([]);
    const flatListRef = useRef(null);

    // Detect navigation type (buttons vs gestures)
    useEffect(() => {
        if (Platform.OS === 'android') {
            const screenHeight = Dimensions.get('screen').height;
            const windowHeight = Dimensions.get('window').height;
            const statusBarHeight = StatusBar.currentHeight || 0;

            const navbarHeight = screenHeight - windowHeight - statusBarHeight;

            if (navbarHeight > 15) {
                setAndroidOffset(45);
            } else {
                setAndroidOffset(100);
            }
        }
    }, []);

    useEffect(() => {
        // Set navigation header
        navigation.setOptions({
            title: recipientUsername || `Chat con ${recipientId.substring(0, 8)}...`,
            headerRight: () => (
                <View style={styles.headerRight}>
                    <View style={[
                        styles.statusIndicator,
                        { backgroundColor: isConnected ? colors.connected : colors.disconnected }
                    ]} />
                    <Text style={styles.headerText}>
                        {isEncrypted ? '🔒 Cifrado' : '⚠️ No Cifrado'}
                    </Text>
                </View>
            ),
        });
    }, [navigation, recipientUsername, recipientId, isConnected, isEncrypted]);

    useEffect(() => {
        // Create DM service instance
        const dmService = new DirectMessageService();
        dmServiceRef.current = dmService;

        // Connect to conversation
        dmService.connect(conversationId, userId, username, recipientId, WORKER_URL, recipientPublicKey);

        // Event listeners
        dmService.on('connected', () => {
            console.log('Connected to DM conversation');
            setIsConnected(true);
        });

        dmService.on('disconnected', () => {
            console.log('Disconnected from DM conversation');
            setIsConnected(false);
        });

        dmService.on('error', (error) => {
            console.error('DM error:', error);
        });

        // Receive message history
        dmService.on('history', (data) => {
            console.log('Received DM history:', data.messages.length, 'messages');
            setMessageList(data.messages);
            messageListRef.current = data.messages;
        });

        // Receive new message
        dmService.on('message', (data) => {
            console.log('New DM:', data);
            // Use functional update to ensure we have latest state and avoid dupes
            setMessageList(currentList => {
                if (currentList.some(m => m.id === data.id)) {
                    console.log('Duplicate message ignored:', data.id);
                    return currentList;
                }
                const newList = [...currentList, data];
                messageListRef.current = newList;
                return newList;
            });
        });

        // User joined
        dmService.on('user_joined', (data) => {
            console.log('User joined DM:', data.username);
        });

        // User left
        dmService.on('user_left', (data) => {
            console.log('User left DM:', data.username);
        });

        // Typing indicator
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

        // Key exchanged
        dmService.on('key_exchanged', (data) => {
            console.log('Key exchanged with:', data.userId);
            setIsEncrypted(true);
        });

        // Cleanup
        return () => {
            dmService.disconnect();
        };
    }, [conversationId, userId, username, recipientId]);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (messageList.length > 0) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messageList]);

    const handleSendMessage = (message) => {
        if (dmServiceRef.current) {
            dmServiceRef.current.sendMessage(message);
        }
    };

    const handleTyping = (isTyping) => {
        if (dmServiceRef.current) {
            dmServiceRef.current.sendTypingIndicator(isTyping);
        }
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
        <SafeAreaView style={styles.container} edges={['top']}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior="padding"
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : androidOffset}
            >
                {!isConnected && (
                    <View style={styles.warningBanner}>
                        <Text style={styles.warningText}>
                            Conectando al chat cifrado...
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
                />

                {isTyping.size > 0 && (
                    <TypingIndicator usernames={Array.from(isTyping)} />
                )}

                <ChatInput
                    onSendMessage={handleSendMessage}
                    onTyping={handleTyping}
                    disabled={!isConnected}
                />
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    messageList: {
        paddingVertical: 8,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 16,
    },
    statusIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8,
    },
    headerText: {
        fontSize: 12,
        color: colors.textLight,
    },
    warningBanner: {
        backgroundColor: '#FFA500',
        padding: 8,
        alignItems: 'center',
    },
    warningText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
});

export default DirectMessageScreen;
