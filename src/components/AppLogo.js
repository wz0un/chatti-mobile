/**
 * App Logo Component
 * Displays the Chat-Ti logo
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../theme/colors';

const AppLogo = ({ size = 40, showText = true }) => {
    const logoSize = size;
    const bubbleSize = logoSize * 0.7;
    
    return (
        <View style={styles.container}>
            <View style={[styles.logoContainer, { width: logoSize, height: logoSize }]}>
                {/* Orange shape (stylized 9 or head shape) */}
                <View style={[styles.orangeShape, { 
                    width: logoSize * 0.85, 
                    height: logoSize * 0.85,
                    borderRadius: logoSize * 0.4,
                }]}>
                    {/* Green cutout inside orange shape */}
                    <View style={[styles.greenCutout, {
                        width: logoSize * 0.5,
                        height: logoSize * 0.5,
                        borderRadius: logoSize * 0.25,
                        top: logoSize * 0.15,
                        left: logoSize * 0.2,
                    }]} />
                </View>
                {/* Green speech bubble */}
                <View style={[styles.greenBubble, {
                    width: bubbleSize,
                    height: bubbleSize,
                    borderRadius: bubbleSize * 0.3,
                    top: logoSize * 0.1,
                    right: logoSize * 0.05,
                }]}>
                    {/* Speech bubble tail */}
                    <View style={[styles.bubbleTail, {
                        width: bubbleSize * 0.2,
                        height: bubbleSize * 0.2,
                    }]} />
                </View>
            </View>
            {showText && (
                <Text style={styles.logoText}>Chat-Ti</Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoContainer: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    orangeShape: {
        position: 'absolute',
        backgroundColor: colors.primary,
        transform: [{ rotate: '-20deg' }],
    },
    greenCutout: {
        position: 'absolute',
        backgroundColor: colors.secondary,
    },
    greenBubble: {
        position: 'absolute',
        backgroundColor: colors.secondary,
        borderBottomLeftRadius: 4,
    },
    bubbleTail: {
        position: 'absolute',
        backgroundColor: colors.secondary,
        bottom: -8,
        left: 8,
        transform: [{ rotate: '45deg' }],
    },
    logoText: {
        marginTop: 8,
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.primary,
    },
});

export default AppLogo;

