/**
 * Typing Indicator Component
 */

import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import colors from '../theme/colors';

const TypingIndicator = ({ usernames }) => {
    if (!usernames || usernames.length === 0) {
        return null;
    }

    const usernamesText = usernames.join(', ');
    const verb = usernames.length > 1 ? 'están' : 'está';

    return (
        <View style={styles.container}>
            <Text style={styles.text}>
                {usernamesText} {verb} escribiendo...
            </Text>
            <View style={styles.dotsContainer}>
                <View style={styles.dot} />
                <View style={styles.dot} />
                <View style={styles.dot} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: colors.background,
    },
    text: {
        fontSize: 12,
        color: colors.textLight,
        fontStyle: 'italic',
        marginRight: 8,
    },
    dotsContainer: {
        flexDirection: 'row',
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.textLight,
        marginHorizontal: 2,
    },
});

export default TypingIndicator;
