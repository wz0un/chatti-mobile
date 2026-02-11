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
    TextInput,
    Modal,
    ActivityIndicator,
    Image,
    Switch,
    ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import AuthService from '../services/AuthService';
import ApiService from '../services/ApiService';
import NotificationService from '../services/NotificationService';
import colors, { spacing, borderRadius } from '../theme/colors';
import { useTranslation } from '../i18n';

const SettingsItem = ({ icon, label, value, onPress, isDestructive, hasToggle, isToggled, onToggle }) => (
    <TouchableOpacity
        style={styles.settingsItem}
        onPress={onPress}
        disabled={hasToggle}
        activeOpacity={0.7}
    >
        <View style={styles.settingsIconContainer}>
            <Text style={styles.settingsIcon}>{icon}</Text>
        </View>
        <View style={styles.settingsContent}>
            <Text style={[styles.settingsLabel, isDestructive && styles.destructiveLabel]}>
                {label}
            </Text>
            {value && <Text style={styles.settingsValue}>{value}</Text>}
        </View>
        {hasToggle ? (
            <Switch
                value={isToggled}
                onValueChange={onToggle}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={'#fff'}
            />
        ) : (
            <Text style={styles.settingsArrow}>›</Text>
        )}
    </TouchableOpacity>
);

const ProfileScreen = ({ navigation }) => {
    const [user, setUser] = useState(null);
    const [deviceId, setDeviceId] = useState('');
    const [loading, setLoading] = useState(true);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [darkModeEnabled, setDarkModeEnabled] = useState(false);
    const { t, language, setLanguage } = useTranslation();

    const languages = [
        { code: 'en', label: 'English' },
        { code: 'es', label: 'Español' },
        { code: 'ar', label: 'العربية' },
        { code: 'fr', label: 'Français' },
    ];

    const currentLanguageLabel = languages.find(l => l.code === language)?.label || 'Español';

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
            Alert.alert(t('profile.copied'), t('profile.copiedText'));
        }
    };

    const [languageModalVisible, setLanguageModalVisible] = useState(false);

    const showLanguageSelector = () => {
        setLanguageModalVisible(true);
    };

    const handleSelectLanguage = (langCode) => {
        setLanguage(langCode);
        setLanguageModalVisible(false);
    };

    const handleDeleteAccount = async () => {
        Alert.alert(
            t('profile.deleteTitle'),
            t('profile.deleteMessage'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('profile.deleteConfirm'),
                    style: 'destructive',
                    onPress: async () => {
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
                            Alert.alert(t('common.error'), t('profile.deleteError'));
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleLogout = async () => {
        Alert.alert(
            t('profile.logoutTitle'),
            t('profile.logoutMessage'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('profile.logoutConfirm'),
                    style: 'destructive',
                    onPress: async () => {
                        await AuthService.logout();
                        navigation.reset({
                            index: 0,
                            routes: [{ name: 'Login' }],
                        });
                    }
                }
            ]
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ marginTop: 10, color: colors.textTertiary }}>{t('profile.loading')}</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{t('profile.title')}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* User Profile Card */}
                <View style={styles.profileCard}>
                    <LinearGradient
                        colors={colors.primaryGradient}
                        style={styles.avatarContainer}
                    >
                        <Text style={styles.avatarText}>
                            {user?.username?.charAt(0).toUpperCase() || '?'}
                        </Text>
                    </LinearGradient>
                    <View style={styles.profileInfo}>
                        <Text style={styles.username}>{user?.fullUsername}</Text>
                        <Text style={styles.userId}>@{user?.username}</Text>
                    </View>
                    <TouchableOpacity onPress={copyDeviceId} style={styles.qrButton}>
                        <Text style={styles.qrIcon}>🆔</Text>
                    </TouchableOpacity>
                </View>

                {/* Account Settings */}
                <Text style={styles.sectionTitle}>{t('profile.sections.account')}</Text>
                <View style={styles.section}>
                    <SettingsItem
                        icon="🔑"
                        label={t('profile.deviceIdTitle')}
                        value={deviceId ? `${deviceId.substring(0, 8)}...` : t('profile.deviceIdPlaceholder')}
                        onPress={copyDeviceId}
                    />
                    <SettingsItem
                        icon="🔒"
                        label={t('profile.items.privacy')}
                        onPress={() => { }}
                    />
                </View>

                {/* App Settings */}
                <Text style={styles.sectionTitle}>{t('profile.sections.app')}</Text>
                <View style={styles.section}>
                    <SettingsItem
                        icon="🔔"
                        label={t('profile.items.notifications')}
                        hasToggle
                        isToggled={notificationsEnabled}
                        onToggle={(v) => setNotificationsEnabled(v)}
                    />
                    <SettingsItem
                        icon="🌙"
                        label={t('profile.items.darkMode')}
                        hasToggle
                        isToggled={darkModeEnabled}
                        onToggle={(v) => setDarkModeEnabled(v)}
                    />
                    <SettingsItem
                        icon="🌐"
                        label={t('profile.items.language')}
                        value={currentLanguageLabel}
                        onPress={showLanguageSelector}
                    />
                </View>

                {/* Help & Support */}
                <Text style={styles.sectionTitle}>{t('profile.sections.help')}</Text>
                <View style={styles.section}>
                    <SettingsItem
                        icon="❓"
                        label={t('profile.items.faq')}
                        onPress={() => { }}
                    />
                    <SettingsItem
                        icon="📝"
                        label={t('profile.items.terms')}
                        onPress={() => { }}
                    />
                </View>

                {/* Actions */}
                <Text style={styles.sectionTitle}>{t('profile.sections.actions')}</Text>
                <View style={styles.section}>
                    <SettingsItem
                        icon="🚪"
                        label={t('profile.items.logout')}
                        isDestructive
                        onPress={handleLogout}
                    />
                    <SettingsItem
                        icon="🗑️"
                        label={t('profile.items.delete')}
                        isDestructive
                        onPress={handleDeleteAccount}
                    />
                </View>

                <Text style={styles.version}>Versión 1.2.0 • Build 2026</Text>
            </ScrollView>

            <Modal
                visible={languageModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setLanguageModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setLanguageModalVisible(false)}
                >
                    <View style={styles.languageModalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('profile.languages.select')}</Text>
                            <TouchableOpacity onPress={() => setLanguageModalVisible(false)}>
                                <Text style={styles.closeButton}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {languages.map((lang) => (
                            <TouchableOpacity
                                key={lang.code}
                                style={[
                                    styles.languageOption,
                                    language === lang.code && styles.languageOptionActive
                                ]}
                                onPress={() => handleSelectLanguage(lang.code)}
                            >
                                <View style={styles.languageInfo}>
                                    <Text style={styles.languageFlag}>
                                        {lang.code === 'en' ? '🇺🇸' :
                                            lang.code === 'es' ? '🇪🇸' :
                                                lang.code === 'ar' ? '🇸🇦' : '🇫🇷'}
                                    </Text>
                                    <Text style={[
                                        styles.languageLabel,
                                        language === lang.code && styles.languageLabelActive
                                    ]}>
                                        {lang.label}
                                    </Text>
                                </View>
                                {language === lang.code && (
                                    <View style={styles.checkIcon}>
                                        <Text style={styles.checkText}>✓</Text>
                                    </View>
                                )}
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
        backgroundColor: colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.border,
        backgroundColor: colors.surface,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 100,
    },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        padding: 16,
        borderRadius: 16,
        marginBottom: 24,
        shadowColor: 'rgba(255, 107, 53, 0.2)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    avatarContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    avatarText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    profileInfo: {
        flex: 1,
    },
    username: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 4,
    },
    userId: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    qrButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    qrIcon: {
        fontSize: 20,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textTertiary,
        marginBottom: 8,
        marginLeft: 12,
        textTransform: 'uppercase',
    },
    section: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        marginBottom: 24,
        overflow: 'hidden',
        shadowColor: 'rgba(255, 107, 53, 0.2)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    settingsItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.border,
    },
    settingsIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    settingsIcon: {
        fontSize: 16,
    },
    settingsContent: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    settingsLabel: {
        fontSize: 16,
        color: colors.text,
    },
    destructiveLabel: {
        color: '#FF3B30',
    },
    settingsValue: {
        fontSize: 14,
        color: colors.textSecondary,
        marginRight: 8,
    },
    settingsArrow: {
        fontSize: 20,
        color: colors.textTertiary,
        marginLeft: 8,
    },
    version: {
        textAlign: 'center',
        color: colors.textTertiary,
        fontSize: 12,
        marginTop: 10,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    languageModalContent: {
        backgroundColor: colors.surface,
        width: '100%',
        maxWidth: 340,
        borderRadius: 24,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingHorizontal: 4,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
    },
    closeButton: {
        fontSize: 20,
        color: colors.textSecondary,
        padding: 4,
    },
    languageOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 16,
        marginBottom: 8,
        backgroundColor: colors.background,
    },
    languageOptionActive: {
        backgroundColor: colors.primary + '15',
        borderWidth: 1,
        borderColor: colors.primary + '30',
    },
    languageInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    languageFlag: {
        fontSize: 24,
        marginRight: 16,
    },
    languageLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.text,
    },
    languageLabelActive: {
        color: colors.primary,
        fontWeight: '700',
    },
    checkIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    }
});

export default ProfileScreen;
