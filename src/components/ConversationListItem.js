/**
 * Conversation List Item Component
 * Displays a conversation in the conversations list
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import colors from '../theme/colors';
import { useTranslation } from '../i18n';

const ConversationListItem = ({ conversation, currentUserId, onPress, onLongPress }) => {
    // Get the other participant ID
    const otherUserId = conversation.participants.find(id => id !== currentUserId);
    const { t, locale } = useTranslation();

    // Use enriched recipient data if available
    const displayName = conversation.recipient?.fullUsername || otherUserId;
    const initial = (conversation.recipient?.username || otherUserId).charAt(0).toUpperCase();
    
    // Get unread count (assuming the API provides this, otherwise default to 0)
    const unreadCount = conversation.unreadCount || 0;
    const lastMessage = conversation.lastMessage || null;

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 86400000) { // Less than 24 hours
            return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
        } else if (diff < 604800000) { // Less than a week
            return date.toLocaleDateString(locale, { weekday: 'short' });
        } else {
            return date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });
        }
    };

    const getLastMessagePreview = () => {
        if (lastMessage) {
            return lastMessage.content || t('conversations.previewEncrypted');
        }
        return t('conversations.previewStart');
    };

    return (
        <TouchableOpacity style={styles.container} onPress={onPress} onLongPress={onLongPress} delayLongPress={500}>
            <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <View style={styles.info}>
                <View style={styles.header}>
                    <Text style={styles.username} numberOfLines={1}>
                        {displayName}
                    </Text>
                    <View style={styles.headerRight}>
                        {lastMessage && (
                            <Text style={styles.timestamp}>
                                {formatTimestamp(lastMessage.timestamp || conversation.updatedAt || conversation.createdAt)}
                            </Text>
                        )}
                    </View>
                </View>
                <View style={styles.footer}>
                    <Text style={[styles.preview, unreadCount > 0 && styles.previewUnread]} numberOfLines={1}>
                        {getLastMessagePreview()}
                    </Text>
                    {unreadCount > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </Text>
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
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    avatarText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
    },
    info: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    username: {
        fontSize: 17,
        fontWeight: '600',
        color: colors.text,
        flex: 1,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    timestamp: {
        fontSize: 13,
        color: colors.textLight,
        marginLeft: 8,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    preview: {
        fontSize: 15,
        color: colors.textLight,
        flex: 1,
    },
    previewUnread: {
        fontWeight: '600',
        color: colors.text,
    },
    badge: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        minWidth: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 8,
        marginLeft: 8,
    },
    badgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
});

export default ConversationListItem;
