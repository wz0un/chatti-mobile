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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import AuthService from '../services/AuthService';
import colors from '../theme/colors';

const ProfileScreen = ({ navigation }) => {
    const [user, setUser] = useState(null);

    useEffect(() => {
        loadUserProfile();
    }, []);

    const loadUserProfile = async () => {
        const currentUser = await AuthService.getCurrentUser();
        setUser(currentUser);
    };

    const copyDeviceId = async () => {
        if (user?.deviceId) {
            await Clipboard.setStringAsync(user.deviceId);
            Alert.alert('Copiado', 'ID de dispositivo copiado al portapapeles');
        }
    };

    const handleLogout = async () => {
        Alert.alert(
            'Cerrar sesión',
            '¿Estás seguro que deseas cerrar sesión?',
            [
                {
                    text: 'Cancelar',
                    style: 'cancel'
                },
                {
                    text: 'Sí, cerrar',
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

    if (!user) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centerContainer}>
                    <Text style={styles.loadingText}>Cargando perfil...</Text>
                </View>
            </SafeAreaView>
        );
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
                            {user.deviceId}
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={styles.copyButton}
                        onPress={copyDeviceId}
                        activeOpacity={0.7}
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
                    onPress={handleLogout}
                    activeOpacity={0.7}
                >
                    <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
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
