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
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import ApiService from '../services/ApiService';
import AuthService from '../services/AuthService';
import colors from '../theme/colors';
import { useTranslation } from '../i18n';

const RoomListScreen = ({ navigation, route }) => {
    const [username, setUsername] = useState(route.params?.username || null);
    const [currentUser, setCurrentUser] = useState(null);
    const { t, locale } = useTranslation();

    useEffect(() => {
        if (!username) {
            AuthService.getCurrentUser().then(user => {
                if (user) {
                    setUsername(user.fullUsername);
                    setCurrentUser(user);
                }
            });
        } else {
            AuthService.getCurrentUser().then(user => {
                setCurrentUser(user);
            });
        }
    }, []);

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
        loadRooms();
    }, [currentUser]);

    const loadRooms = async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            const data = await ApiService.listRooms(null, 20);
            setRooms(data.rooms);
            setCursor(data.cursor);
            setHasMore(data.hasMore);
        } catch (error) {
            console.error('Error loading rooms:', error);
            Alert.alert(t('common.error'), t('rooms.errorLoad'));
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
            Alert.alert(t('common.error'), t('rooms.errorName'));
            return;
        }

        try {
            setCreating(true);
            const room = await ApiService.createRoom(newRoomName.trim(), username);

            // Add new room to the list
            setRooms([room, ...rooms]);

            // Close modal and reset
            setModalVisible(false);
            setNewRoomName('');

            navigation.navigate('Chat', {
                username,
                roomId: room.id,
                roomName: room.name,
            });
        } catch (error) {
            console.error('Error creating room:', error);
            Alert.alert(t('common.error'), t('rooms.errorCreate'));
        } finally {
            setCreating(false);
        }
    };

    const handleJoinRoom = (room) => {
        navigation.navigate('Chat', {
            username,
            roomId: room.id,
            roomName: room.name,
        });
    };

    const renderRoom = ({ item }) => (
        <TouchableOpacity
            style={styles.roomCard}
            onPress={() => handleJoinRoom(item)}
            activeOpacity={0.7}
        >
            <View style={styles.roomHeader}>
                <Text style={styles.roomName}>{item.name}</Text>
                {item.isPrivate && (
                    <View style={styles.privateBadge}>
                        <Text style={styles.privateBadgeText}>{t('rooms.private')}</Text>
                    </View>
                )}
            </View>
            <View style={styles.roomFooter}>
                <Text style={styles.roomOwner}>{t('rooms.createdBy', { owner: item.owner })}</Text>
                <Text style={styles.roomDate}>
                    {new Date(item.createdAt).toLocaleDateString(locale, {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                    })}
                </Text>
            </View>
        </TouchableOpacity>
    );

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('rooms.empty')}</Text>
            <Text style={styles.emptySubtext}>{t('rooms.createFirst')}</Text>
        </View>
    );

    const renderFooter = () => {
        if (!loadingMore) return null;
        return (
            <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.primary} />
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>{t('rooms.loading')}</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <LinearGradient
                colors={colors.primaryGradient}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.headerContent}>
                    <View>
                        <Text style={styles.headerTitle}>Chat-ti</Text>
                        <Text style={styles.headerSubtitle}>{t('rooms.welcome', { name: username || '' })}</Text>
                    </View>
                    <View style={styles.headerAvatar}>
                        <Text style={styles.headerAvatarText}>{username?.charAt(0).toUpperCase()}</Text>
                    </View>
                </View>
            </LinearGradient>

            <FlatList
                data={rooms}
                renderItem={renderRoom}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={renderEmpty}
                ListFooterComponent={renderFooter}
                onEndReached={loadMoreRooms}
                onEndReachedThreshold={0.5}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => loadRooms(true)}
                        colors={[colors.primary]}
                    />
                }
            />

            <TouchableOpacity
                style={styles.fabWrapper}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.9}
            >
                <LinearGradient
                    colors={colors.primaryGradient}
                    style={styles.fab}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <Text style={styles.fabIcon}>+</Text>
                </LinearGradient>
            </TouchableOpacity>

            {/* Create Room Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{t('rooms.createTitle')}</Text>

                        <TextInput
                            style={styles.input}
                            placeholder={t('rooms.roomNamePlaceholder')}
                            placeholderTextColor={colors.textLight}
                            value={newRoomName}
                            onChangeText={setNewRoomName}
                            autoFocus
                            maxLength={50}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => {
                                    setModalVisible(false);
                                    setNewRoomName('');
                                }}
                                disabled={creating}
                            >
                                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalButton, styles.confirmButton]}
                                onPress={handleCreateRoom}
                                disabled={creating || !newRoomName.trim()}
                            >
                                {creating ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.confirmButtonText}>{t('common.create')}</Text>
                                )}
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
        backgroundColor: colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: colors.textSecondary,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 20,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
    },
    headerAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    headerAvatarText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    listContent: {
        padding: 16,
        paddingBottom: 100, // Adjusted padding for FAB
    },
    roomCard: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: 'rgba(255, 107, 53, 0.3)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 4,
    },
    roomHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    roomName: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        flex: 1,
    },
    privateBadge: {
        backgroundColor: colors.secondary,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    privateBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#fff',
    },
    roomFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    roomOwner: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    roomDate: {
        fontSize: 12,
        color: colors.textTertiary,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: colors.textTertiary,
    },
    footerLoader: {
        paddingVertical: 20,
        alignItems: 'center',
    },
    // FAB (Floating Action Button)
    fabWrapper: {
        position: 'absolute',
        bottom: 90,
        right: 20,
    },
    fab: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: 'rgba(255, 107, 53, 0.5)',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 12,
    },
    fabIcon: {
        color: '#fff',
        fontSize: 32,
        fontWeight: '300',
        marginTop: -2,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: colors.surface,
        borderRadius: 20,
        padding: 24,
        width: '85%',
        maxWidth: 400,
        shadowColor: 'rgba(255, 107, 53, 0.5)',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 12,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 20,
    },
    input: {
        backgroundColor: colors.inputBackground,
        borderWidth: 1,
        borderColor: colors.inputBorder,
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        color: colors.text,
        marginBottom: 20,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: colors.backgroundTertiary,
    },
    confirmButton: {
        backgroundColor: colors.primary,
    },
    cancelButtonText: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '600',
    },
    confirmButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});

export default RoomListScreen;
