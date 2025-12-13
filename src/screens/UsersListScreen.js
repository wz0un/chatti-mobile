/**
 * Users List Screen
 * List and search registered users
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    FlatList,
    TextInput,
    StyleSheet,
    ActivityIndicator,
    Text,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ApiService from '../services/ApiService';
import AuthService from '../services/AuthService';
import UserListItem from '../components/UserListItem';
import colors from '../theme/colors';

const UsersListScreen = ({ navigation }) => {
    const [users, setUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        loadCurrentUser();
        loadUsers();
    }, []);

    const loadCurrentUser = async () => {
        const user = await AuthService.getCurrentUser();
        setCurrentUser(user);
    };

    const loadUsers = async () => {
        try {
            setLoading(true);
            const result = await ApiService.listUsers(null, 50);
            // Filter out current user
            const filtered = result.users.filter(
                u => u.userId !== currentUser?.userId
            );
            setUsers(filtered);
        } catch (error) {
            console.error('Error loading users:', error);
            Alert.alert('Error', 'No se pudieron cargar los usuarios');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (query) => {
        setSearchQuery(query);

        if (!query || query.length < 2) {
            loadUsers();
            return;
        }

        try {
            setLoading(true);
            const results = await ApiService.searchUsers(query);
            // Filter out current user
            const filtered = results.filter(
                u => u.userId !== currentUser?.userId
            );
            setUsers(filtered);
        } catch (error) {
            console.error('Error searching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUserPress = async (user) => {
        if (!currentUser) {
            Alert.alert('Error', 'No se pudo obtener tu usuario actual');
            return;
        }

        console.log('Starting conversation with user:', JSON.stringify(user, null, 2));

        try {
            // WORKAROUND: The user object from listUsers doesn't have the public key.
            // Fetch the full user object to get the key and avoid calling the broken worker endpoint.
            console.log(`Fetching full user object for ${user.fullUsername} to get public key.`);
            const fullUser = await ApiService.findUserByUsername(user.fullUsername);

            if (!fullUser || !fullUser.publicKey) {
                console.error('Could not retrieve public key for user:', user.fullUsername);
                Alert.alert('Error', `No se pudo obtener la clave pública para ${user.fullUsername}. No se puede iniciar el chat cifrado.`);
                return;
            }

            // Start or get existing conversation
            const result = await ApiService.startDirectMessage(
                currentUser.userId,
                user.userId
            );

            console.log('Started DM, result:', JSON.stringify(result, null, 2));

            // Navigate to direct message screen
            navigation.navigate('DirectMessage', {
                conversationId: result.conversationId,
                recipientId: user.userId,
                recipientUsername: user.fullUsername,
                recipientPublicKey: fullUser.publicKey, // Use the key we just fetched
                userId: currentUser.userId,
                username: currentUser.fullUsername,
            });
        } catch (error) {
            console.error('Error starting conversation:', error);
            Alert.alert('Error', 'No se pudo iniciar la conversación');
        }
    };

    const renderUser = ({ item }) => (
        <UserListItem
            user={item}
            onPress={() => handleUserPress(item)}
        />
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar usuarios (username#1234)..."
                    value={searchQuery}
                    onChangeText={handleSearch}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
            </View>

            {loading && users.length === 0 ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : users.length === 0 ? (
                <View style={styles.centerContainer}>
                    <Text style={styles.emptyText}>
                        {searchQuery ? 'No se encontraron usuarios' : 'No hay usuarios registrados'}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={users}
                    renderItem={renderUser}
                    keyExtractor={(item) => item.userId}
                    contentContainerStyle={styles.list}
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
    searchContainer: {
        padding: 16,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    searchInput: {
        backgroundColor: colors.background,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: colors.text,
        borderWidth: 1,
        borderColor: colors.border,
    },
    list: {
        flexGrow: 1,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: colors.textLight,
    },
});

export default UsersListScreen;
