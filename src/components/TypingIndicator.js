/**
 * Typing Indicator Component - Modern Design
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { spacing, typography } from '../theme/colors';
import { useTranslation } from '../i18n';
import { useTheme } from '../theme/ThemeContext';

const TypingIndicator = ({ usernames }) => {
    const { theme } = useTheme();
    const { t } = useTranslation();

    if (!usernames || usernames.length === 0) return null;

    const usernamesText = usernames.join(', ');
    const text = usernames.length > 1
        ? t('typing.plural', { users: usernamesText })
        : t('typing.singular', { users: usernamesText });

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Text style={[styles.text, { color: theme.textTertiary }]}>{text}</Text>
            <View style={styles.dotsContainer}>
                <View style={[styles.dot, { backgroundColor: theme.primary }]} />
                <View style={[styles.dot, { backgroundColor: theme.primary, opacity: 0.6 }]} />
                <View style={[styles.dot, { backgroundColor: theme.primary, opacity: 0.3 }]} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.xs,
    },
    text: {
        fontSize: 11,
        fontStyle: 'italic',
        fontWeight: '600',
        marginRight: 8,
    },
    dotsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        marginHorizontal: 1.5,
    },
});

export default TypingIndicator;
