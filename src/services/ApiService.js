/**
 * API Service for Chatti
 * Handles HTTP requests to the backend
 */

// Configuration - Set to false for local development
const isProduction = true; // Change to false to test with local backend
const API_BASE_URL = isProduction
    ? 'https://chatti-workers.wz0un.workers.dev'
    : 'http://192.168.1.100:8788'; // Changed port to 8788 to match new worker config

class ApiService {
    /**
     * Robustly parse JSON from response and handle errors
     */
    static async parseJsonResponse(response) {
        const text = await response.text();
        try {
            if (!text || text.trim() === '') {
                if (response.ok) return { success: true };
                throw new Error(`Empty response from server (Status: ${response.status})`);
            }

            const data = JSON.parse(text);

            if (!response.ok) {
                throw new Error(data.error || data.message || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('JSON Parse error:', error, 'Full response:', text);
            if (error instanceof SyntaxError) {
                throw new Error(`Invalid JSON from server: ${text.substring(0, 100)}... (Status: ${response.status})`);
            }
            throw error;
        }
    }
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

            const data = await this.parseJsonResponse(response);
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

            const data = await this.parseJsonResponse(response);
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

            return await this.parseJsonResponse(response);
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

            const data = await this.parseJsonResponse(response);
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

            const data = await this.parseJsonResponse(response);
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

            const data = await this.parseJsonResponse(response);
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

            const data = await this.parseJsonResponse(response);
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

            const data = await this.parseJsonResponse(response);
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

            const data = await this.parseJsonResponse(response);
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

            const data = await this.parseJsonResponse(response);
            return data.conversations || [];
        } catch (error) {
            console.error('Error getting conversations:', error);
            throw error;
        }
    }

    /**
     * Delete conversation
     */
    static async deleteConversation(userId, conversationId) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/dm/delete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId,
                    conversationId,
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await this.parseJsonResponse(response);
            return data.success;
        } catch (error) {
            console.error('Error deleting conversation:', error);
            throw error;
        }
    }

    /**
     * Get user by device ID
     */
    static async getUserByDeviceId(deviceId) {
        try {
            const params = new URLSearchParams({ deviceId });
            const url = `${API_BASE_URL}/api/users/by-device-id?${params.toString()}`;
            const response = await fetch(url);

            if (!response.ok) {
                if (response.status === 404) {
                    return null;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await this.parseJsonResponse(response);
            return data.success ? data.user : null;
        } catch (error) {
            console.error('Error getting user by device ID:', error);
            throw error;
        }
    }

    /**
     * Send contact request
     */
    static async sendContactRequest(senderId, recipientDeviceId, senderUsername) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/contacts/request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    senderId,
                    recipientDeviceId,
                    senderUsername,
                }),
            });

            if (!response.ok) {
                const data = await this.parseJsonResponse(response);
                throw new Error(data.error || 'Failed to send contact request');
            }

            const data = await this.parseJsonResponse(response);
            return data;
        } catch (error) {
            console.error('Error sending contact request:', error);
            throw error;
        }
    }

    /**
     * Get contact requests
     */
    static async getContactRequests(userId) {
        try {
            const params = new URLSearchParams({ userId });
            const url = `${API_BASE_URL}/api/contacts/requests?${params.toString()}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await this.parseJsonResponse(response);
            return data.requests || [];
        } catch (error) {
            console.error('Error getting contact requests:', error);
            throw error;
        }
    }

    /**
     * Accept contact request
     */
    static async acceptContactRequest(requestId, userId) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/contacts/accept`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    requestId,
                    userId,
                }),
            });

            if (!response.ok) {
                const data = await this.parseJsonResponse(response);
                throw new Error(data.error || 'Failed to accept contact request');
            }

            const data = await this.parseJsonResponse(response);
            return data;
        } catch (error) {
            console.error('Error accepting contact request:', error);
            throw error;
        }
    }

    /**
     * Reject contact request
     */
    static async rejectContactRequest(requestId, userId) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/contacts/reject`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    requestId,
                    userId,
                }),
            });

            if (!response.ok) {
                const data = await this.parseJsonResponse(response);
                throw new Error(data.error || 'Failed to reject contact request');
            }

            const data = await this.parseJsonResponse(response);
            return data;
        } catch (error) {
            console.error('Error rejecting contact request:', error);
            throw error;
        }
    }

    /**
     * Get contacts list
     */
    static async getContactsList(userId) {
        try {
            const params = new URLSearchParams({ userId });
            const url = `${API_BASE_URL}/api/contacts/list?${params.toString()}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await this.parseJsonResponse(response);
            return data.contacts || [];
        } catch (error) {
            console.error('Error getting contacts list:', error);
            throw error;
        }
    }
    /**
     * Delete user account
     */
    static async deleteAccount(userId, deviceId) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/delete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId,
                    deviceId,
                }),
            });

            if (!response.ok) {
                const data = await this.parseJsonResponse(response);
                throw new Error(data.error || 'Failed to delete account');
            }

            const data = await this.parseJsonResponse(response);
            return data.success;
        } catch (error) {
            console.error('Error deleting account:', error);
            throw error;
        }
    }
}

export default ApiService;
