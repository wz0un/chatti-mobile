/**
 * Individual Chat Message Component - Modern Design
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { spacing, borderRadius, typography, shadows } from '../theme/colors';
import { useTranslation } from '../i18n';
import { useTheme } from '../theme/ThemeContext';

const ChatMessage = ({ message, author, username, isSystem, timestamp }) => {
    const { theme, isDark } = useTheme();
    const isOwnMessage = author === username;
    const { locale } = useTranslation();

    const formatTime = (ts) => {
        if (!ts) return '';
        const date = new Date(ts);
        return date.toLocaleTimeString(locale, {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (isSystem) {
        return (
            <View style={[styles.systemMessageContainer, { backgroundColor: theme.surfaceSecondary }]}>
                <Text style={[styles.systemMessageText, { color: theme.textTertiary }]}>{message}</Text>
            </View>
        );
    }

    return (
        <View style={[
            styles.messageContainer,
            isOwnMessage ? styles.ownMessage : styles.otherMessage
        ]}>
            {!isOwnMessage && (
                <Text style={[styles.authorName, { color: theme.textTertiary }]}>{author}</Text>
            )}
            <View style={[
                styles.messageBubble,
                isOwnMessage
                    ? [styles.ownBubble, { backgroundColor: theme.messageSent }]
                    : [styles.otherBubble, { backgroundColor: theme.messageReceived, borderColor: theme.border }]
            ]}>
                <Text style={[
                    styles.messageText,
                    { color: isOwnMessage ? theme.messageText : theme.messageTextReceived }
                ]}>
                    {message}
                </Text>
                <Text style={[
                    styles.timestamp,
                    { color: isOwnMessage ? 'rgba(255,255,255,0.7)' : theme.textTertiary }
                ]}>
                    {formatTime(timestamp)}
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    messageContainer: {
        marginVertical: 4,
        marginHorizontal: spacing.md,
        maxWidth: '85%',
    },
    ownMessage: {
        alignSelf: 'flex-end',
        alignItems: 'flex-end',
    },
    otherMessage: {
        alignSelf: 'flex-start',
        alignItems: 'flex-start',
    },
    authorName: {
        fontSize: 11,
        fontWeight: '700',
        marginBottom: 2,
        marginLeft: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    messageBubble: {
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        ...shadows.sm,
    },
    ownBubble: {
        borderBottomRightRadius: 4,
    },
    otherBubble: {
        borderBottomLeftRadius: 4,
        borderWidth: 1,
    },
    messageText: {
        fontSize: 16,
        lineHeight: 22,
    },
    timestamp: {
        fontSize: 10,
        marginTop: 4,
        textAlign: 'right',
    },
    systemMessageContainer: {
        alignSelf: 'center',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        marginVertical: 8,
    },
    systemMessageText: {
        fontSize: 12,
        fontStyle: 'italic',
    },
});

export default ChatMessage;
