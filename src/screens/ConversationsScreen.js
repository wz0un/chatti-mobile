/**
 * Conversations Screen
 * List active direct message conversations
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    Text,
    Alert,
    RefreshControl,
    TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from '../services/ApiService';
import AuthService from '../services/AuthService';
import ConversationListItem from '../components/ConversationListItem';
import colors from '../theme/colors';

const ConversationsScreen = ({ navigation }) => {
    const [conversations, setConversations] = useState([]);
    const [filteredConversations, setFilteredConversations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [lastSeenData, setLastSeenData] = useState({});
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadCurrentUser();
    }, []);

    useEffect(() => {
        if (currentUser) {
            loadConversations();
            loadLastSeen();
        }
    }, [currentUser]);

    // Intervalo de actualización automática (cada 30 segundos) como en la web
    useEffect(() => {
        let interval;
        if (currentUser) {
            interval = setInterval(() => {
                loadConversations(false);
            }, 30000);
        }
        return () => clearInterval(interval);
    }, [currentUser]);

    // Refrescar al volver a la pantalla
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            if (currentUser) {
                loadConversations(false);
                loadLastSeen();
            }
        });
        return unsubscribe;
    }, [navigation, currentUser]);

    // Filtrar conversaciones cuando cambia la búsqueda o la lista
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

            // Lógica de deduplicación y ordenación (Misma que en la web)
            const uniqueConvos = [];
            const seenRecipients = new Set();

            const sortedConvos = [...convos].sort((a, b) => {
                const timeA = new Date(a.lastMessage?.timestamp || a.lastMessageTime || a.createdAt || 0).getTime();
                const timeB = new Date(b.lastMessage?.timestamp || b.lastMessageTime || b.createdAt || 0).getTime();
                return timeB - timeA;
            });

            const currentUserId = String(currentUser.userId).toLowerCase();

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
            if (showLoading) Alert.alert('Error', 'No se pudieron cargar las conversaciones');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadConversations(false);
        loadLastSeen();
    };

    const handleConversationPress = (conversation) => {
        const recipientId = conversation.normalizedRecipientId;

        navigation.navigate('DirectMessage', {
            conversationId: conversation.conversationId || conversation.id,
            recipientId: recipientId,
            recipientUsername: conversation.recipient?.fullUsername || conversation.recipientUsername || recipientId,
            recipientPublicKey: conversation.recipient?.publicKey,
            userId: currentUser.userId,
            username: currentUser.fullUsername,
        });
    };

    const handleLongPress = (conversation) => {
        Alert.alert(
            'Eliminar chat',
            '¿Estás seguro de que quieres eliminar este chat?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: () => deleteConversation(conversation.conversationId || conversation.id)
                }
            ]
        );
    };

    const deleteConversation = async (conversationId) => {
        try {
            setLoading(true);
            await ApiService.deleteConversation(currentUser.userId, conversationId);
            loadConversations();
        } catch (error) {
            console.error('Error deleting conversation:', error);
            Alert.alert('Error', 'No se pudo eliminar el chat');
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
                onPress={() => handleConversationPress(item)}
                onLongPress={() => handleLongPress(item)}
            />
        );
    };

    if (!currentUser) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar chat..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor={colors.textLight}
                />
            </View>

            {loading && conversations.length === 0 ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : filteredConversations.length === 0 ? (
                <View style={styles.centerContainer}>
                    <Text style={styles.emptyText}>
                        {searchQuery ? 'No se encontraron resultados' : 'No tienes conversaciones activas'}
                    </Text>
                    <Text style={styles.emptySubtext}>
                        {searchQuery ? 'Intenta con otro nombre' : 'Ve a "Usuarios" para iniciar un chat'}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={filteredConversations}
                    renderItem={renderConversation}
                    keyExtractor={(item) => (item.id || item.conversationId) + '-' + item.normalizedRecipientId}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            colors={[colors.primary]}
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
        backgroundColor: colors.background,
    },
    searchContainer: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: colors.surface,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.border,
    },
    searchInput: {
        backgroundColor: colors.inputBackground,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 15,
        color: colors.text,
        borderWidth: 0,
    },
    list: {
        flexGrow: 1,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
        backgroundColor: colors.background,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    emptySubtext: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
});

export default ConversationsScreen;

