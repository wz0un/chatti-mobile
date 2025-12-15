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
import { useTranslation } from '../i18n';

const AddContactScreen = ({ navigation }) => {
    const [deviceId, setDeviceId] = useState('');
    const [loading, setLoading] = useState(false);
    const { t } = useTranslation();

    const handleSendRequest = async () => {
        if (!deviceId.trim()) {
            Alert.alert(t('common.error'), t('addContact.errors.empty'));
            return;
        }

        try {
            setLoading(true);
            const currentUser = await AuthService.getCurrentUser();

            // Validate that user exists
            const recipient = await ApiService.getUserByDeviceId(deviceId.trim());
            if (!recipient) {
                Alert.alert(t('common.error'), t('addContact.errors.notFound'));
                return;
            }

            // Check if trying to add yourself
            if (recipient.userId === currentUser.userId) {
                Alert.alert(t('common.error'), t('addContact.errors.self'));
                return;
            }

            // Send request
            await ApiService.sendContactRequest(
                currentUser.userId,
                deviceId.trim(),
                currentUser.fullUsername
            );

            Alert.alert(
                t('addContact.successTitle'),
                t('addContact.successMessage', { username: recipient.fullUsername }),
                [
                    {
                        text: t('common.ok'),
                        onPress: () => navigation.goBack()
                    }
                ]
            );

            setDeviceId('');

        } catch (error) {
            console.error('Error sending contact request:', error);
            Alert.alert(t('common.error'), error.message || t('addContact.errors.send'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.content}>
                <Text style={styles.title}>{t('addContact.title')}</Text>
                <Text style={styles.description}>
                    {t('addContact.description')}
                </Text>

                <View style={styles.stepBox}>
                    <Text style={styles.stepTitle}>{t('addContact.step1Title')}</Text>
                    <Text style={styles.stepText}>
                        {t('addContact.step1Text')}
                    </Text>
                </View>

                <View style={styles.stepBox}>
                    <Text style={styles.stepTitle}>{t('addContact.step2Title')}</Text>
                    <TextInput
                        style={styles.input}
                        placeholder={t('addContact.placeholder')}
                        placeholderTextColor={colors.textLight}
                        value={deviceId}
                        onChangeText={setDeviceId}
                        multiline
                        numberOfLines={3}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.sendButton, loading && styles.sendButtonDisabled]}
                    onPress={handleSendRequest}
                    disabled={loading || !deviceId.trim()}
                    activeOpacity={0.7}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                            <Text style={styles.sendButtonText}>{t('addContact.send')}</Text>
                    )}
                </TouchableOpacity>

                <View style={styles.infoBox}>
                    <Text style={styles.infoTitle}>{t('addContact.infoTitle')}</Text>
                    <Text style={styles.infoText}>
                        {t('addContact.infoText')}
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
