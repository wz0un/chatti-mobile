/**
 * Room List Screen - Browse and create chat rooms
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    TextInput,
    Modal,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import ApiService from '../services/ApiService';
import AuthService from '../services/AuthService';
import { useTranslation } from '../i18n';
import { useTheme } from '../theme/ThemeContext';
import { useAlert } from '../theme/AlertContext';
import { spacing, borderRadius, shadows, typography } from '../theme/colors';

const RoomListScreen = ({ navigation, route }) => {
    const { theme, isDark } = useTheme();
    const { alert } = useAlert();
    const [username, setUsername] = useState(route.params?.username || null);
    const [currentUser, setCurrentUser] = useState(null);
    const { t, locale } = useTranslation();

    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [cursor, setCursor] = useState(null);
    const [hasMore, setHasMore] = useState(false);

    // Create room modal
    const [modalVisible, setModalVisible] = useState(false);
    const [newRoomName, setNewRoomName] = useState('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        const loadUser = async () => {
            const user = await AuthService.getCurrentUser();
            if (user) {
                setCurrentUser(user);
                if (!username) setUsername(user.fullUsername);
            }
        };
        loadUser();
    }, []);

    useEffect(() => {
        loadRooms();
    }, [currentUser]);

    const loadRooms = async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true); else setLoading(true);
            const data = await ApiService.listRooms(null, 20);
            setRooms(data.rooms);
            setCursor(data.cursor);
            setHasMore(data.hasMore);
        } catch (error) {
            console.error('Error loading rooms:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const loadMoreRooms = async () => {
        if (!hasMore || loadingMore) return;
        try {
            setLoadingMore(true);
            const data = await ApiService.listRooms(cursor, 20);
            setRooms([...rooms, ...data.rooms]);
            setCursor(data.cursor);
            setHasMore(data.hasMore);
        } catch (error) {
            console.error('Error loading more rooms:', error);
        } finally {
            setLoadingMore(false);
        }
    };

    const handleCreateRoom = async () => {
        if (!newRoomName.trim()) {
            alert({ title: t('common.error'), message: t('rooms.errorName'), type: 'error' });
            return;
        }

        try {
            setCreating(true);
            const room = await ApiService.createRoom(newRoomName.trim(), username);
            setRooms([room, ...rooms]);
            setModalVisible(false);
            setNewRoomName('');
            navigation.navigate('Chat', { username, roomId: room.id, roomName: room.name });
        } catch (error) {
            console.error('Error creating room:', error);
            alert({ title: t('common.error'), message: t('rooms.errorCreate'), type: 'error' });
        } finally {
            setCreating(false);
        }
    };

    const renderRoom = ({ item }) => (
        <TouchableOpacity
            style={[styles.roomCard, { backgroundColor: theme.surface, borderLeftColor: theme.primary }]}
            onPress={() => navigation.navigate('Chat', { username, roomId: item.id, roomName: item.name })}
            activeOpacity={0.7}
        >
            <View style={styles.roomHeader}>
                <Text style={[styles.roomName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
                {item.isPrivate && (
                    <View style={[styles.privateBadge, { backgroundColor: theme.secondary }]}>
                        <Text style={styles.privateBadgeText}>{t('rooms.private')}</Text>
                    </View>
                )}
            </View>
            <View style={styles.roomFooter}>
                <Text style={[styles.roomOwner, { color: theme.textSecondary }]}>{t('rooms.createdBy', { owner: item.owner })}</Text>
                <Text style={[styles.roomDate, { color: theme.textTertiary }]}>
                    {new Date(item.createdAt).toLocaleDateString(locale, {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                </Text>
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
            <View style={[styles.header, { backgroundColor: theme.surface }]}>
                <View>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>Chat-ti</Text>
                    <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>{t('rooms.welcome', { name: username || '' })}</Text>
                </View>
                <LinearGradient
                    colors={theme.gradients.primary}
                    style={[styles.headerAvatar, shadows.sm]}
                >
                    <Text style={styles.headerAvatarText}>{username?.charAt(0).toUpperCase()}</Text>
                </LinearGradient>
            </View>

            <FlatList
                data={rooms}
                renderItem={renderRoom}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={() => (
                    <View style={styles.emptyContainer}>
                        <Text style={[styles.emptyIcon, { color: theme.primary + '30' }]}>🏠</Text>
                        <Text style={[styles.emptyText, { color: theme.text }]}>{t('rooms.empty')}</Text>
                        <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>{t('rooms.createFirst')}</Text>
                    </View>
                )}
                ListFooterComponent={() => loadingMore ? <ActivityIndicator size="small" color={theme.primary} style={{ margin: 20 }} /> : null}
                onEndReached={loadMoreRooms}
                onEndReachedThreshold={0.5}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => loadRooms(true)}
                        colors={[theme.primary]}
                        tintColor={theme.primary}
                    />
                }
            />

            <TouchableOpacity
                style={styles.fabWrapper}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.9}
            >
                <LinearGradient
                    colors={theme.gradients.primary}
                    style={[styles.fab, shadows.lg]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <Text style={styles.fabIcon}>+</Text>
                </LinearGradient>
            </TouchableOpacity>

            <Modal animationType="fade" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
                <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
                    <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>{t('rooms.createTitle')}</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: theme.surfaceSecondary, color: theme.text, borderColor: theme.border }]}
                            placeholder={t('rooms.roomNamePlaceholder')}
                            placeholderTextColor={theme.textTertiary}
                            value={newRoomName}
                            onChangeText={setNewRoomName}
                            autoFocus
                            maxLength={50}
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={[styles.modalButton, { backgroundColor: theme.surfaceSecondary }]} onPress={() => { setModalVisible(false); setNewRoomName(''); }}>
                                <Text style={[styles.cancelButtonText, { color: theme.text }]}>{t('common.cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalButton, { backgroundColor: theme.primary }]} onPress={handleCreateRoom} disabled={creating || !newRoomName.trim()}>
                                {creating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.confirmButtonText}>{t('common.create')}</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing.lg,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: '900',
        letterSpacing: -1,
    },
    headerSubtitle: {
        fontSize: 14,
        fontWeight: '500',
    },
    headerAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerAvatarText: {
        fontSize: 20,
        fontWeight: '900',
        color: '#FFFFFF',
    },
    listContent: {
        padding: spacing.lg,
        paddingBottom: 120,
    },
    roomCard: {
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.md,
        borderLeftWidth: 4,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    roomHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    roomName: {
        fontSize: 18,
        fontWeight: '700',
        flex: 1,
    },
    privateBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
    },
    privateBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#FFFFFF',
        textTransform: 'uppercase',
    },
    roomFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    roomOwner: {
        fontSize: 12,
        fontWeight: '500',
    },
    roomDate: {
        fontSize: 11,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
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
    fabWrapper: {
        position: 'absolute',
        bottom: 90,
        right: 24,
    },
    fab: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fabIcon: {
        color: '#FFFFFF',
        fontSize: 36,
        fontWeight: '300',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    modalContent: {
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        width: '100%',
        elevation: 20,
    },
    modalTitle: {
        ...typography.h3,
        fontWeight: '800',
        marginBottom: spacing.lg,
    },
    input: {
        height: 56,
        borderWidth: 1.5,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.lg,
        fontSize: 16,
        marginBottom: spacing.xl,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    modalButton: {
        flex: 1,
        height: 50,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButtonText: {
        fontWeight: '700',
    },
    confirmButtonText: {
        color: '#FFFFFF',
        fontWeight: '800',
    },
});

export default RoomListScreen;
