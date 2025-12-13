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

        try {
            // WORKAROUND: The contact object from getContactsList may not have the public key.
            // Fetch the full user object to ensure we have the key and avoid calling the broken worker endpoint.
            console.log(`Fetching full user object for ${contact.fullUsername} to get public key.`);
            const fullUser = await ApiService.findUserByUsername(contact.fullUsername);

            if (!fullUser || !fullUser.publicKey) {
                console.error('Could not retrieve public key for contact:', contact.fullUsername);
                Alert.alert('Error', `No se pudo obtener la clave pública para ${contact.fullUsername}. No se puede iniciar el chat cifrado.`);
                return;
            }

            // Navigate to direct message
            navigation.navigate('DirectMessage', {
                conversationId: contact.conversationId,
                recipientId: contact.userId,
                recipientUsername: contact.fullUsername,
                recipientPublicKey: fullUser.publicKey, // Use the key we just fetched
                userId: currentUser.userId,
                username: currentUser.fullUsername,
            });
        } catch (error) {
            console.error('Error starting conversation with contact:', error);
            Alert.alert('Error', 'No se pudo iniciar la conversación');
        }
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
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Contactos</Text>
                <View style={styles.headerButtons}>
                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={() => navigation.navigate('ContactRequests')}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.headerButtonText}>
                            📬
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
                        <Text style={styles.headerButtonText}>+</Text>
                    </TouchableOpacity>
                </View>
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
    header: {
        backgroundColor: colors.surface,
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
    },
    headerButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    headerButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 44,
    },
    addButton: {
        backgroundColor: colors.secondary,
    },
    headerButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    badge: {
        backgroundColor: '#FF3B30',
        color: '#fff',
        fontSize: 11,
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
