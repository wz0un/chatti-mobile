/**
 * Users List Screen
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    FlatList,
    TextInput,
    StyleSheet,
    ActivityIndicator,
    Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ApiService from '../services/ApiService';
import AuthService from '../services/AuthService';
import UserListItem from '../components/UserListItem';
import { useTranslation } from '../i18n';
import { useTheme } from '../theme/ThemeContext';
import { useAlert } from '../theme/AlertContext';
import { spacing, borderRadius, shadows, typography } from '../theme/colors';

const UsersListScreen = ({ navigation }) => {
    const { theme } = useTheme();
    const { alert } = useAlert();
    const [users, setUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const { t } = useTranslation();

    useEffect(() => {
        const init = async () => {
            const user = await AuthService.getCurrentUser();
            setCurrentUser(user);
            await loadUsers(user);
        };
        init();
    }, []);

    const loadUsers = async (user = currentUser) => {
        try {
            setLoading(true);
            const result = await ApiService.listUsers(null, 50);
            const filtered = result.users.filter(u => u.userId !== user?.userId);
            setUsers(filtered);
        } catch (error) {
            console.error('Error loading users:', error);
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
            const filtered = results.filter(u => u.userId !== currentUser?.userId);
            setUsers(filtered);
        } catch (error) {
            console.error('Error searching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUserPress = async (user) => {
        if (!currentUser) return;
        try {
            const fullUser = await ApiService.findUserByUsername(user.fullUsername);
            if (!fullUser || !fullUser.publicKey) {
                alert({ title: t('common.error'), message: t('usersList.errorPublicKey'), type: 'error' });
                return;
            }
            const result = await ApiService.startDirectMessage(currentUser.userId, user.userId);
            navigation.navigate('DirectMessage', {
                conversationId: result.conversationId,
                recipientId: user.userId,
                recipientUsername: user.fullUsername,
                recipientPublicKey: fullUser.publicKey,
                userId: currentUser.userId,
                username: currentUser.fullUsername,
            });
        } catch (error) {
            console.error('Error starting DM:', error);
            alert({ title: t('common.error'), message: t('contacts.errorStart'), type: 'error' });
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
            <View style={[styles.header, { backgroundColor: theme.surface }]}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>{t('usersList.title')}</Text>
            </View>

            <View style={[styles.searchContainer, { backgroundColor: theme.background }]}>
                <View style={[styles.searchWrapper, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
                    <Text style={styles.searchIcon}>🔍</Text>
                    <TextInput
                        style={[styles.searchInput, { color: theme.text }]}
                        placeholder={t('usersList.placeholder')}
                        placeholderTextColor={theme.textTertiary}
                        value={searchQuery}
                        onChangeText={handleSearch}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                </View>
            </View>

            {loading && users.length === 0 ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            ) : users.length === 0 ? (
                <View style={styles.centerContainer}>
                    <Text style={[styles.emptyIcon, { color: theme.primary + '30' }]}>👥</Text>
                    <Text style={[styles.emptyText, { color: theme.text }]}>{searchQuery ? t('usersList.emptySearch') : t('usersList.emptyAll')}</Text>
                </View>
            ) : (
                <FlatList
                    data={users}
                    renderItem={({ item }) => <UserListItem user={item} onPress={() => handleUserPress(item)} />}
                    keyExtractor={(item) => item.userId}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
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
    searchContainer: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
    },
    searchWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.md,
        height: 48,
        borderWidth: 1,
    },
    searchIcon: {
        fontSize: 16,
        marginRight: spacing.sm,
        opacity: 0.7,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
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
        textAlign: 'center',
    },
    list: {
        flexGrow: 1,
    },
});

export default UsersListScreen;
