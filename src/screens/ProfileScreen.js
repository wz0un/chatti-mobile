/**
 * Profile Screen - Settings Menu Style
 * Redesigned with modern UI/UX inspired by Telegram/WhatsApp
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import AuthService from '../services/AuthService';
import ApiService from '../services/ApiService';
import { spacing, borderRadius, typography, shadows } from '../theme/colors';
import { useTranslation } from '../i18n';
import { useTheme } from '../theme/ThemeContext';
import { useAlert } from '../theme/AlertContext';

const SettingsItem = ({ icon, label, value, onPress, isDestructive, theme }) => (
    <TouchableOpacity
        style={[styles.settingsItem, { borderBottomColor: theme.divider }]}
        onPress={onPress}
        activeOpacity={0.7}
    >
        <View style={[styles.settingsIconContainer, { backgroundColor: isDestructive ? theme.error + '15' : theme.surfaceSecondary }]}>
            <Text style={styles.settingsIcon}>{icon}</Text>
        </View>
        <View style={styles.settingsContent}>
            <Text style={[styles.settingsLabel, { color: isDestructive ? theme.error : theme.text }]}>
                {label}
            </Text>
            {value && <Text style={[styles.settingsValue, { color: theme.textSecondary }]}>{value}</Text>}
        </View>
        <Text style={[styles.settingsArrow, { color: theme.textTertiary }]}>›</Text>
    </TouchableOpacity>
);

const ProfileScreen = ({ navigation }) => {
    const { theme, themeMode, setThemeMode, isDark } = useTheme();
    const { alert } = useAlert();
    const [user, setUser] = useState(null);
    const [deviceId, setDeviceId] = useState('');
    const [loading, setLoading] = useState(true);
    const { t, language, setLanguage } = useTranslation();

    const [languageModalVisible, setLanguageModalVisible] = useState(false);
    const [themeModalVisible, setThemeModalVisible] = useState(false);

    const languages = [
        { code: 'en', label: 'English', flag: '🇺🇸' },
        { code: 'es', label: 'Español', flag: '🇪🇸' },
        { code: 'ar', label: 'العربية', flag: '🇸🇦' },
        { code: 'fr', label: 'Français', flag: '🇫🇷' },
    ];

    const themes = [
        { code: 'light', label: t('profile.theme.light'), icon: '☀️' },
        { code: 'dark', label: t('profile.theme.dark'), icon: '🌙' },
        { code: 'system', label: t('profile.theme.system'), icon: '📱' },
    ];

    const currentLanguageLabel = languages.find(l => l.code === language)?.label || 'Español';
    const currentThemeLabel = themes.find(th => th.code === themeMode)?.label || t('profile.theme.system');

    useEffect(() => {
        loadUserProfile();
    }, []);

    const loadUserProfile = async () => {
        try {
            setLoading(true);
            const currentUser = await AuthService.getCurrentUser();
            const currentDeviceId = await AuthService.getDeviceId();

            if (!currentUser) {
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'Login' }],
                });
                return;
            }

            setUser(currentUser);
            setDeviceId(currentDeviceId);
        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const copyDeviceId = async () => {
        if (deviceId) {
            await Clipboard.setStringAsync(deviceId);
            alert({
                title: t('profile.copied'),
                message: t('profile.copiedText'),
                type: 'success'
            });
        }
    };

    const handleDeleteAccount = async () => {
        alert({
            title: t('profile.deleteTitle'),
            message: t('profile.deleteMessage'),
            type: 'error',
            confirmText: t('profile.deleteConfirm'),
            cancelText: t('common.cancel'),
            onConfirm: async () => {
                try {
                    setLoading(true);
                    if (user && user.userId) {
                        await ApiService.deleteAccount(user.userId, deviceId);
                    }
                    await AuthService.logout();
                    navigation.reset({
                        index: 0,
                        routes: [{ name: 'Login' }],
                    });
                } catch (error) {
                    alert({
                        title: t('common.error'),
                        message: t('profile.deleteError'),
                        type: 'error'
                    });
                    setLoading(false);
                }
            }
        });
    };

    const handleLogout = async () => {
        alert({
            title: t('profile.logoutTitle'),
            message: t('profile.logoutMessage'),
            confirmText: t('profile.logoutConfirm'),
            cancelText: t('common.cancel'),
            onConfirm: async () => {
                await AuthService.logout();
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'Login' }],
                });
            }
        });
    };

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={{ marginTop: 10, color: theme.textTertiary }}>{t('profile.loading')}</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
            <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>{t('profile.title')}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* User Profile Card */}
                <View style={[styles.profileCard, { backgroundColor: theme.surface, ...shadows.md }]}>
                    <LinearGradient
                        colors={theme.gradients.primary}
                        style={styles.avatarContainer}
                    >
                        <Text style={styles.avatarText}>
                            {user?.username?.charAt(0).toUpperCase() || '?'}
                        </Text>
                    </LinearGradient>
                    <View style={styles.profileInfo}>
                        <Text style={[styles.username, { color: theme.text }]}>{user?.fullUsername}</Text>
                        <Text style={[styles.userId, { color: theme.textSecondary }]}>@{user?.username}</Text>
                    </View>
                    <TouchableOpacity onPress={copyDeviceId} style={[styles.qrButton, { backgroundColor: theme.background }]}>
                        <Text style={styles.qrIcon}>🆔</Text>
                    </TouchableOpacity>
                </View>

                {/* Account Settings */}
                <Text style={[styles.sectionTitle, { color: theme.textTertiary }]}>{t('profile.sections.account')}</Text>
                <View style={[styles.section, { backgroundColor: theme.surface, ...shadows.sm }]}>
                    <SettingsItem
                        icon="🔑"
                        label={t('profile.deviceIdTitle')}
                        value={deviceId ? `${deviceId.substring(0, 8)}...` : t('profile.deviceIdPlaceholder')}
                        onPress={copyDeviceId}
                        theme={theme}
                    />
                    <SettingsItem
                        icon="🔒"
                        label={t('profile.items.privacy')}
                        onPress={() => { }}
                        theme={theme}
                    />
                </View>

                {/* App Settings */}
                <Text style={[styles.sectionTitle, { color: theme.textTertiary }]}>{t('profile.sections.app')}</Text>
                <View style={[styles.section, { backgroundColor: theme.surface, ...shadows.sm }]}>
                    <SettingsItem
                        icon="🎨"
                        label={t('profile.theme.title')}
                        value={currentThemeLabel}
                        onPress={() => setThemeModalVisible(true)}
                        theme={theme}
                    />
                    <SettingsItem
                        icon="🌐"
                        label={t('profile.items.language')}
                        value={currentLanguageLabel}
                        onPress={() => setLanguageModalVisible(true)}
                        theme={theme}
                    />
                </View>

                {/* Actions */}
                <Text style={[styles.sectionTitle, { color: theme.textTertiary }]}>{t('profile.sections.actions')}</Text>
                <View style={[styles.section, { backgroundColor: theme.surface, ...shadows.sm }]}>
                    <SettingsItem
                        icon="🚪"
                        label={t('profile.items.logout')}
                        onPress={handleLogout}
                        theme={theme}
                    />
                    <SettingsItem
                        icon="🗑️"
                        label={t('profile.items.delete')}
                        isDestructive
                        onPress={handleDeleteAccount}
                        theme={theme}
                    />
                </View>

                <Text style={[styles.version, { color: theme.textTertiary }]}>Versión 1.3.0 • Premium Design</Text>
            </ScrollView>

            {/* Language Modal */}
            <Modal
                visible={languageModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setLanguageModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setLanguageModalVisible(false)}
                >
                    <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>{t('profile.languages.select')}</Text>
                        </View>

                        {languages.map((lang) => (
                            <TouchableOpacity
                                key={lang.code}
                                style={[
                                    styles.optionItem,
                                    { backgroundColor: language === lang.code ? theme.primary + '15' : 'transparent' }
                                ]}
                                onPress={() => {
                                    setLanguage(lang.code);
                                    setLanguageModalVisible(false);
                                }}
                            >
                                <View style={styles.optionInfo}>
                                    <Text style={styles.optionFlag}>{lang.flag}</Text>
                                    <Text style={[
                                        styles.optionLabel,
                                        { color: language === lang.code ? theme.primary : theme.text, fontWeight: language === lang.code ? '700' : '400' }
                                    ]}>
                                        {lang.label}
                                    </Text>
                                </View>
                                {language === lang.code && <View style={[styles.checkDot, { backgroundColor: theme.primary }]} />}
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Theme Modal */}
            <Modal
                visible={themeModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setThemeModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setThemeModalVisible(false)}
                >
                    <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>{t('profile.theme.select')}</Text>
                        </View>

                        {themes.map((th) => (
                            <TouchableOpacity
                                key={th.code}
                                style={[
                                    styles.optionItem,
                                    { backgroundColor: themeMode === th.code ? theme.primary + '15' : 'transparent' }
                                ]}
                                onPress={() => {
                                    setThemeMode(th.code);
                                    setThemeModalVisible(false);
                                }}
                            >
                                <View style={styles.optionInfo}>
                                    <Text style={styles.optionFlag}>{th.icon}</Text>
                                    <Text style={[
                                        styles.optionLabel,
                                        { color: themeMode === th.code ? theme.primary : theme.text, fontWeight: themeMode === th.code ? '700' : '400' }
                                    ]}>
                                        {th.label}
                                    </Text>
                                </View>
                                {themeMode === th.code && <View style={[styles.checkDot, { backgroundColor: theme.primary }]} />}
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
    },
    headerTitle: {
        ...typography.h2,
    },
    scrollContent: {
        padding: spacing.lg,
        paddingBottom: 40,
    },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.xl,
    },
    avatarContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    avatarText: {
        ...typography.h2,
        color: '#FFFFFF',
    },
    profileInfo: {
        flex: 1,
    },
    username: {
        ...typography.h3,
        marginBottom: 2,
    },
    userId: {
        ...typography.bodySmall,
    },
    qrButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    qrIcon: {
        fontSize: 20,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        marginBottom: spacing.sm,
        marginLeft: spacing.sm,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    section: {
        borderRadius: borderRadius.lg,
        marginBottom: spacing.xl,
        overflow: 'hidden',
    },
    settingsItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderBottomWidth: 1,
    },
    settingsIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    settingsIcon: {
        fontSize: 18,
    },
    settingsContent: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    settingsLabel: {
        ...typography.body,
        fontWeight: '500',
    },
    settingsValue: {
        ...typography.bodySmall,
        marginRight: spacing.xs,
    },
    settingsArrow: {
        fontSize: 20,
        marginLeft: spacing.xs,
    },
    version: {
        textAlign: 'center',
        ...typography.caption,
        marginTop: spacing.md,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    modalContent: {
        width: '100%',
        maxWidth: 340,
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        ...shadows.lg,
    },
    modalHeader: {
        marginBottom: spacing.lg,
    },
    modalTitle: {
        ...typography.h3,
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: spacing.xs,
    },
    optionInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    optionFlag: {
        fontSize: 24,
        marginRight: spacing.md,
    },
    optionLabel: {
        ...typography.body,
    },
    checkDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
});

export default ProfileScreen;
