/**
 * User List Item Component
 * Displays a user in the users list
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import colors from '../theme/colors';

const UserListItem = ({ user, onPress }) => {
    const initial = user.username.charAt(0).toUpperCase();

    return (
        <TouchableOpacity style={styles.container} onPress={onPress}>
            <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <View style={styles.info}>
                <Text style={styles.username}>{user.fullUsername}</Text>
                <Text style={styles.userId}>ID: {user.userId?.substring(0, 16)}...</Text>
            </View>
            <View style={styles.arrow}>
                <Text style={styles.arrowText}>›</Text>
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
        backgroundColor: colors.primary,
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
    userId: {
        fontSize: 12,
        color: colors.textLight,
    },
    arrow: {
        marginLeft: 8,
    },
    arrowText: {
        fontSize: 24,
        color: colors.textLight,
    },
});

export default UserListItem;
