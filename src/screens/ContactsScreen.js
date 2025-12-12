/**
 * Contacts Screen - List accepted contacts
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    Text,
    Alert,
    RefreshControl,
    TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ApiService from '../services/ApiService';
import AuthService from '../services/AuthService';
import UserListItem from '../components/UserListItem';
import colors from '../theme/colors';

const ContactsScreen = ({ navigation }) => {
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [pendingCount, setPendingCount] = useState(0);

    useEffect(() => {
        loadCurrentUser();
    }, []);

    useEffect(() => {
        if (currentUser) {
            loadContacts();
            loadPendingCount();
        }
    }, [currentUser]);

    // Refresh when screen comes into focus
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            if (currentUser) {
                loadContacts();
                loadPendingCount();
            }
        });

        return unsubscribe;
    }, [navigation, currentUser]);

    const loadCurrentUser = async () => {
        const user = await AuthService.getCurrentUser();
        setCurrentUser(user);
    };

    const loadContacts = async () => {
        if (!currentUser) return;

        try {
            setLoading(true);
            const result = await ApiService.getContactsList(currentUser.userId);
            setContacts(result);
        } catch (error) {
            console.error('Error loading contacts:', error);
            Alert.alert('Error', 'No se pudieron cargar los contactos');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const loadPendingCount = async () => {
        if (!currentUser) return;

        try {
            const requests = await ApiService.getContactRequests(currentUser.userId);
            setPendingCount(requests.length);
        } catch (error) {
            console.error('Error loading pending count:', error);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadContacts();
        loadPendingCount();
    };

    const handleContactPress = async (contact) => {
        if (!currentUser) {
            Alert.alert('Error', 'No se pudo obtener tu usuario actual');
            return;
        }

        // Navigate to direct message
        navigation.navigate('DirectMessage', {
            conversationId: contact.conversationId,
            recipientId: contact.userId,
            recipientUsername: contact.fullUsername,
            recipientPublicKey: contact.publicKey,
            userId: currentUser.userId,
            username: currentUser.fullUsername,
        });
    };

    const renderContact = ({ item }) => (
        <UserListItem
            user={item}
            onPress={() => handleContactPress(item)}
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
            {/* Header Buttons */}
            <View style={styles.headerButtons}>
                <TouchableOpacity
                    style={styles.headerButton}
                    onPress={() => navigation.navigate('ContactRequests')}
                    activeOpacity={0.7}
                >
                    <Text style={styles.headerButtonText}>
                        📬 Solicitudes
                        {pendingCount > 0 && (
                            <Text style={styles.badge}> {pendingCount}</Text>
                        )}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.headerButton, styles.addButton]}
                    onPress={() => navigation.navigate('AddContact')}
                    activeOpacity={0.7}
                >
                    <Text style={styles.headerButtonText}>+ Agregar</Text>
                </TouchableOpacity>
            </View>

            {loading && contacts.length === 0 ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : contacts.length === 0 ? (
                <View style={styles.centerContainer}>
                    <Text style={styles.emptyText}>
                        No tienes contactos aún
                    </Text>
                    <Text style={styles.emptySubtext}>
                        Agrega contactos para comenzar a  chatear de forma cifrada
                    </Text>
                    <TouchableOpacity
                        style={styles.emptyButton}
                        onPress={() => navigation.navigate('AddContact')}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.emptyButtonText}>+ Agregar Contacto</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={contacts}
                    renderItem={renderContact}
                    keyExtractor={(item) => item.userId}
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
    headerButtons: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerButton: {
        flex: 1,
        backgroundColor: colors.primary,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    addButton: {
        backgroundColor: colors.secondary,
    },
    headerButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    badge: {
        backgroundColor: '#FF3B30',
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
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
        marginBottom: 20,
    },
    emptyButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    emptyButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    list: {
        flexGrow: 1,
    },
});

export default ContactsScreen;
