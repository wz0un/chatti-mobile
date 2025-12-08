/**
 * Chat Input Component
 */

import React, { useState, useRef } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';

const ChatInput = ({ onSendMessage, onTyping, disabled }) => {
    const [message, setMessage] = useState('');
    const typingTimeoutRef = useRef(null);

    const handleSend = () => {
        if (message.trim() && !disabled) {
            onSendMessage(message);
            setMessage('');

            // Stop typing indicator
            if (onTyping) {
                onTyping(false);
            }
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        }
    };

    const handleChangeText = (text) => {
        setMessage(text);

        // Send typing indicator
        if (onTyping && text.length > 0) {
            onTyping(true);

            // Clear previous timeout
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }

            // Stop typing after 2 seconds of inactivity
            typingTimeoutRef.current = setTimeout(() => {
                onTyping(false);
            }, 2000);
        }
    };

    return (
        <View style={styles.container}>
            <TextInput
                style={styles.input}
                placeholder="Escribe un mensaje..."
                placeholderTextColor={colors.placeholder}
                value={message}
                onChangeText={handleChangeText}
                multiline
                maxLength={500}
                editable={!disabled}
            />
            <TouchableOpacity
                style={[
                    styles.sendButton,
                    (!message.trim() || disabled) && styles.sendButtonDisabled
                ]}
                onPress={handleSend}
                disabled={!message.trim() || disabled}
            >
                <Ionicons
                    name="send"
                    size={20}
                    color={!message.trim() || disabled ? colors.placeholder : colors.textInverse}
                />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    input: {
        flex: 1,
        backgroundColor: colors.inputBackground,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 16,
        maxHeight: 100,
        color: colors.text,
    },
    sendButton: {
        backgroundColor: colors.primary,
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    sendButtonDisabled: {
        backgroundColor: colors.inputBackground,
    },
});

export default ChatInput;
