/**
 * Conversation List Item Component
 * Displays a conversation in the conversations list
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import colors from '../theme/colors';

const ConversationListItem = ({ conversation, currentUserId, isUnread, onPress, onLongPress }) => {
    // Get the other participant ID
    const otherUserId = conversation.participants?.find(id => id !== currentUserId) || conversation.normalizedRecipientId;

    // Use enriched recipient data if available
    const displayName = conversation.recipient?.fullUsername || conversation.recipientUsername || otherUserId;
    const initial = (conversation.recipient?.username || conversation.recipientUsername || otherUserId).charAt(0).toUpperCase();

    // Extract last message preview
    let lastMsg = 'Sin mensajes aún';
    if (conversation.lastMessage) {
        lastMsg = typeof conversation.lastMessage === 'object'
            ? (conversation.lastMessage.content || '🔒 Mensaje Cifrado')
            : conversation.lastMessage;
    }

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 86400000) { // Less than 24 hours
            return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        } else if (diff < 604800000) { // Less than a week
            const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
            return days[date.getDay()];
        } else {
            return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
        }
    };

    const msgTime = conversation.lastMessage?.timestamp || conversation.lastMessageTime || conversation.createdAt;

    return (
        <TouchableOpacity
            style={[styles.container, isUnread && styles.unreadContainer]}
            onPress={onPress}
            onLongPress={onLongPress}
            delayLongPress={500}
            activeOpacity={0.7}
        >
            <View style={[styles.avatar, isUnread && styles.unreadAvatarOverlay]}>
                <Text style={styles.avatarText}>{initial}</Text>
                {isUnread && <View style={styles.unreadDot} />}
            </View>

            <View style={styles.info}>
                <View style={styles.header}>
                    <Text style={[styles.username, isUnread && styles.unreadText]} numberOfLines={1}>
                        {displayName}
                    </Text>
                    <Text style={[styles.timestamp, isUnread && styles.unreadTime]}>
                        {formatTimestamp(msgTime)}
                    </Text>
                </View>

                <View style={styles.previewContainer}>
                    <Text style={[styles.preview, isUnread && styles.unreadPreview]} numberOfLines={1}>
                        {lastMsg}
                    </Text>
                    {isUnread && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>Nuevo</Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    unreadContainer: {
        backgroundColor: colors.surface, // Puede ser un tono ligerísimamente distinto si se desea
    },
    avatar: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: colors.secondary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    unreadAvatarOverlay: {
        backgroundColor: colors.primary, // Naranja para usuarios con mensajes nuevos
    },
    avatarText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
    },
    unreadDot: {
        position: 'absolute',
        top: 2,
        right: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: colors.primary,
        borderWidth: 2,
        borderColor: colors.surface,
    },
    info: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    username: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        flex: 1,
    },
    unreadText: {
        fontWeight: '800',
        color: '#000',
    },
    timestamp: {
        fontSize: 12,
        color: colors.textLight,
        marginLeft: 8,
    },
    unreadTime: {
        color: colors.primary,
        fontWeight: '600',
    },
    previewContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    preview: {
        fontSize: 14,
        color: colors.textLight,
        flex: 1,
        marginRight: 8,
    },
    unreadPreview: {
        color: colors.text,
        fontWeight: '600',
    },
    badge: {
        backgroundColor: colors.primary,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
});

export default ConversationListItem;
