/**
 * Room List Screen - Browse and create chat rooms
 */

import React, { useState, useEffect, useCallback } from 'react';
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
import ApiService from '../services/ApiService';
import colors from '../theme/colors';

const RoomListScreen = ({ navigation, route }) => {
    const { username } = route.params;

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
    }, []);

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
            Alert.alert('Error', 'No se pudieron cargar las salas');
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
            Alert.alert('Error', 'Por favor ingresa un nombre para la sala');
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

            // Navigate to the new room
            navigation.navigate('Chat', {
                username,
                roomId: room.id,
            });
        } catch (error) {
            console.error('Error creating room:', error);
            Alert.alert('Error', 'No se pudo crear la sala');
        } finally {
            setCreating(false);
        }
    };

    const handleJoinRoom = (roomId) => {
        navigation.navigate('Chat', {
            username,
            roomId,
        });
    };

    const renderRoom = ({ item }) => (
        <TouchableOpacity
            style={styles.roomCard}
            onPress={() => handleJoinRoom(item.id)}
            activeOpacity={0.7}
        >
            <View style={styles.roomHeader}>
                <Text style={styles.roomName}>{item.name}</Text>
                {item.isPrivate && (
                    <View style={styles.privateBadge}>
                        <Text style={styles.privateBadgeText}>🔒 Privada</Text>
                    </View>
                )}
            </View>
            <View style={styles.roomFooter}>
                <Text style={styles.roomOwner}>Creada por: {item.owner}</Text>
                <Text style={styles.roomDate}>
                    {new Date(item.createdAt).toLocaleDateString('es-ES', {
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
            <Text style={styles.emptyText}>No hay salas disponibles</Text>
            <Text style={styles.emptySubtext}>¡Crea la primera sala!</Text>
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
                <Text style={styles.loadingText}>Cargando salas...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Salas de Chat</Text>
                <Text style={styles.headerSubtitle}>Hola, {username}</Text>
            </View>

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
                style={styles.createButton}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.8}
            >
                <Text style={styles.createButtonText}>+ Crear Sala</Text>
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
                        <Text style={styles.modalTitle}>Crear Nueva Sala</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Nombre de la sala"
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
                                <Text style={styles.cancelButtonText}>Cancelar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalButton, styles.confirmButton]}
                                onPress={handleCreateRoom}
                                disabled={creating || !newRoomName.trim()}
                            >
                                {creating ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.confirmButtonText}>Crear</Text>
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
        color: colors.textLight,
    },
    header: {
        padding: 20,
        backgroundColor: colors.primary,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    headerSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 4,
    },
    listContent: {
        padding: 16,
    },
    roomCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
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
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    privateBadgeText: {
        fontSize: 12,
        color: '#fff',
    },
    roomFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    roomOwner: {
        fontSize: 14,
        color: colors.textLight,
    },
    roomDate: {
        fontSize: 12,
        color: colors.textLight,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 18,
        color: colors.textLight,
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: colors.textLight,
    },
    footerLoader: {
        paddingVertical: 20,
        alignItems: 'center',
    },
    createButton: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        backgroundColor: colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderRadius: 30,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    createButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        width: '85%',
        maxWidth: 400,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 20,
    },
    input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: colors.text,
        marginBottom: 20,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: colors.border,
        marginRight: 8,
    },
    confirmButton: {
        backgroundColor: colors.primary,
        marginLeft: 8,
    },
    cancelButtonText: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '600',
    },
    confirmButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default RoomListScreen;
