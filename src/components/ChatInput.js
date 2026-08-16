/**
 * Chat Input Component - Modern Design
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Platform, Text, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing, borderRadius, shadows, typography } from '../theme/colors';
import { useTranslation } from '../i18n';
import { useTheme } from '../theme/ThemeContext';

const ChatInput = ({ onSendMessage, onTyping, disabled }) => {
    const { theme, isDark } = useTheme();
    const [message, setMessage] = useState('');
    const typingTimeoutRef = useRef(null);
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();

    const handleSend = () => {
        if (message.trim() && !disabled) {
            onSendMessage(message);
            setMessage('');
            if (onTyping) onTyping(false);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        }
    };

    const handleChangeText = (text) => {
        setMessage(text);
        if (onTyping && text.length > 0) {
            onTyping(true);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                onTyping(false);
            }, 2000);
        }
    };

    // Usamos el mismo margen del menú para que siempre haya espacio debajo
    const adaptivePaddingBottom = Platform.OS === 'ios' 
        ? Math.max(insets.bottom, spacing.sm) 
        : Math.max(insets.bottom, 12);

    return (
        <View style={[
            styles.container,
            {
                backgroundColor: theme.surface,
                borderTopColor: theme.border,
                paddingBottom: adaptivePaddingBottom
            }
        ]}>
            <View style={[styles.inputContainer, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
                <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder={t('chatInput.placeholder')}
                    placeholderTextColor={theme.textTertiary}
                    value={message}
                    onChangeText={handleChangeText}
                    multiline
                    maxLength={1000}
                    editable={!disabled}
                    blurOnSubmit={false}
                />
            </View>

            <TouchableOpacity
                onPress={handleSend}
                disabled={!message.trim() || disabled}
                style={[styles.sendButtonWrapper, { opacity: !message.trim() || disabled ? 0.5 : 1 }]}
            >
                <LinearGradient
                    colors={theme.gradients.primary}
                    style={styles.sendButton}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <Text style={styles.sendIcon}>➔</Text>
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderTopWidth: 1,
    },
    inputContainer: {
        flex: 1,
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: Platform.OS === 'ios' ? 10 : 6,
        borderWidth: 1,
        maxHeight: 120,
    },
    input: {
        fontSize: 16,
        lineHeight: 20,
        paddingTop: 0,
        paddingBottom: 0,
    },
    sendButtonWrapper: {
        marginLeft: spacing.sm,
        ...shadows.sm,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendIcon: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '900',
    },
});

export default ChatInput;
