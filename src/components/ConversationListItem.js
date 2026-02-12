/**
 * Conversation List Item Component - Modern WhatsApp/Telegram Style
 * Displays a conversation in the conversations list
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import colors, { spacing } from '../theme/colors';
import { useTranslation } from '../i18n';

const ConversationListItem = ({ conversation, currentUserId, isUnread, onPress, onLongPress }) => {
    const { t, locale } = useTranslation();
    // Get the other participant ID
    const otherUserId = conversation.participants?.find(id => id !== currentUserId) || conversation.normalizedRecipientId;

    // Use enriched recipient data if available
    const displayName = conversation.recipient?.fullUsername || conversation.recipientUsername || otherUserId;
    const initial = (conversation.recipient?.username || conversation.recipientUsername || otherUserId).charAt(0).toUpperCase();

    // Extract last message preview
    let lastMsg = t('conversations.emptyTitle');
    if (conversation.lastMessage) {
        lastMsg = typeof conversation.lastMessage === 'object'
            ? (conversation.lastMessage.content || t('conversations.previewEncrypted'))
            : conversation.lastMessage;
    }

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 86400000) { // Less than 24 hours
            return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
        } else if (diff < 604800000) { // Less than a week
            const days = [
                t('time.days.sun') || 'Dom',
                t('time.days.mon') || 'Lun',
                t('time.days.tue') || 'Mar',
                t('time.days.wed') || 'Mié',
                t('time.days.thu') || 'Jue',
                t('time.days.fri') || 'Vie',
                t('time.days.sat') || 'Sáb'
            ];
            return days[date.getDay()];
        } else {
            return date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });
        }
    };

    const msgTime = conversation.lastMessage?.timestamp || conversation.lastMessageTime || conversation.createdAt;

    // Generate consistent color for avatar based on username
    const getAvatarColor = (name) => {
        const colors_list = ['#5865F2', '#7289DA', '#25D366', '#0088CC', '#F23F42', '#F0B232'];
        const index = name.charCodeAt(0) % colors_list.length;
        return colors_list[index];
    };

    return (
        <TouchableOpacity
            style={[styles.container, isUnread && styles.unreadContainer]}
            onPress={onPress}
            onLongPress={onLongPress}
            delayLongPress={500}
            activeOpacity={0.6}
        >
            {/* Avatar with gradient */}
            <View style={styles.avatarContainer}>
                <LinearGradient
                    colors={isUnread ? colors.primaryGradient : [getAvatarColor(displayName), getAvatarColor(displayName)]}
                    style={styles.avatar}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <Text style={styles.avatarText}>{initial}</Text>
                </LinearGradient>
                {/* Online status indicator */}
                <View style={styles.onlineIndicator} />
            </View>

            {/* Content */}
            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={[styles.username, isUnread && styles.unreadText]} numberOfLines={1}>
                        {displayName}
                    </Text>
                    <Text style={[styles.timestamp, isUnread && styles.unreadTime]}>
                        {formatTimestamp(msgTime)}
                    </Text>
                </View>

                <View style={styles.previewContainer}>
                    <Text style={[styles.preview, isUnread && styles.unreadPreview]} numberOfLines={2}>
                        {lastMsg}
                    </Text>
                    {isUnread && (
                        <View style={styles.unreadBadge}>
                            <Text style={styles.unreadBadgeText}>•</Text>
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
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm + 4,
        backgroundColor: colors.surface,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.border,
    },
    unreadContainer: {
        backgroundColor: colors.surfaceHover,
    },
    avatarContainer: {
        position: 'relative',
        marginRight: spacing.md,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: 'rgba(255, 107, 53, 0.2)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    avatarText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.textInverse,
    },
    onlineIndicator: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: colors.online,
        borderWidth: 2.5,
        borderColor: colors.surface,
    },
    content: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    username: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        flex: 1,
        marginRight: spacing.sm,
    },
    unreadText: {
        fontWeight: 'bold',
        color: colors.text,
    },
    timestamp: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '400',
    },
    unreadTime: {
        color: colors.primary,
        fontWeight: '600',
    },
    previewContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    preview: {
        fontSize: 14,
        color: colors.textSecondary,
        flex: 1,
        lineHeight: 18,
    },
    unreadPreview: {
        color: colors.text,
        fontWeight: '500',
    },
    unreadBadge: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: spacing.sm,
    },
    unreadBadgeText: {
        color: colors.textInverse,
        fontSize: 12,
        fontWeight: 'bold',
        marginTop: -4,
    },
});

export default ConversationListItem;
