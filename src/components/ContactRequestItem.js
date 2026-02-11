/**
 * Contact Request Item Component
 * Displays a contact request with accept/reject buttons
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import colors from '../theme/colors';
import { useTranslation } from '../i18n';

const ContactRequestItem = ({ request, onAccept, onReject }) => {
    const initial = request.senderUsername?.charAt(0).toUpperCase() || '?';
    const { t } = useTranslation();

    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 60) {
            return t('contactRequestItem.minutes', { value: minutes });
        } else if (hours < 24) {
            return t('contactRequestItem.hours', { value: hours });
        }
        return t('contactRequestItem.days', { value: days });
    };

    return (
        <View style={styles.container}>
            <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initial}</Text>
            </View>

            <View style={styles.info}>
                <Text style={styles.username}>{request.senderUsername}</Text>
                <Text style={styles.timestamp}>{formatTimestamp(request.createdAt)}</Text>
            </View>

            <View style={styles.actions}>
                <TouchableOpacity
                    style={[styles.button, styles.acceptButton]}
                    onPress={() => onAccept(request)}
                    activeOpacity={0.7}
                >
                    <Text style={styles.acceptText}>✓</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.rejectButton]}
                    onPress={() => onReject(request)}
                    activeOpacity={0.7}
                >
                    <Text style={styles.rejectText}>✗</Text>
                </TouchableOpacity>
            </View>
        </View>
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
    username: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
    },
    timestamp: {
        fontSize: 12,
        color: colors.textLight,
    },
    actions: {
        flexDirection: 'row',
        gap: 8,
    },
    button: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    acceptButton: {
        backgroundColor: '#4CAF50',
    },
    rejectButton: {
        backgroundColor: '#FF3B30',
    },
    acceptText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    rejectText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
});

export default ContactRequestItem;
