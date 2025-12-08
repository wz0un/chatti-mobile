/**
 * Chat Screen - Main chat interface
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    FlatList,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Text,
    TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ChatService from '../services/ChatService';
import ChatMessage from '../components/ChatMessage';
import ChatInput from '../components/ChatInput';
import TypingIndicator from '../components/TypingIndicator';
import colors from '../theme/colors';

// Configuration
const isProduction = true; // Change based on your deployment
const WORKER_URL = isProduction
    ? 'https://chatti-workers.wz0un.workers.dev'
    : 'http://127.0.0.1:8787';

const ChatScreen = ({ route, navigation }) => {
    const { username, roomId } = route.params;

    const [messageList, setMessageList] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const [usersOnline, setUsersOnline] = useState(0);
    const [isTyping, setIsTyping] = useState(new Set());

    const chatServiceRef = useRef(null);
    const messageListRef = useRef([]);
    const flatListRef = useRef(null);

    useEffect(() => {
        // Set navigation header
        navigation.setOptions({
            title: `Sala: ${roomId}`,
            headerRight: () => (
                <View style={styles.headerRight}>
                    <View style={[
                        styles.statusIndicator,
                        { backgroundColor: isConnected ? colors.connected : colors.disconnected }
                    ]} />
                    <Text style={styles.headerText}>
                        {usersOnline} {usersOnline === 1 ? 'usuario' : 'usuarios'}
                    </Text>
                </View>
            ),
        });
    }, [navigation, roomId, isConnected, usersOnline]);

    useEffect(() => {
        // Create chat service instance
        const chatService = new ChatService();
        chatServiceRef.current = chatService;

        // Initialize notifications
        chatService.initNotifications();

        // Connect to chat
        chatService.connect(roomId, username, WORKER_URL);

        // Event listeners
        chatService.on('connected', () => {
            console.log('Connected to chat');
            setIsConnected(true);
        });

        chatService.on('disconnected', () => {
            console.log('Disconnected from chat');
            setIsConnected(false);
        });

        chatService.on('error', (error) => {
            console.error('Chat error:', error);
        });

        // Receive message history
        chatService.on('history', (data) => {
            console.log('Received history:', data.messages.length, 'messages');
            messageListRef.current = data.messages;
            setMessageList(data.messages);
        });

        // Receive new message
        chatService.on('message', (data) => {
            console.log('New message:', data);
            const newMessage = {
                id: data.id,
                username: data.username,
                content: data.content,
                timestamp: data.timestamp,
            };

            messageListRef.current = [...messageListRef.current, newMessage];
            setMessageList(messageListRef.current);
        });

        // User joined
        chatService.on('user_joined', (data) => {
            console.log('User joined:', data.username);
            setUsersOnline(data.totalUsers);

            const systemMessage = {
                id: `system_${Date.now()}`,
                username: 'Sistema',
                content: `${data.username} se unió al chat`,
                timestamp: data.timestamp,
                isSystem: true,
            };
            messageListRef.current = [...messageListRef.current, systemMessage];
            setMessageList(messageListRef.current);
        });

        // User left
        chatService.on('user_left', (data) => {
            console.log('User left:', data.username);
            setUsersOnline(data.totalUsers);

            const systemMessage = {
                id: `system_${Date.now()}`,
                username: 'Sistema',
                content: `${data.username} salió del chat`,
                timestamp: data.timestamp,
                isSystem: true,
            };
            messageListRef.current = [...messageListRef.current, systemMessage];
            setMessageList(messageListRef.current);
        });

        // User list
        chatService.on('user_list', (data) => {
            console.log('Users online:', data.users);
            setUsersOnline(data.totalUsers);
        });

        // Typing indicator
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

        // Cleanup
        return () => {
            chatService.disconnect();
        };
    }, [roomId, username]);

    // Auto-scroll to bottom when new messages arrive
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

    const handleTyping = (isTyping) => {
        if (chatServiceRef.current) {
            chatServiceRef.current.sendTypingIndicator(isTyping);
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
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={0}
            >
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
});

export default ChatScreen;
