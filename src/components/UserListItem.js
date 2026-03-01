/**
 * User List Item Component - Modern Design
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing, borderRadius, typography, shadows } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';

const UserListItem = ({ user, onPress }) => {
    const { theme } = useTheme();
    const initial = user.username.charAt(0).toUpperCase();

    const getAvatarColors = (name) => {
        const palettes = [['#FF6B35', '#FFB84D'], ['#4ECDC4', '#5EEAD4'], ['#5865F2', '#7289DA']];
        const index = name.charCodeAt(0) % palettes.length;
        return palettes[index];
    };

    return (
        <TouchableOpacity
            style={[styles.container, { backgroundColor: theme.surface, borderBottomColor: theme.divider }]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <LinearGradient
                colors={getAvatarColors(user.username)}
                style={[styles.avatar, shadows.sm]}
            >
                <Text style={styles.avatarText}>{initial}</Text>
            </LinearGradient>

            <View style={styles.info}>
                <Text style={[styles.username, { color: theme.text }]}>{user.fullUsername}</Text>
                <Text style={[styles.userId, { color: theme.textSecondary }]}>ID: {user.userId?.substring(0, 12)}...</Text>
            </View>

            <View style={styles.arrow}>
                <Text style={[styles.arrowText, { color: theme.textTertiary }]}>›</Text>
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
        fontWeight: '600',
        marginBottom: 2,
    },
    userId: {
        ...typography.caption,
    },
    arrow: {
        marginLeft: spacing.sm,
    },
    arrowText: {
        fontSize: 24,
    },
});

export default UserListItem;
