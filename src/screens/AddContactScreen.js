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
    const [deviceId, setDeviceId] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSendRequest = async () => {
        if (!deviceId.trim()) {
            Alert.alert('Error', 'Por favor ingresa un Device ID válido');
            return;
        }

        try {
            setLoading(true);
            const currentUser = await AuthService.getCurrentUser();

            // Validate that user exists
            const recipient = await ApiService.getUserByDeviceId(deviceId.trim());
            if (!recipient) {
                Alert.alert('Error', 'Usuario no encontrado con ese Device ID');
                return;
            }

            // Check if trying to add yourself
            if (recipient.userId === currentUser.userId) {
                Alert.alert('Error', 'No puedes agregarte a ti mismo como contacto');
                return;
            }

            // Send request
            await ApiService.sendContactRequest(
                currentUser.userId,
                deviceId.trim(),
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

            setDeviceId('');

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
                    Pega el Device ID del usuario que deseas agregar como contacto
                </Text>

                <TextInput
                    style={styles.input}
                    placeholder="Pega aquí el Device ID..."
                    placeholderTextColor={colors.textLight}
                    value={deviceId}
                    onChangeText={setDeviceId}
                    multiline
                    autoCapitalize="none"
                    autoCorrect={false}
                />

                <TouchableOpacity
                    style={[styles.sendButton, loading && styles.sendButtonDisabled]}
                    onPress={handleSendRequest}
                    disabled={loading || !deviceId.trim()}
                    activeOpacity={0.7}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.sendButtonText}>Enviar Solicitud</Text>
                    )}
                </TouchableOpacity>

                <View style={styles.infoBox}>
                    <Text style={styles.infoTitle}>💡 Cómo funciona</Text>
                    <Text style={styles.infoText}>
                        1. El otro usuario debe compartir su Device ID contigo{'\n'}
                        2. Pega su ID aquí y envía la solicitud{'\n'}
                        3. Espera a que acepte tu solicitud{'\n'}
                        4. Una vez aceptada, podrán chatear de forma cifrada
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
        marginBottom: 24,
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
        minHeight: 80,
        textAlignVertical: 'top',
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
