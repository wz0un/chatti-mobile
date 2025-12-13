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
    Keyboard,
    Dimensions,
    StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import ChatService from '../services/ChatService';
import ChatMessage from '../components/ChatMessage';
import ChatInput from '../components/ChatInput';
import TypingIndicator from '../components/TypingIndicator';
import colors from '../theme/colors';

// Configuration - Set to false for local development
const isProduction = true; // Change to false to test with local backend
const WORKER_URL = isProduction
    ? 'https://chatti-workers.wz0un.workers.dev'
    : 'http://192.168.1.100:8787'; // Replace with your computer's IP for device testing

const ChatScreen = ({ route, navigation }) => {
    const { username, roomId, roomName } = route.params;

    // Estado para el offset
    const [androidOffset, setAndroidOffset] = useState(30);

    const [messageList, setMessageList] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const [usersOnline, setUsersOnline] = useState(0);
    const [isTyping, setIsTyping] = useState(new Set());
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [connectionError, setConnectionError] = useState(null);

    const chatServiceRef = useRef(null);
    const messageListRef = useRef([]);
    const flatListRef = useRef(null);

    // Detectar tipo de navegación (Botones vs Gestos) al montar
    useEffect(() => {
        if (Platform.OS === 'android') {
            const screenHeight = Dimensions.get('screen').height;
            const windowHeight = Dimensions.get('window').height;
            const statusBarHeight = StatusBar.currentHeight || 0;

            // Calculamos la altura real de la barra de navegación
            const navbarHeight = screenHeight - windowHeight - statusBarHeight;

            // Si hay una barra de navegación física/virtual (> 15px), usamos el offset de 45
            if (navbarHeight > 15) {
                setAndroidOffset(45);
            } else {
                // Para gestos, probamos con 0 para eliminar el hueco flotante
                // Si esto queda muy pegado o tapado, lo subiremos a 30
                setAndroidOffset(100);
            }
        }
    }, []);

    useEffect(() => {
        // Set navigation header
        navigation.setOptions({
            title: roomName || `Sala: ${roomId}`,
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
    }, [navigation, roomId, roomName, isConnected, usersOnline]);

    useEffect(() => {
        // Create chat service instance
        const chatService = new ChatService();
        chatServiceRef.current = chatService;

        // Initialize notifications
        chatService.initNotifications().then(() => {
            console.log('🔔 Notifications initialized for chat');
        }).catch(error => {
            console.error('Failed to initialize notifications:', error);
        });

        // Connect to chat
        chatService.connect(roomId, username, WORKER_URL);

        // Event listeners
        chatService.on('connected', () => {
            console.log('Connected to chat');
            setIsConnected(true);
            setConnectionError(null);
            
            // Test notification on connect
            if (__DEV__) {
                chatService.notificationService.testNotification();
            }
        });

        chatService.on('disconnected', () => {
            console.log('Disconnected from chat');
            setIsConnected(false);
        });

        chatService.on('error', (error) => {
            console.error('Chat error:', error);
            setConnectionError(error.message || 'Connection error');
            setIsConnected(false);
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
        <SafeAreaView style={styles.container} edges={['top']}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior="padding"
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : androidOffset}
            >
                {connectionError && (
                    <View style={styles.errorBanner}>
                        <Text style={styles.errorText}>
                            ⚠️ {connectionError}
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
    errorBanner: {
        backgroundColor: '#FF3B30',
        padding: 8,
        alignItems: 'center',
    },
    errorText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
});

export default ChatScreen;
