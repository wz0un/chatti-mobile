/**
 * Add Contact Screen - Add contact by username#discriminator
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import ApiService from '../services/ApiService';
import AuthService from '../services/AuthService';
import { useTranslation } from '../i18n';
import { useTheme } from '../theme/ThemeContext';
import { useAlert } from '../theme/AlertContext';
import { spacing, borderRadius, shadows, typography } from '../theme/colors';

const AddContactScreen = ({ navigation }) => {
    const { theme, isDark } = useTheme();
    const { alert } = useAlert();
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const { t } = useTranslation();

    const handleSendRequest = async () => {
        if (!searchQuery.trim()) {
            alert({ title: t('common.error'), message: t('addContact.errors.empty'), type: 'error' });
            return;
        }

        if (!searchQuery.includes('#')) {
            alert({ title: t('common.error'), message: t('addContact.errors.invalidFormat'), type: 'error' });
            return;
        }

        try {
            setLoading(true);
            const currentUser = await AuthService.getCurrentUser();
            const recipient = await ApiService.findUserByUsername(searchQuery.trim());

            if (!recipient) {
                alert({ title: t('common.error'), message: t('addContact.errors.notFound'), type: 'error' });
                return;
            }

            if (recipient.userId === currentUser.userId) {
                alert({ title: t('common.error'), message: t('addContact.errors.self'), type: 'error' });
                return;
            }

            const contacts = await ApiService.getContactsList(currentUser.userId);
            const incomingRequests = await ApiService.getContactRequests(currentUser.userId);

            if (contacts.some(c => c.userId === recipient.userId)) {
                alert({ title: t('common.error'), message: t('addContact.errors.alreadyContact'), type: 'error' });
                return;
            }

            if (incomingRequests.some(r => r.senderId === recipient.userId)) {
                alert({ title: t('common.error'), message: t('addContact.errors.incomingRequest'), type: 'error' });
                return;
            }

            await ApiService.sendContactRequest(currentUser.userId, recipient.deviceId, currentUser.fullUsername);

            alert({
                title: t('addContact.successTitle'),
                message: t('addContact.successMessage', { username: recipient.fullUsername }),
                type: 'success',
                onConfirm: () => navigation.goBack()
            });

            setSearchQuery('');
        } catch (error) {
            console.error('Error sending request:', error);
            alert({ title: t('common.error'), message: error.message || t('addContact.errors.send'), type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <Text style={[styles.title, { color: theme.text }]}>{t('addContact.title')}</Text>
                    <Text style={[styles.description, { color: theme.textSecondary }]}>{t('addContact.description')}</Text>

                    <View style={[styles.card, { backgroundColor: theme.surface }]}>
                        <Text style={[styles.label, { color: theme.textSecondary }]}>{t('addContact.step2Title')}</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: theme.surfaceSecondary, color: theme.text, borderColor: theme.border }]}
                            placeholder={t('addContact.placeholder')}
                            placeholderTextColor={theme.textTertiary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.buttonWrapper, loading && { opacity: 0.7 }]}
                        onPress={handleSendRequest}
                        disabled={loading || !searchQuery.trim()}
                    >
                        <LinearGradient
                            colors={theme.gradients.primary}
                            style={styles.button}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('addContact.send')}</Text>}
                        </LinearGradient>
                    </TouchableOpacity>

                    <View style={[styles.infoCard, { backgroundColor: theme.surfaceSecondary, borderLeftColor: theme.primary }]}>
                        <Text style={[styles.infoTitle, { color: theme.text }]}>{t('addContact.infoTitle')}</Text>
                        <Text style={[styles.infoText, { color: theme.textSecondary }]}>{t('addContact.infoText')}</Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: spacing.xl,
    },
    title: {
        ...typography.h2,
        fontWeight: '900',
        marginBottom: spacing.xs,
    },
    description: {
        ...typography.body,
        marginBottom: spacing.xl,
        lineHeight: 22,
    },
    card: {
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.xl,
        ...shadows.sm,
    },
    label: {
        ...typography.bodySmall,
        fontWeight: '700',
        marginBottom: spacing.sm,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    input: {
        height: 56,
        borderRadius: borderRadius.md,
        borderWidth: 1.5,
        paddingHorizontal: spacing.lg,
        fontSize: 16,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    buttonWrapper: {
        ...shadows.md,
        marginBottom: 40,
    },
    button: {
        height: 56,
        borderRadius: borderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800',
    },
    infoCard: {
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        borderLeftWidth: 4,
    },
    infoTitle: {
        ...typography.body,
        fontWeight: '700',
        marginBottom: spacing.xs,
    },
    infoText: {
        ...typography.bodySmall,
        lineHeight: 20,
    },
});

export default AddContactScreen;
