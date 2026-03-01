/**
 * Contact Request Item Component - Modern Design
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing, borderRadius, typography, shadows } from '../theme/colors';
import { useTranslation } from '../i18n';
import { useTheme } from '../theme/ThemeContext';

const ContactRequestItem = ({ request, onAccept, onReject }) => {
    const { theme } = useTheme();
    const { t, locale } = useTranslation();
    const initial = request.senderUsername?.charAt(0).toUpperCase() || '?';

    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 60) return t('contactRequestItem.minutes', { value: minutes });
        if (hours < 24) return t('contactRequestItem.hours', { value: hours });
        return t('contactRequestItem.days', { value: days });
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.surface, borderBottomColor: theme.divider }]}>
            <LinearGradient
                colors={['#4ECDC4', '#55EFC4']}
                style={[styles.avatar, shadows.sm]}
            >
                <Text style={styles.avatarText}>{initial}</Text>
            </LinearGradient>

            <View style={styles.info}>
                <Text style={[styles.username, { color: theme.text }]}>{request.senderUsername}</Text>
                <Text style={[styles.timestamp, { color: theme.textTertiary }]}>{formatTimestamp(request.createdAt)}</Text>
            </View>

            <View style={styles.actions}>
                <TouchableOpacity
                    style={[styles.button, { backgroundColor: theme.success + '20' }]}
                    onPress={() => onAccept(request)}
                >
                    <Text style={[styles.buttonIcon, { color: theme.success }]}>✓</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: theme.error + '20' }]}
                    onPress={() => onReject(request)}
                >
                    <Text style={[styles.buttonIcon, { color: theme.error }]}>✕</Text>
                </TouchableOpacity>
            </View>
        </View>
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
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    avatarText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    info: {
        flex: 1,
    },
    username: {
        ...typography.body,
        fontWeight: '700',
        marginBottom: 2,
    },
    timestamp: {
        ...typography.caption,
    },
    actions: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    button: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonIcon: {
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default ContactRequestItem;
