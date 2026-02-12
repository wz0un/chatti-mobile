/**
 * Contact Requests Screen
 * View and manage incoming contact requests
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    FlatList,
    StyleSheet,
    Text,
    ActivityIndicator,
    Alert,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ApiService from '../services/ApiService';
import AuthService from '../services/AuthService';
import ContactRequestItem from '../components/ContactRequestItem';
import colors from '../theme/colors';
import { useTranslation } from '../i18n';

const ContactRequestsScreen = ({ navigation }) => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const { t } = useTranslation();

    useEffect(() => {
        loadCurrentUser();
    }, []);

    useEffect(() => {
        if (currentUser) {
            loadRequests();
        }
    }, [currentUser]);

    // Refresh requests when screen comes into focus
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadRequests();
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
            setRequests(result);
        } catch (error) {
            console.error('Error loading requests:', error);
            Alert.alert(t('common.error'), t('contactRequests.errorLoad'));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadRequests();
    };

    const handleAccept = async (request) => {
        try {
            await ApiService.acceptContactRequest(request.requestId, currentUser.userId);

            Alert.alert(
                t('contactRequests.acceptTitle'),
                t('contactRequests.acceptMessage', { username: request.senderUsername }),
                [
                    {
                        text: t('common.ok'),
                        onPress: () => loadRequests()
                    }
                ]
            );

        } catch (error) {
            console.error('Error accepting request:', error);
            Alert.alert(t('common.error'), error.message || t('contactRequests.errorLoad'));
        }
    };

    const handleReject = async (request) => {
        Alert.alert(
            t('contactRequests.rejectTitle'),
            t('contactRequests.rejectMessage', { username: request.senderUsername }),
            [
                {
                    text: t('common.cancel'),
                    style: 'cancel'
                },
                {
                    text: t('contactRequests.rejectConfirm'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await ApiService.rejectContactRequest(request.requestId, currentUser.userId);
                            loadRequests();
                        } catch (error) {
                            console.error('Error rejecting request:', error);
                            Alert.alert(t('common.error'), t('contactRequests.rejectError'));
                        }
                    }
                }
            ]
        );
    };

    const renderRequest = ({ item }) => (
        <ContactRequestItem
            request={item}
            onAccept={handleAccept}
            onReject={handleReject}
        />
    );

    if (!currentUser) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {loading && requests.length === 0 ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : requests.length === 0 ? (
                <View style={styles.centerContainer}>
                    <Text style={styles.emptyText}>
                        {t('contactRequests.emptyTitle')}
                    </Text>
                    <Text style={styles.emptySubtext}>
                        {t('contactRequests.emptySubtitle')}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={requests}
                    renderItem={renderRequest}
                    keyExtractor={(item) => item.requestId}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            colors={[colors.primary]}
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
        backgroundColor: colors.background,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    emptySubtext: {
        fontSize: 14,
        color: colors.textLight,
        textAlign: 'center',
    },
    list: {
        flexGrow: 1,
    },
});

export default ContactRequestsScreen;
