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

const ContactRequestsScreen = ({ navigation }) => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        loadCurrentUser();
    }, []);

    useEffect(() => {
        if (currentUser) {
            loadRequests();
        }
    }, [currentUser]);

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
            Alert.alert('Error', 'No se pudieron cargar las solicitudes');
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
                'Solicitud aceptada',
                `${request.senderUsername} ha sido agregado a tus contactos. ¡Ahora pueden chatear de forma cifrada!`,
                [
                    {
                        text: 'OK',
                        onPress: () => loadRequests()
                    }
                ]
            );

        } catch (error) {
            console.error('Error accepting request:', error);
            Alert.alert('Error', error.message || 'No se pudo aceptar la solicitud');
        }
    };

    const handleReject = async (request) => {
        Alert.alert(
            'Rechazar solicitud',
            `¿Estás seguro que deseas rechazar la solicitud de ${request.senderUsername}?`,
            [
                {
                    text: 'Cancelar',
                    style: 'cancel'
                },
                {
                    text: 'Rechazar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await ApiService.rejectContactRequest(request.requestId, currentUser.userId);
                            loadRequests();
                        } catch (error) {
                            console.error('Error rejecting request:', error);
                            Alert.alert('Error', 'No se pudo rechazar la solicitud');
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
                        No tienes solicitudes pendientes
                    </Text>
                    <Text style={styles.emptySubtext}>
                        Las solicitudes enviadas por otros usuarios aparecerán aquí
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
