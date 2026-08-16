import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { borderRadius, spacing, typography, shadows } from '../theme/colors';

const { width } = Dimensions.get('window');

const CustomAlert = ({ visible, title, message, onConfirm, onCancel, confirmText, cancelText, type = 'info' }) => {
    const { theme, isDark } = useTheme();
    const [animation] = React.useState(new Animated.Value(0));

    React.useEffect(() => {
        if (visible) {
            Animated.spring(animation, {
                toValue: 1,
                useNativeDriver: true,
                tension: 40,
                friction: 7
            }).start();
        } else {
            Animated.timing(animation, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true
            }).start();
        }
    }, [visible]);

    if (!visible) return null;

    const scale = animation.interpolate({
        inputRange: [0, 1],
        outputRange: [0.8, 1]
    });

    const opacity = animation.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, 0.5, 1]
    });

    const getIconColor = () => {
        switch (type) {
            case 'error': return theme.error;
            case 'success': return theme.success;
            case 'warning': return theme.warning;
            default: return theme.primary;
        }
    };

    return (
        <Modal transparent visible={visible} animationType="none">
            <View style={styles.overlay}>
                <Animated.View style={[
                    styles.container,
                    {
                        backgroundColor: theme.surface,
                        opacity,
                        transform: [{ scale }]
                    }
                ]}>
                    <View style={styles.content}>
                        <View style={[styles.indicator, { backgroundColor: getIconColor() }]} />
                        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
                        <Text style={[styles.message, { color: theme.textSecondary }]}>{message}</Text>

                        <View style={styles.buttonGroup}>
                            {onCancel && (
                                <TouchableOpacity
                                    style={[styles.button, styles.cancelButton, { borderColor: theme.border }]}
                                    onPress={onCancel}
                                >
                                    <Text style={[styles.buttonText, { color: theme.textSecondary }]}>
                                        {cancelText || 'Cancelar'}
                                    </Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity style={styles.confirmButton} onPress={onConfirm}>
                                <LinearGradient
                                    colors={theme.gradients.primary}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.gradientButton}
                                >
                                    <Text style={[styles.buttonText, styles.confirmText]}>
                                        {confirmText || 'Aceptar'}
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    container: {
        width: '100%',
        maxWidth: 340,
        borderRadius: borderRadius.lg,
        ...shadows.lg,
        overflow: 'hidden',
    },
    content: {
        padding: spacing.xl,
        alignItems: 'center',
    },
    indicator: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginBottom: spacing.md,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: 0.9,
    },
    title: {
        ...typography.h3,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    message: {
        ...typography.body,
        textAlign: 'center',
        marginBottom: spacing.xl,
        opacity: 0.8,
    },
    buttonGroup: {
        flexDirection: 'row',
        width: '100%',
        gap: spacing.md,
    },
    button: {
        flex: 1,
        height: 50,
        borderRadius: borderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelButton: {
        borderWidth: 1,
    },
    confirmButton: {
        flex: 1,
        height: 50,
        borderRadius: borderRadius.md,
        overflow: 'hidden',
    },
    gradientButton: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        ...typography.body,
        fontWeight: '700',
    },
    confirmText: {
        color: '#FFFFFF',
    },
});

export default CustomAlert;
