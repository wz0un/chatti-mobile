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
    RefreshControl,
    TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import ApiService from '../services/ApiService';
import AuthService from '../services/AuthService';
import UserListItem from '../components/UserListItem';
import { useTranslation } from '../i18n';
import { useTheme } from '../theme/ThemeContext';
import { useAlert } from '../theme/AlertContext';
import { spacing, borderRadius, shadows, typography } from '../theme/colors';

const ContactsScreen = ({ navigation }) => {
    const { theme, isDark } = useTheme();
    const { alert } = useAlert();
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [pendingCount, setPendingCount] = useState(0);
    const { t } = useTranslation();

    useEffect(() => {
        loadCurrentUser();
    }, []);

    useEffect(() => {
        if (currentUser) {
            loadContacts();
            loadPendingCount();
        }
    }, [currentUser]);

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
            setContacts(result || []);
        } catch (error) {
            console.error('Error loading contacts:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const loadPendingCount = async () => {
        if (!currentUser) return;
        try {
            const requests = await ApiService.getContactRequests(currentUser.userId);
            setPendingCount(requests?.length || 0);
        } catch (error) {
            console.error('Error loading pending count:', error);
        }
    };

    const handleContactPress = async (contact) => {
        if (!currentUser) {
            alert({ title: t('common.error'), message: t('contacts.errorCurrent'), type: 'error' });
            return;
        }

        try {
            const fullUser = await ApiService.findUserByUsername(contact.fullUsername);
            if (!fullUser || !fullUser.publicKey) {
                alert({ title: t('common.error'), message: t('contacts.errorStart'), type: 'error' });
                return;
            }

            navigation.navigate('DirectMessage', {
                conversationId: contact.conversationId,
                recipientId: contact.userId,
                recipientUsername: contact.fullUsername,
                recipientPublicKey: fullUser.publicKey,
                userId: currentUser.userId,
                username: currentUser.fullUsername,
            });
        } catch (error) {
            console.error('Error starting conversation:', error);
            alert({ title: t('common.error'), message: t('contacts.errorStart'), type: 'error' });
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
            <View style={[styles.header, { backgroundColor: theme.surface }]}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>{t('contacts.title')}</Text>
                <View style={styles.headerButtons}>
                    <TouchableOpacity
                        style={[styles.headerButton, { backgroundColor: theme.primary + '15' }]}
                        onPress={() => navigation.navigate('ContactRequests')}
                    >
                        <Text style={styles.headerButtonIcon}>📬</Text>
                        {pendingCount > 0 && (
                            <View style={[styles.badge, { backgroundColor: theme.error }]}>
                                <Text style={styles.badgeText}>{pendingCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => navigation.navigate('AddContact')}>
                        <LinearGradient
                            colors={theme.gradients.primary}
                            style={styles.addButton}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <Text style={styles.addButtonText}>+</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>

            {loading && contacts.length === 0 ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            ) : contacts.length === 0 ? (
                <View style={styles.centerContainer}>
                    <Text style={[styles.emptyIcon, { color: theme.primary + '30' }]}>👥</Text>
                    <Text style={[styles.emptyText, { color: theme.text }]}>{t('contacts.emptyTitle')}</Text>
                    <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>{t('contacts.emptySubtitle')}</Text>
                    <TouchableOpacity
                        style={styles.emptyButtonWrapper}
                        onPress={() => navigation.navigate('AddContact')}
                    >
                        <LinearGradient
                            colors={theme.gradients.primary}
                            style={styles.emptyButton}
                        >
                            <Text style={styles.emptyButtonText}>+ {t('contacts.addContact')}</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={contacts}
                    renderItem={({ item }) => <UserListItem user={item} onPress={() => handleContactPress(item)} />}
                    keyExtractor={(item) => item.userId}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => { setRefreshing(true); loadContacts(); loadPendingCount(); }}
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        ...typography.h2,
        fontWeight: '900',
    },
    headerButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    headerButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    headerButtonIcon: {
        fontSize: 20,
    },
    addButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadows.sm,
    },
    addButtonText: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: '700',
    },
    badge: {
        position: 'absolute',
        top: -2,
        right: -2,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 10,
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
        marginBottom: spacing.xl,
    },
    emptyButtonWrapper: {
        borderRadius: borderRadius.md,
        overflow: 'hidden',
        ...shadows.md,
    },
    emptyButton: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        alignItems: 'center',
    },
    emptyButtonText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 16,
    },
    list: {
        paddingBottom: 100,
    },
});

export default ContactsScreen;
