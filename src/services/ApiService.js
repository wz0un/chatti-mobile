/**
 * API Service for Chatti
 * Handles HTTP requests to the backend
 */

const API_BASE_URL = 'https://chatti-workers.wz0un.workers.dev';

class ApiService {
    /**
     * Fetch list of available rooms
     */
    static async listRooms(cursor = null, limit = 20) {
        try {
            const params = new URLSearchParams();
            if (cursor) params.append('cursor', cursor);
            params.append('limit', limit.toString());

            const url = `${API_BASE_URL}/api/rooms?${params.toString()}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return {
                rooms: data.rooms || [],
                cursor: data.cursor,
                hasMore: data.hasMore || false,
            };
        } catch (error) {
            console.error('Error fetching rooms:', error);
            throw error;
        }
    }

    /**
     * Create a new room
     */
    static async createRoom(name, owner, isPrivate = false, password = null) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/room/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name,
                    owner,
                    isPrivate,
                    password,
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || 'Failed to create room');
            }

            return data.room;
        } catch (error) {
            console.error('Error creating room:', error);
            throw error;
        }
    }

    /**
     * Get room information
     */
    static async getRoomInfo(roomId) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/room/${roomId}/info`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching room info:', error);
            throw error;
        }
    }

    /**
     * Fetch message history for a room (paginated)
     */
    static async getMessageHistory(roomId, cursor = null, limit = 50) {
        try {
            const params = new URLSearchParams();
            if (cursor) params.append('cursor', cursor);
            params.append('limit', limit.toString());

            const url = `${API_BASE_URL}/api/room/${roomId}/messages?${params.toString()}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return {
                messages: data.messages || [],
                nextCursor: data.nextCursor,
                hasMore: data.hasMore || false,
            };
        } catch (error) {
            console.error('Error fetching message history:', error);
            throw error;
        }
    }

    /**
     * Post a message via HTTP (fallback when WebSocket is unavailable)
     */
    static async postMessage(roomId, username, content, userId = null) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/room/${roomId}/post`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username,
                    userId,
                    content,
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (!data.success) {
                throw new Error('Failed to post message');
            }

            return data.id;
        } catch (error) {
            console.error('Error posting message:', error);
            throw error;
        }
    }

    /**
     * Search users by username
     */
    static async searchUsers(query) {
        try {
            const params = new URLSearchParams({ query });
            const url = `${API_BASE_URL}/api/users/search?${params.toString()}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.users || [];
        } catch (error) {
            console.error('Error searching users:', error);
            throw error;
        }
    }

    /**
     * List all registered users
     */
    static async listUsers(cursor = null, limit = 50) {
        try {
            const params = new URLSearchParams();
            if (cursor) params.append('cursor', cursor);
            params.append('limit', limit.toString());

            const url = `${API_BASE_URL}/api/users/list?${params.toString()}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return {
                users: data.users || [],
                cursor: data.cursor,
                hasMore: data.hasMore || false,
            };
        } catch (error) {
            console.error('Error listing users:', error);
            throw error;
        }
    }

    /**
     * Find user by full username (username#discriminator)
     */
    static async findUserByUsername(fullUsername) {
        try {
            const params = new URLSearchParams({ username: fullUsername });
            const url = `${API_BASE_URL}/api/users/find?${params.toString()}`;
            const response = await fetch(url);

            if (!response.ok) {
                if (response.status === 404) {
                    return null;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.success ? data.user : null;
        } catch (error) {
            console.error('Error finding user:', error);
            throw error;
        }
    }

    /**
     * Start a new direct message conversation
     */
    static async startDirectMessage(userId, recipientId) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/dm/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId,
                    recipientId,
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || 'Failed to start conversation');
            }

            return {
                conversationId: data.conversationId,
                url: data.url
            };
        } catch (error) {
            console.error('Error starting DM:', error);
            throw error;
        }
    }

    /**
     * Get user's conversations
     */
    static async getUserConversations(userId) {
        try {
            const params = new URLSearchParams({ userId });
            const url = `${API_BASE_URL}/api/dm/conversations?${params.toString()}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.conversations || [];
        } catch (error) {
            console.error('Error getting conversations:', error);
            throw error;
        }
    }
}

export default ApiService;
