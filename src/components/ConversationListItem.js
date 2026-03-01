/**
 * Conversation List Item Component - Modern Design
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing, typography, borderRadius, shadows } from '../theme/colors';
import { useTranslation } from '../i18n';
import { useTheme } from '../theme/ThemeContext';

const ConversationListItem = ({ conversation, currentUserId, isUnread, onPress, onLongPress }) => {
    const { theme, isDark } = useTheme();
    const { t, locale } = useTranslation();

    const otherUserId = conversation.participants?.find(id => id !== currentUserId) || conversation.normalizedRecipientId;
    const displayName = conversation.recipient?.fullUsername || conversation.recipientUsername || otherUserId;
    const initial = (conversation.recipient?.username || conversation.recipientUsername || otherUserId).charAt(0).toUpperCase();

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

        if (diff < 86400000) {
            return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
        } else if (diff < 604800000) {
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

    const getAvatarColors = (name) => {
        const palettes = [
            ['#FF6B35', '#FFB84D'],
            ['#4ECDC4', '#5EEAD4'],
            ['#5865F2', '#7289DA'],
            ['#F23F42', '#FF6B6B'],
            ['#7C3AED', '#A855F7'],
        ];
        const index = name.charCodeAt(0) % palettes.length;
        return palettes[index];
    };

    return (
        <TouchableOpacity
            style={[styles.container, { backgroundColor: theme.surface, borderBottomColor: theme.divider }, isUnread && { backgroundColor: theme.surfaceSecondary }]}
            onPress={onPress}
            onLongPress={onLongPress}
            delayLongPress={500}
            activeOpacity={0.6}
        >
            <View style={styles.avatarContainer}>
                <LinearGradient
                    colors={getAvatarColors(displayName)}
                    style={[styles.avatar, shadows.sm]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <Text style={styles.avatarText}>{initial}</Text>
                </LinearGradient>
                {/* Status Dot */}
                <View style={[styles.statusDot, { backgroundColor: theme.success, borderColor: theme.surface }]} />
            </View>

            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={[styles.username, { color: theme.text }, isUnread && { fontWeight: '800' }]} numberOfLines={1}>
                        {displayName}
                    </Text>
                    <Text style={[styles.timestamp, { color: isUnread ? theme.primary : theme.textTertiary }]}>
                        {formatTimestamp(msgTime)}
                    </Text>
                </View>

                <View style={styles.previewContainer}>
                    <Text
                        style={[styles.preview, { color: isUnread ? theme.text : theme.textSecondary }]}
                        numberOfLines={1}
                    >
                        {lastMsg}
                    </Text>
                    {isUnread && (
                        <View style={[styles.unreadBadge, { backgroundColor: theme.primary }]}>
                            <Text style={styles.unreadBadgeText}>1</Text>
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
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
    },
    avatarContainer: {
        position: 'relative',
        marginRight: spacing.md,
    },
    avatar: {
        width: 58,
        height: 58,
        borderRadius: 29,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    statusDot: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 2.5,
    },
    content: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    username: {
        ...typography.body,
        fontWeight: '600',
        flex: 1,
    },
    timestamp: {
        fontSize: 12,
        fontWeight: '500',
    },
    previewContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    preview: {
        ...typography.bodySmall,
        flex: 1,
    },
    unreadBadge: {
        minWidth: 20,
        height: 20,
        paddingHorizontal: 6,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: spacing.sm,
    },
    unreadBadgeText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '800',
    },
});

export default ConversationListItem;
