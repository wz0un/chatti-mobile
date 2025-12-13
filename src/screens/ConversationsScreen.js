/**
 * Conversations Screen
 * List active direct message conversations
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    Text,
    Alert,
    RefreshControl,
    TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ApiService from '../services/ApiService';
import AuthService from '../services/AuthService';
import ConversationListItem from '../components/ConversationListItem';
import AppLogo from '../components/AppLogo';
import colors from '../theme/colors';

const ConversationsScreen = ({ navigation }) => {
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        loadCurrentUser();
    }, []);

    useEffect(() => {
        if (currentUser) {
            loadConversations();
        }
    }, [currentUser]);

    // Refresh when screen comes into focus
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            if (currentUser) {
                loadConversations();
            }
        });

        return unsubscribe;
    }, [navigation, currentUser]);

    const loadCurrentUser = async () => {
        const user = await AuthService.getCurrentUser();
        setCurrentUser(user);
    };

    const loadConversations = async () => {
        if (!currentUser) return;

        try {
            setLoading(true);
            const result = await ApiService.getUserConversations(currentUser.userId);
            setConversations(result);
        } catch (error) {
            console.error('Error loading conversations:', error);
            Alert.alert('Error', 'No se pudieron cargar las conversaciones');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadConversations();
    };

    const handleConversationPress = (conversation) => {
        // Get the other participant ID
        const recipientId = conversation.participants.find(
            id => id !== currentUser.userId
        );

        navigation.navigate('DirectMessage', {
            conversationId: conversation.conversationId,
            recipientId: recipientId,
            recipientUsername: conversation.recipient?.fullUsername || recipientId,
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
                    onPress: () => deleteConversation(conversation.conversationId)
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

    const renderConversation = ({ item }) => (
        <ConversationListItem
            conversation={item}
            currentUserId={currentUser?.userId}
            onPress={() => handleConversationPress(item)}
            onLongPress={() => handleLongPress(item)}
        />
    );

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
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <AppLogo size={32} showText={false} />
                    <Text style={styles.headerTitle}>i chatti</Text>
                </View>
            </View>

            {loading && conversations.length === 0 ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : conversations.length === 0 ? (
                <View style={styles.centerContainer}>
                    <AppLogo size={80} showText={true} />
                    <Text style={styles.emptyText}>
                        No tienes conversaciones activas
                    </Text>
                    <Text style={styles.emptySubtext}>
                        Ve a "Contactos" para iniciar un chat
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={conversations}
                    renderItem={renderConversation}
                    keyExtractor={(item) => item.conversationId}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            colors={[colors.primary]}
                            tintColor={colors.primary}
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
    header: {
        backgroundColor: colors.surface,
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.primary,
        marginLeft: 12,
    },
    list: {
        flexGrow: 1,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginTop: 20,
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: colors.textLight,
        textAlign: 'center',
    },
});

export default ConversationsScreen;
