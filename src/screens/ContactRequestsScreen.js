/**
 * Contact Requests Screen
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    FlatList,
    StyleSheet,
    Text,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ApiService from '../services/ApiService';
import AuthService from '../services/AuthService';
import ContactRequestItem from '../components/ContactRequestItem';
import { useTranslation } from '../i18n';
import { useTheme } from '../theme/ThemeContext';
import { useAlert } from '../theme/AlertContext';
import { spacing, typography } from '../theme/colors';

const ContactRequestsScreen = ({ navigation }) => {
    const { theme } = useTheme();
    const { alert } = useAlert();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const { t } = useTranslation();

    useEffect(() => {
        loadCurrentUser();
    }, []);

    useEffect(() => {
        if (currentUser) loadRequests();
    }, [currentUser]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            if (currentUser) loadRequests();
        });
        return unsubscribe;
    }, [navigation, currentUser]);

    const loadCurrentUser = async () => {
        const user = await AuthService.getCurrentUser();
        setCurrentUser(user);
    };

    const loadRequests = async () => {
        if (!currentUser) return;
        try {
            setLoading(true);
            const result = await ApiService.getContactRequests(currentUser.userId);
            setRequests(result || []);
        } catch (error) {
            console.error('Error loading requests:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleAccept = async (request) => {
        try {
            await ApiService.acceptContactRequest(request.requestId, currentUser.userId);
            alert({
                title: t('contactRequests.acceptTitle'),
                message: t('contactRequests.acceptMessage', { username: request.senderUsername }),
                type: 'success',
                onConfirm: () => loadRequests()
            });
        } catch (error) {
            console.error('Error accepting request:', error);
            alert({ title: t('common.error'), message: error.message || t('contactRequests.errorLoad'), type: 'error' });
        }
    };

    const handleReject = async (request) => {
        alert({
            title: t('contactRequests.rejectTitle'),
            message: t('contactRequests.rejectMessage', { username: request.senderUsername }),
            type: 'error',
            confirmText: t('contactRequests.rejectConfirm'),
            onConfirm: async () => {
                try {
                    await ApiService.rejectContactRequest(request.requestId, currentUser.userId);
                    loadRequests();
                } catch (error) {
                    console.error('Error rejecting request:', error);
                }
            }
        });
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
            <View style={[styles.header, { backgroundColor: theme.surface }]}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>{t('contactRequests.title')}</Text>
            </View>

            {loading && requests.length === 0 ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            ) : requests.length === 0 ? (
                <View style={styles.centerContainer}>
                    <Text style={[styles.emptyIcon, { color: theme.primary + '30' }]}>📬</Text>
                    <Text style={[styles.emptyText, { color: theme.text }]}>{t('contactRequests.emptyTitle')}</Text>
                    <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>{t('contactRequests.emptySubtitle')}</Text>
                </View>
            ) : (
                <FlatList
                    data={requests}
                    renderItem={({ item }) => <ContactRequestItem request={item} onAccept={handleAccept} onReject={handleReject} />}
                    keyExtractor={(item) => item.requestId}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => { setRefreshing(true); loadRequests(); }}
                            colors={[theme.primary]}
                            tintColor={theme.primary}
                        />
                    }
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    headerTitle: {
        ...typography.h2,
        fontWeight: '900',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    emptyIcon: {
        fontSize: 80,
        marginBottom: spacing.lg,
    },
    emptyText: {
        ...typography.h3,
        marginBottom: spacing.xs,
        textAlign: 'center',
    },
    emptySubtext: {
        ...typography.body,
        textAlign: 'center',
    },
    list: {
        flexGrow: 1,
    },
});

export default ContactRequestsScreen;
