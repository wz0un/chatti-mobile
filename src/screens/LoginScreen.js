/**
 * Login Screen - Username/Password authentication with Login and Register tabs
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
    const [activeTab, setActiveTab] = useState('login'); // 'login' or 'register'
    const [username, setUsername] = useState('');
    const [fullUsername, setFullUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        const trimmedUsername = fullUsername.trim();
        const trimmedPassword = password.trim();

        if (!trimmedUsername) {
            Alert.alert('Error', 'Por favor ingresa tu nombre de usuario completo (ej: usuario#1234)');
            return;
        }

        if (!trimmedUsername.includes('#')) {
            Alert.alert('Error', 'Formato inválido. Usa: nombre#1234');
            return;
        }

        if (!trimmedPassword) {
            Alert.alert('Error', 'Por favor ingresa tu contraseña');
            return;
        }

        try {
            setLoading(true);

            console.log('Logging in user:', trimmedUsername);
            const user = await AuthService.loginUser(trimmedUsername, trimmedPassword);
            console.log('User logged in:', user);

            if (!user) {
                throw new Error('No se recibió información del usuario');
            }

            // Navigate to room list
            navigation.navigate('RoomList', {
                username: user.fullUsername,
            });
        } catch (error) {
            console.error('Error during login:', error);
            Alert.alert('Error', error.message || 'No se pudo iniciar sesión. Verifica tus credenciales.');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async () => {
        const trimmedUsername = username.trim();
        const trimmedPassword = password.trim();

        if (!trimmedUsername) {
            Alert.alert('Error', 'Por favor ingresa tu nombre de usuario');
            return;
        }

        if (!trimmedPassword) {
            Alert.alert('Error', 'Por favor ingresa tu contraseña');
            return;
        }

        if (trimmedPassword.length < 6) {
            Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
            return;
        }

        try {
            setLoading(true);

            console.log('Registering user:', trimmedUsername);
            const user = await AuthService.registerUser(trimmedUsername, trimmedPassword);
            console.log('User registered:', user);

            if (!user) {
                throw new Error('No se recibió información del usuario');
            }

            // Show the assigned username with discriminator
            Alert.alert(
                '¡Registro exitoso!',
                `Tu nombre de usuario es: ${user.fullUsername}\n\nGuárdalo para iniciar sesión.`,
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            // Navigate to room list
                            navigation.navigate('RoomList', {
                                username: user.fullUsername,
                            });
                        }
                    }
                ]
            );
        } catch (error) {
            console.error('Error during registration:', error);
            Alert.alert('Error', error.message || 'No se pudo registrar. Verifica tu conexión.');
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
                    <Text style={styles.title}>Chat-ti</Text>
                    <Text style={styles.subtitle}>Bienvenido al chat</Text>
                </View>

                {/* Tabs */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'login' && styles.activeTab]}
                        onPress={() => setActiveTab('login')}
                    >
                        <Text style={[styles.tabText, activeTab === 'login' && styles.activeTabText]}>
                            Iniciar Sesión
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'register' && styles.activeTab]}
                        onPress={() => setActiveTab('register')}
                    >
                        <Text style={[styles.tabText, activeTab === 'register' && styles.activeTabText]}>
                            Registrarse
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Login Form */}
                {activeTab === 'login' && (
                    <View style={styles.form}>
                        <Text style={styles.label}>Nombre de usuario completo</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="usuario#1234"
                            placeholderTextColor={colors.placeholder}
                            value={fullUsername}
                            onChangeText={setFullUsername}
                            autoCapitalize="none"
                            autoCorrect={false}
                            editable={!loading}
                        />

                        <Text style={styles.label}>Contraseña</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Tu contraseña"
                            placeholderTextColor={colors.placeholder}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            autoCapitalize="none"
                            autoCorrect={false}
                            editable={!loading}
                        />

                        <TouchableOpacity
                            style={[
                                styles.button,
                                (!fullUsername.trim() || !password.trim() || loading) && styles.buttonDisabled
                            ]}
                            onPress={handleLogin}
                            disabled={!fullUsername.trim() || !password.trim() || loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={colors.textInverse} />
                            ) : (
                                <Text style={styles.buttonText}>Iniciar Sesión</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                {/* Register Form */}
                {activeTab === 'register' && (
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

                        <Text style={styles.label}>Contraseña</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Mínimo 6 caracteres"
                            placeholderTextColor={colors.placeholder}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            autoCapitalize="none"
                            autoCorrect={false}
                            editable={!loading}
                        />

                        <TouchableOpacity
                            style={[
                                styles.button,
                                (!username.trim() || !password.trim() || loading) && styles.buttonDisabled
                            ]}
                            onPress={handleRegister}
                            disabled={!username.trim() || !password.trim() || loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={colors.textInverse} />
                            ) : (
                                <Text style={styles.buttonText}>Registrarse</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        Al continuar, aceptas las reglas del chat
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
        marginBottom: 32,
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
    tabContainer: {
        flexDirection: 'row',
        marginBottom: 24,
        borderRadius: 12,
        backgroundColor: colors.surface,
        padding: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 8,
    },
    activeTab: {
        backgroundColor: colors.primary,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textLight,
    },
    activeTabText: {
        color: colors.textInverse,
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
