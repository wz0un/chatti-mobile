/**
 * Individual Chat Message Component
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../theme/colors';
import { useTranslation } from '../i18n';

const ChatMessage = ({ message, author, username, isSystem, timestamp }) => {
    const isOwnMessage = author === username;
    const { locale } = useTranslation();

    // Format timestamp
    const formatTime = (ts) => {
        const date = new Date(ts);
        return date.toLocaleTimeString(locale, {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (isSystem) {
        return (
            <View style={styles.systemMessageContainer}>
                <Text style={styles.systemMessageText}>{message}</Text>
            </View>
        );
    }

    return (
        <View style={[
            styles.messageContainer,
            isOwnMessage ? styles.ownMessage : styles.otherMessage
        ]}>
            {!isOwnMessage && (
                <Text style={styles.authorName}>{author}</Text>
            )}
            <View style={[
                styles.messageBubble,
                isOwnMessage ? styles.ownBubble : styles.otherBubble
            ]}>
                <Text style={[
                    styles.messageText,
                    isOwnMessage ? styles.ownMessageText : styles.otherMessageText
                ]}>
                    {message}
                </Text>
                <Text style={[
                    styles.timestamp,
                    isOwnMessage ? styles.ownTimestamp : styles.otherTimestamp
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
        marginHorizontal: 12,
        maxWidth: '80%',
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
        fontSize: 12,
        color: colors.textLight,
        marginBottom: 4,
        marginLeft: 12,
        fontWeight: '600',
    },
    messageBubble: {
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        maxWidth: '100%',
    },
    ownBubble: {
        backgroundColor: colors.messageSent,
        borderBottomRightRadius: 4,
    },
    otherBubble: {
        backgroundColor: colors.messageReceived,
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 16,
        lineHeight: 20,
    },
    ownMessageText: {
        color: colors.messageText,
    },
    otherMessageText: {
        color: colors.messageTextReceived,
    },
    timestamp: {
        fontSize: 10,
        marginTop: 4,
    },
    ownTimestamp: {
        color: 'rgba(255, 255, 255, 0.7)',
        textAlign: 'right',
    },
    otherTimestamp: {
        color: colors.textLight,
        textAlign: 'right',
    },
    systemMessageContainer: {
        alignSelf: 'center',
        backgroundColor: colors.systemBackground,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        marginVertical: 8,
    },
    systemMessageText: {
        fontSize: 12,
        color: colors.systemMessage,
        fontStyle: 'italic',
    },
});

export default ChatMessage;
