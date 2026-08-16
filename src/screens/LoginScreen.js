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
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AuthService from '../services/AuthService';
import { useTranslation } from '../i18n';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius, shadows, typography } from '../theme/colors';

const { width } = Dimensions.get('window');

const LoginScreen = ({ navigation }) => {
    const { theme, isDark } = useTheme();
    const [activeTab, setActiveTab] = useState('login');
    const [username, setUsername] = useState('');
    const [fullUsername, setFullUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successInfo, setSuccessInfo] = useState('');

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;
    const { t } = useTranslation();

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 800,
                useNativeDriver: true,
            }),
        ]).start();
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
            const user = await AuthService.loginUser(trimmedUsername, trimmedPassword);
            if (!user) throw new Error(t('login.errors.noUser'));

            navigation.navigate('Main', { username: user.fullUsername });
        } catch (err) {
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
            const user = await AuthService.registerUser(trimmedUsername, trimmedPassword);
            if (!user) throw new Error(t('login.errors.noUser'));

            setSuccessInfo(t('login.success.register', { username: user.fullUsername }));

            setTimeout(() => {
                navigation.navigate('Main', { username: user.fullUsername });
            }, 3000);
        } catch (err) {
            setError(err.message || t('login.errors.registerError'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <LinearGradient
                colors={isDark ? ['#111827', '#1F2937'] : ['#FFF7ED', '#FFFFFF']}
                style={StyleSheet.absoluteFill}
            />

            <KeyboardAvoidingView
                style={styles.avoidingView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <Animated.View style={[
                    styles.content,
                    { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
                ]}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: theme.primary }]}>{t('login.title')}</Text>
                        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{t('login.subtitle')}</Text>
                    </View>

                    <View style={[styles.tabContainer, { backgroundColor: theme.surfaceSecondary }]}>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'login' && { backgroundColor: theme.primary, ...shadows.md }]}
                            onPress={() => { setActiveTab('login'); setError(''); setSuccessInfo(''); }}
                        >
                            <Text style={[styles.tabText, { color: activeTab === 'login' ? '#FFF' : theme.textSecondary }]}>
                                {t('login.tabLogin')}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'register' && { backgroundColor: theme.primary, ...shadows.md }]}
                            onPress={() => { setActiveTab('register'); setError(''); setSuccessInfo(''); }}
                        >
                            <Text style={[styles.tabText, { color: activeTab === 'register' ? '#FFF' : theme.textSecondary }]}>
                                {t('login.tabRegister')}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.formContainer}>
                        {activeTab === 'login' ? (
                            <View style={styles.form}>
                                <Text style={[styles.label, { color: theme.textSecondary }]}>{t('login.usernameFullLabel')}</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                                    placeholder={t('login.usernameFullPlaceholder')}
                                    placeholderTextColor={theme.placeholder}
                                    value={fullUsername}
                                    onChangeText={setFullUsername}
                                    autoCapitalize="none"
                                    editable={!loading}
                                />

                                <Text style={[styles.label, { color: theme.textSecondary }]}>{t('login.passwordLabel')}</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                                    placeholder={t('login.passwordPlaceholder')}
                                    placeholderTextColor={theme.placeholder}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                    editable={!loading}
                                />
                            </View>
                        ) : (
                            <View style={styles.form}>
                                <Text style={[styles.label, { color: theme.textSecondary }]}>{t('login.usernameLabel')}</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                                    placeholder={t('login.usernamePlaceholder')}
                                    placeholderTextColor={theme.placeholder}
                                    value={username}
                                    onChangeText={setUsername}
                                    autoCapitalize="none"
                                    editable={!loading}
                                />

                                <Text style={[styles.label, { color: theme.textSecondary }]}>{t('login.passwordLabel')}</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                                    placeholder={t('login.passwordMinPlaceholder')}
                                    placeholderTextColor={theme.placeholder}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                    editable={!loading}
                                />
                            </View>
                        )}

                        {error ? (
                            <View style={[styles.errorBox, { backgroundColor: theme.error + '10', borderLeftColor: theme.error }]}>
                                <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
                            </View>
                        ) : null}

                        {successInfo ? (
                            <View style={[styles.successBox, { backgroundColor: theme.success + '10', borderLeftColor: theme.success }]}>
                                <Text style={[styles.successText, { color: theme.success }]}>{successInfo}</Text>
                            </View>
                        ) : null}

                        <TouchableOpacity
                            onPress={activeTab === 'login' ? handleLogin : handleRegister}
                            disabled={loading}
                            style={styles.buttonWrapper}
                        >
                            <LinearGradient
                                colors={theme.gradients.primary}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={[styles.button, loading && { opacity: 0.7 }]}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <Text style={styles.buttonText}>
                                        {activeTab === 'login' ? t('login.join') : t('login.createAccount')}
                                    </Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.footer}>
                        <Text style={[styles.footerText, { color: theme.textTertiary }]}>
                            {activeTab === 'login' ? t('login.footerLogin') : t('login.footerRegister')}
                        </Text>
                    </View>
                </Animated.View>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    avoidingView: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
    },
    header: {
        alignItems: 'center',
        marginBottom: 48,
    },
    title: {
        fontSize: 48,
        fontWeight: '900',
        letterSpacing: -1,
        marginBottom: spacing.xs,
    },
    subtitle: {
        ...typography.body,
        fontWeight: '500',
    },
    tabContainer: {
        flexDirection: 'row',
        padding: 6,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.xl,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: borderRadius.md,
    },
    tabText: {
        ...typography.bodySmall,
        fontWeight: '700',
    },
    formContainer: {
        width: '100%',
    },
    form: {
        marginBottom: spacing.md,
    },
    label: {
        ...typography.bodySmall,
        fontWeight: '700',
        marginBottom: spacing.xs,
        marginLeft: 4,
    },
    input: {
        height: 56,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.lg,
        fontSize: 16,
        marginBottom: spacing.lg,
        borderWidth: 1.5,
    },
    buttonWrapper: {
        borderRadius: borderRadius.md,
        overflow: 'hidden',
        ...shadows.md,
        marginTop: spacing.md,
    },
    button: {
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        ...typography.body,
        color: '#FFF',
        fontWeight: '800',
    },
    errorBox: {
        padding: spacing.md,
        borderRadius: borderRadius.sm,
        borderLeftWidth: 4,
        marginBottom: spacing.lg,
    },
    errorText: {
        ...typography.bodySmall,
        fontWeight: '600',
    },
    successBox: {
        padding: spacing.md,
        borderRadius: borderRadius.sm,
        borderLeftWidth: 4,
        marginBottom: spacing.lg,
    },
    successText: {
        ...typography.bodySmall,
        fontWeight: '600',
        lineHeight: 20,
    },
    footer: {
        marginTop: 40,
        alignItems: 'center',
    },
    footerText: {
        ...typography.caption,
        textAlign: 'center',
        lineHeight: 18,
        maxWidth: '80%',
    },
});

export default LoginScreen;
