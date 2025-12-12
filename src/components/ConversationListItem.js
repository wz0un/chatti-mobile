/**
 * Conversation List Item Component
 * Displays a conversation in the conversations list
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import colors from '../theme/colors';

const ConversationListItem = ({ conversation, currentUserId, onPress }) => {
    // Get the other participant ID
    const otherUserId = conversation.participants.find(id => id !== currentUserId);
    const initial = otherUserId ? otherUserId.charAt(0).toUpperCase() : '?';

    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 86400000) { // Less than 24 hours
            return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        } else {
            return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
        }
    };

    return (
        <TouchableOpacity style={styles.container} onPress={onPress}>
            <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <View style={styles.info}>
                <View style={styles.header}>
                    <Text style={styles.username} numberOfLines={1}>
                        {otherUserId}
                    </Text>
                    <Text style={styles.timestamp}>
                        {formatTimestamp(conversation.createdAt)}
                    </Text>
                </View>
                <Text style={styles.preview} numberOfLines={1}>
                    Toca para abrir chat cifrado
                </Text>
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
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.secondary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontSize: 20,
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
        marginBottom: 4,
    },
    username: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        flex: 1,
    },
    timestamp: {
        fontSize: 12,
        color: colors.textLight,
        marginLeft: 8,
    },
    preview: {
        fontSize: 14,
        color: colors.textLight,
    },
});

export default ConversationListItem;
