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
    Alert,
    ScrollView,
    ActivityIndicator,
    Image,
    Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import AuthService from '../services/AuthService';
import ApiService from '../services/ApiService';
import NotificationService from '../services/NotificationService';
import colors, { spacing, borderRadius } from '../theme/colors';

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
            Alert.alert('Copiado', 'ID de dispositivo copiado al portapapeles');
        }
    };

    const handleDeleteAccount = async () => {
        Alert.alert(
            'Eliminar cuenta',
            '¿Estás seguro de que quieres eliminar tu cuenta?\n\nEsta acción:\n• Eliminará todos tus chats privados\n• Eliminará tu usuario\n• Es irreversible',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar cuenta',
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
                            Alert.alert('Error', 'No se pudo eliminar la cuenta');
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleLogout = async () => {
        Alert.alert(
            'Cerrar sesión',
            '¿Estás seguro de que quieres cerrar sesión?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Cerrar sesión',
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
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Ajustes</Text>
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
                <Text style={styles.sectionTitle}>Cuenta</Text>
                <View style={styles.section}>
                    <SettingsItem
                        icon="🔑"
                        label="ID de Dispositivo"
                        value={deviceId ? `${deviceId.substring(0, 8)}...` : 'Cargando...'}
                        onPress={copyDeviceId}
                    />
                    <SettingsItem
                        icon="🔒"
                        label="Privacidad y Seguridad"
                        onPress={() => { }}
                    />
                </View>

                {/* App Settings */}
                <Text style={styles.sectionTitle}>Aplicación</Text>
                <View style={styles.section}>
                    <SettingsItem
                        icon="🔔"
                        label="Notificaciones"
                        hasToggle
                        isToggled={notificationsEnabled}
                        onToggle={(v) => setNotificationsEnabled(v)}
                    />
                    <SettingsItem
                        icon="🌙"
                        label="Modo Oscuro"
                        hasToggle
                        isToggled={darkModeEnabled}
                        onToggle={(v) => setDarkModeEnabled(v)}
                    />
                    <SettingsItem
                        icon="🌐"
                        label="Idioma"
                        value="Español"
                        onPress={() => { }}
                    />
                </View>

                {/* Help & Support */}
                <Text style={styles.sectionTitle}>Ayuda</Text>
                <View style={styles.section}>
                    <SettingsItem
                        icon="❓"
                        label="Preguntas Frecuentes"
                        onPress={() => { }}
                    />
                    <SettingsItem
                        icon="📝"
                        label="Términos y Condiciones"
                        onPress={() => { }}
                    />
                </View>

                {/* Actions */}
                <Text style={styles.sectionTitle}>Acciones</Text>
                <View style={styles.section}>
                    <SettingsItem
                        icon="🚪"
                        label="Cerrar Sesión"
                        isDestructive
                        onPress={handleLogout}
                    />
                    <SettingsItem
                        icon="🗑️"
                        label="Eliminar Cuenta"
                        isDestructive
                        onPress={handleDeleteAccount}
                    />
                </View>

                <Text style={styles.version}>Versión 1.2.0 • Build 2026</Text>
            </ScrollView>
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
        paddingBottom: 40,
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
});

export default ProfileScreen;
