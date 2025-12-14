/**
 * Login Screen - Username entry with backend registration
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Alert,
    ActivityIndicator,
} from 'react-native';
import AuthService from '../services/AuthService';
import colors from '../theme/colors';

const LoginScreen = ({ navigation }) => {
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);

    const handleJoinChat = async () => {
        const trimmedUsername = username.trim();

        if (!trimmedUsername) {
            Alert.alert('Error', 'Por favor ingresa tu nombre de usuario');
            return;
        }

        try {
            setLoading(true);

            // Register user with backend (creates or retrieves user with discriminator)
            console.log('Registering user:', trimmedUsername);
            const user = await AuthService.registerUser(trimmedUsername);
            console.log('User registered:', user);

            if (!user) {
                throw new Error('No se recibió información del usuario');
            }

            // Navigate to main tabs (Chats is the default screen)
            navigation.navigate('MainTabs', {
                username: user.fullUsername,
            });
        } catch (error) {
            console.error('Error during registration:', error);
            Alert.alert('Error', 'No se pudo conectar con el servidor. Verifica tu conexión.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.title}>Chat-Ti</Text>
                    <Text style={styles.subtitle}>Bienvenido al chat</Text>
                </View>

                <View style={styles.form}>
                    <Text style={styles.label}>Nombre de usuario</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Tu nombre"
                        placeholderTextColor={colors.placeholder}
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                        autoCorrect={false}
                        maxLength={20}
                        editable={!loading}
                    />

                    <TouchableOpacity
                        style={[
                            styles.button,
                            (!username.trim() || loading) && styles.buttonDisabled
                        ]}
                        onPress={handleJoinChat}
                        disabled={!username.trim() || loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={colors.textInverse} />
                        ) : (
                            <Text style={styles.buttonText}>Continuar</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        Al unirte, aceptas las reglas del chat
                    </Text>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 48,
    },
    title: {
        fontSize: 48,
        fontWeight: 'bold',
        color: colors.primary,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 18,
        color: colors.textLight,
    },
    form: {
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 8,
        marginLeft: 4,
    },
    input: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: colors.text,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: colors.border,
    },
    button: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 8,
    },
    buttonDisabled: {
        backgroundColor: colors.inputBackground,
        opacity: 0.6,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.textInverse,
    },
    footer: {
        alignItems: 'center',
        marginTop: 24,
    },
    footerText: {
        fontSize: 12,
        color: colors.textLight,
        textAlign: 'center',
    },
});

export default LoginScreen;
