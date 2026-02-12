/**
 * Login Screen - Username/Password authentication with Login and Register tabs
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Animated,
} from 'react-native';
import AuthService from '../services/AuthService';
import colors from '../theme/colors';
import { useTranslation } from '../i18n';

const LoginScreen = ({ navigation }) => {
    const [activeTab, setActiveTab] = useState('login'); // 'login' or 'register'
    const [username, setUsername] = useState('');
    const [fullUsername, setFullUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successInfo, setSuccessInfo] = useState('');

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const { t } = useTranslation();

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();
    }, []);

    const handleLogin = async () => {
        const trimmedUsername = fullUsername.trim();
        const trimmedPassword = password.trim();

        setError('');
        setSuccessInfo('');

        if (!trimmedUsername) {
            setError(t('login.errors.empty'));
            return;
        }

        if (!trimmedUsername.includes('#')) {
            setError(t('login.errors.invalidFormat'));
            return;
        }

        if (!trimmedPassword) {
            setError(t('login.errors.emptyPassword'));
            return;
        }

        try {
            setLoading(true);

            console.log('Logging in user:', trimmedUsername);
            const user = await AuthService.loginUser(trimmedUsername, trimmedPassword);
            console.log('User logged in:', user);

            if (!user) {
                throw new Error(t('login.errors.noUser'));
            }

            // Navigate to room list
            navigation.navigate('Main', {
                username: user.fullUsername,
            });
        } catch (err) {
            console.error('Error during login:', err);
            setError(err.message || t('login.errors.server'));
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async () => {
        const trimmedUsername = username.trim();
        const trimmedPassword = password.trim();

        setError('');
        setSuccessInfo('');

        if (!trimmedUsername) {
            setError(t('login.errors.nameRequired'));
            return;
        }

        if (!trimmedPassword) {
            setError(t('login.errors.passwordRequired'));
            return;
        }

        if (trimmedPassword.length < 6) {
            setError(t('login.errors.passwordTooShort'));
            return;
        }

        try {
            setLoading(true);

            console.log('Registering user:', trimmedUsername);
            const user = await AuthService.registerUser(trimmedUsername, trimmedPassword);
            console.log('User registered:', user);

            if (!user) {
                throw new Error(t('login.errors.noUser'));
            }

            // Show success message on screen
            setSuccessInfo(t('login.success.register', { username: user.fullUsername }));

            // Automatically log in after 3 seconds
            setTimeout(() => {
                navigation.navigate('Main', {
                    username: user.fullUsername,
                });
            }, 3000);

        } catch (err) {
            console.error('Error during registration:', err);
            setError(err.message || t('login.errors.registerError'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                <View style={styles.header}>
                    <Text style={styles.title}>{t('login.title')}</Text>
                    <Text style={styles.subtitle}>{t('login.subtitle')}</Text>
                </View>

                {/* Tabs */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'login' && styles.activeTab]}
                        onPress={() => {
                            setActiveTab('login');
                            setError('');
                            setSuccessInfo('');
                        }}
                    >
                        <Text style={[styles.tabText, activeTab === 'login' && styles.activeTabText]}>
                            {t('login.tabLogin')}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'register' && styles.activeTab]}
                        onPress={() => {
                            setActiveTab('register');
                            setError('');
                            setSuccessInfo('');
                        }}
                    >
                        <Text style={[styles.tabText, activeTab === 'register' && styles.activeTabText]}>
                            {t('login.tabRegister')}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Login Form */}
                {activeTab === 'login' && (
                    <View style={styles.form}>
                        <Text style={styles.label}>{t('login.usernameFullLabel')}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder={t('login.usernameFullPlaceholder')}
                            placeholderTextColor={colors.placeholder}
                            value={fullUsername}
                            onChangeText={setFullUsername}
                            autoCapitalize="none"
                            autoCorrect={false}
                            editable={!loading}
                        />

                        <Text style={styles.label}>{t('login.passwordLabel')}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder={t('login.passwordPlaceholder')}
                            placeholderTextColor={colors.placeholder}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            autoCapitalize="none"
                            autoCorrect={false}
                            editable={!loading}
                        />

                        {error && <Text style={styles.errorText}>{error}</Text>}

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
                                <Text style={styles.buttonText}>{t('login.join')}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                {/* Register Form */}
                {activeTab === 'register' && (
                    <View style={styles.form}>
                        <Text style={styles.label}>{t('login.usernameLabel')}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder={t('login.usernamePlaceholder')}
                            placeholderTextColor={colors.placeholder}
                            value={username}
                            onChangeText={setUsername}
                            autoCapitalize="none"
                            autoCorrect={false}
                            maxLength={20}
                            editable={!loading}
                        />

                        <Text style={styles.label}>{t('login.passwordLabel')}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder={t('login.passwordMinPlaceholder')}
                            placeholderTextColor={colors.placeholder}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            autoCapitalize="none"
                            autoCorrect={false}
                            editable={!loading}
                        />

                        {error && <Text style={styles.errorText}>{error}</Text>}
                        {successInfo && <Text style={styles.successText}>{successInfo}</Text>}

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
                                <Text style={styles.buttonText}>{t('login.createAccount')}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        {activeTab === 'login'
                            ? t('login.footerLogin')
                            : t('login.footerRegister')}
                    </Text>
                </View>
            </Animated.View>
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
        marginBottom: 40,
    },
    title: {
        fontSize: 56,
        fontWeight: 'bold',
        color: colors.primary,
        marginBottom: 8,
        textShadowColor: 'rgba(255, 107, 53, 0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 10,
    },
    subtitle: {
        fontSize: 16,
        color: colors.textLight,
        fontWeight: '500',
    },
    tabContainer: {
        flexDirection: 'row',
        marginBottom: 32,
        borderRadius: 16,
        backgroundColor: colors.surface,
        padding: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    tab: {
        flex: 1,
        paddingVertical: 14,
        alignItems: 'center',
        borderRadius: 12,
        transition: 'all 0.3s ease',
    },
    activeTab: {
        backgroundColor: colors.primary,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    tabText: {
        fontSize: 15,
        fontWeight: '700',
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
        borderRadius: 14,
        paddingHorizontal: 18,
        paddingVertical: 14,
        fontSize: 16,
        color: colors.text,
        marginBottom: 20,
        borderWidth: 2,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    errorText: {
        color: colors.error,
        fontSize: 13,
        marginTop: -12,
        marginBottom: 16,
        marginLeft: 4,
        fontWeight: '600',
        backgroundColor: '#ffe6e6',
        padding: 10,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: colors.error,
    },
    successText: {
        color: colors.success,
        fontSize: 13,
        marginTop: -12,
        marginBottom: 16,
        marginLeft: 4,
        fontWeight: '600',
        backgroundColor: '#e8f8f5',
        padding: 12,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: colors.success,
        lineHeight: 20,
    },
    button: {
        backgroundColor: colors.primary,
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 8,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    buttonDisabled: {
        backgroundColor: colors.inputBackground,
        opacity: 0.5,
        shadowOpacity: 0,
        elevation: 0,
    },
    buttonText: {
        fontSize: 17,
        fontWeight: 'bold',
        color: colors.textInverse,
    },
    footer: {
        alignItems: 'center',
        marginTop: 32,
        paddingHorizontal: 16,
    },
    footerText: {
        fontSize: 12,
        color: colors.textLight,
        textAlign: 'center',
        lineHeight: 18,
        fontStyle: 'italic',
    },
});

export default LoginScreen;
