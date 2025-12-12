/**
 * Profile Screen - User profile with shareable device ID
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import AuthService from '../services/AuthService';
import ApiService from '../services/ApiService';
import colors from '../theme/colors';

const ProfileScreen = ({ navigation }) => {
    const [user, setUser] = useState(null);
    const [deviceId, setDeviceId] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadUserProfile();
    }, []);

    const loadUserProfile = async () => {
        try {
            setLoading(true);
            const currentUser = await AuthService.getCurrentUser();
            const currentDeviceId = await AuthService.getDeviceId();

            console.log('Profile - User:', currentUser);
            console.log('Profile - DeviceId:', currentDeviceId);

            // Si no hay usuario, redirigir a login
            if (!currentUser) {
                Alert.alert(
                    'Sesión no encontrada',
                    'Necesitas iniciar sesión primero',
                    [{
                        text: 'OK',
                        onPress: () => {
                            navigation.reset({
                                index: 0,
                                routes: [{ name: 'Login' }],
                            });
                        }
                    }]
                );
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
                {
                    text: 'Cancelar',
                    style: 'cancel'
                },
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

                            // Reset navigation to login
                            navigation.reset({
                                index: 0,
                                routes: [{ name: 'Login' }],
                            });
                        } catch (error) {
                            console.error('Error deleting account:', error);
                            Alert.alert('Error', 'No se pudo eliminar la cuenta. Inténtalo de nuevo.');
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Cargando perfil...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!user) {
        // Este caso ya no debería llegar aquí porque redirigimos arriba
        return null;
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView contentContainerStyle={styles.content}>
                {/* Avatar */}
                <View style={styles.avatarContainer}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {user.username?.charAt(0).toUpperCase() || '?'}
                        </Text>
                    </View>
                </View>

                {/* Username */}
                <Text style={styles.username}>{user.fullUsername}</Text>
                <Text style={styles.label}>Usuario</Text>

                {/* Device ID Section */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>ID Único de Dispositivo</Text>
                    <Text style={styles.cardDescription}>
                        Comparte este ID con otros usuarios para que puedan agregarte como contacto
                    </Text>

                    <View style={styles.deviceIdContainer}>
                        <Text style={styles.deviceIdText} selectable>
                            {deviceId || 'Cargando...'}
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={styles.copyButton}
                        onPress={copyDeviceId}
                        activeOpacity={0.7}
                        disabled={!deviceId}
                    >
                        <Text style={styles.copyButtonText}>📋 Copiar ID</Text>
                    </TouchableOpacity>
                </View>

                {/* Stats Section */}
                <View style={styles.statsCard}>
                    <Text style={styles.cardTitle}>Información</Text>
                    <View style={styles.statsRow}>
                        <View style={styles.stat}>
                            <Text style={styles.statLabel}>User ID</Text>
                            <Text style={styles.statValue} numberOfLines={1}>
                                {user.userId?.substring(0, 12)}...
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Logout Button */}
                <TouchableOpacity
                    style={styles.logoutButton}
                    onPress={handleDeleteAccount}
                    activeOpacity={0.7}
                >
                    <Text style={styles.logoutButtonText}>Eliminar Cuenta</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: colors.textLight,
        marginTop: 12,
    },
    errorText: {
        fontSize: 16,
        color: '#FF3B30',
        marginBottom: 16,
    },
    retryButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    content: {
        padding: 20,
    },
    avatarContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 40,
        fontWeight: 'bold',
        color: '#fff',
    },
    username: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
        textAlign: 'center',
        marginBottom: 4,
    },
    label: {
        fontSize: 14,
        color: colors.textLight,
        textAlign: 'center',
        marginBottom: 24,
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 8,
    },
    cardDescription: {
        fontSize: 14,
        color: colors.textLight,
        marginBottom: 12,
    },
    deviceIdContainer: {
        backgroundColor: colors.background,
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    deviceIdText: {
        fontSize: 12,
        fontFamily: 'monospace',
        color: colors.text,
    },
    copyButton: {
        backgroundColor: colors.primary,
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
    },
    copyButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    statsCard: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    stat: {
        alignItems: 'center',
        flex: 1,
    },
    statLabel: {
        fontSize: 12,
        color: colors.textLight,
        marginBottom: 4,
    },
    statValue: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    logoutButton: {
        backgroundColor: '#FF3B30',
        borderRadius: 8,
        padding: 14,
        alignItems: 'center',
        marginTop: 8,
    },
    logoutButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default ProfileScreen;
