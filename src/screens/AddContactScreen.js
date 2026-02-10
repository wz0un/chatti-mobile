/**
 * Add Contact Screen - Add contact by device ID
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ApiService from '../services/ApiService';
import AuthService from '../services/AuthService';
import colors from '../theme/colors';

const AddContactScreen = ({ navigation }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSendRequest = async () => {
        if (!searchQuery.trim()) {
            Alert.alert('Error', 'Por favor ingresa un nombre de usuario válido (ej. usuario#1234)');
            return;
        }

        if (!searchQuery.includes('#')) {
            Alert.alert('Error', 'El formato debe ser usuario#1234');
            return;
        }

        try {
            setLoading(true);
            const currentUser = await AuthService.getCurrentUser();

            // Find user by username#discriminator
            const recipient = await ApiService.findUserByUsername(searchQuery.trim());

            if (!recipient) {
                Alert.alert('Error', 'Usuario no encontrado');
                return;
            }

            // Check if trying to add yourself
            if (recipient.userId === currentUser.userId) {
                Alert.alert('Error', 'No puedes agregarte a ti mismo como contacto');
                return;
            }

            // Check if already in contacts or has pending request
            const contacts = await ApiService.getContactsList(currentUser.userId);
            const incomingRequests = await ApiService.getContactRequests(currentUser.userId);

            const isAlreadyContact = contacts.some(c => c.userId === recipient.userId);
            const hasIncomingRequest = incomingRequests.some(r => r.senderId === recipient.userId);

            if (isAlreadyContact) {
                Alert.alert('Error', 'Este usuario ya está en tu lista de contactos');
                return;
            }

            if (hasIncomingRequest) {
                Alert.alert('Error', 'Este usuario ya te ha enviado una solicitud. Revisa tus solicitudes pendientes.');
                return;
            }

            // Send request
            await ApiService.sendContactRequest(
                currentUser.userId,
                recipient.deviceId,
                currentUser.fullUsername
            );

            Alert.alert(
                'Solicitud enviada',
                `Se ha enviado una solicitud de contacto a ${recipient.fullUsername}`,
                [
                    {
                        text: 'OK',
                        onPress: () => navigation.goBack()
                    }
                ]
            );

            setSearchQuery('');

        } catch (error) {
            console.error('Error sending contact request:', error);
            Alert.alert('Error', error.message || 'No se pudo enviar la solicitud');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.content}>
                <Text style={styles.title}>Agregar Contacto</Text>
                <Text style={styles.description}>
                    Para agregar un contacto, ingresa su nombre de usuario y etiqueta
                </Text>

                <View style={styles.stepBox}>
                    <Text style={styles.stepTitle}>📋 Paso 1: Obtén el nombre</Text>
                    <Text style={styles.stepText}>
                        Pide a tu amigo su nombre de usuario completo (ej. Alejandro#1234)
                    </Text>
                </View>

                <View style={styles.stepBox}>
                    <Text style={styles.stepTitle}>✏️ Paso 2: Ingresa el nombre aquí</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Ejemplo: usuario#1234"
                        placeholderTextColor={colors.textLight}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.sendButton, loading && styles.sendButtonDisabled]}
                    onPress={handleSendRequest}
                    disabled={loading || !searchQuery.trim()}
                    activeOpacity={0.7}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.sendButtonText}>✉️ Enviar Solicitud</Text>
                    )}
                </TouchableOpacity>

                <View style={styles.infoBox}>
                    <Text style={styles.infoTitle}>💡 ¿Cómo funciona?</Text>
                    <Text style={styles.infoText}>
                        • Tu contacto recibirá una solicitud{'\n'}
                        • Debe aceptarla en "📬 Solicitudes"{'\n'}
                        • Una vez aceptada, podrán chatear cifrado 🔒{'\n'}
                        • Solo los contactos aceptados pueden chatear
                    </Text>
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 8,
    },
    description: {
        fontSize: 14,
        color: colors.textLight,
        marginBottom: 20,
    },
    stepBox: {
        backgroundColor: colors.surface,
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        borderLeftWidth: 3,
        borderLeftColor: colors.primary,
    },
    stepTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 8,
    },
    stepText: {
        fontSize: 14,
        color: colors.textLight,
        lineHeight: 20,
    },
    input: {
        backgroundColor: colors.surface,
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        fontFamily: 'monospace',
        color: colors.text,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 16,
    },
    sendButton: {
        backgroundColor: colors.primary,
        borderRadius: 8,
        padding: 14,
        alignItems: 'center',
        marginBottom: 24,
    },
    sendButtonDisabled: {
        opacity: 0.6,
    },
    sendButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    infoBox: {
        backgroundColor: colors.surface,
        borderRadius: 8,
        padding: 16,
        borderLeftWidth: 4,
        borderLeftColor: colors.primary,
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 8,
    },
    infoText: {
        fontSize: 14,
        color: colors.textLight,
        lineHeight: 20,
    },
});

export default AddContactScreen;
