/**
 * Notification Badge Component
 * Displays a circular badge with a count number
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../theme/colors';

const NotificationBadge = ({ count, style }) => {
    if (!count || count <= 0) {
        return null;
    }

    // Format count: show "9+" for counts > 9
    const displayCount = count > 9 ? '9+' : count.toString();

    return (
        <View style={[styles.badge, style]}>
            <Text style={styles.badgeText}>{displayCount}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    badge: {
        position: 'absolute',
        top: -6,
        right: -6,
        backgroundColor: colors.primary,
        borderRadius: 12,
        minWidth: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
        borderWidth: 2,
        borderColor: colors.background,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 4,
    },
    badgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: 'bold',
    },
});

export default NotificationBadge;
