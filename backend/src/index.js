import { ChatRoom } from './ChatRoom.js';
import { DirectMessage } from './DirectMessage.js';
import bcrypt from 'bcryptjs';
import {
    webPushKey,
    listWebPushSubscriptions,
    deleteWebPushSubscriptions,
} from './WebPush.js';

/**
 * Worker principal de Chatti
 * Maneja routing, creación de salas, registro global en KV y mensajería privada
 */

export { ChatRoom, DirectMessage };

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // CORS headers
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, Upgrade',
        };

        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        try {
            // Health check
            if (url.pathname === '/health') {
                return new Response(JSON.stringify({
                    status: 'ok',
                    timestamp: Date.now(),
                    version: '2.2.0'
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // User registration/login
            if (url.pathname === '/api/auth/register' && request.method === 'POST') {
                return this.registerUser(request, env, corsHeaders);
            }

            // User login
            if (url.pathname === '/api/auth/login' && request.method === 'POST') {
                return this.loginUser(request, env, corsHeaders);
            }

            // Delete user account
            if (url.pathname === '/api/auth/delete' && request.method === 'POST') {
                return this.deleteUser(request, env, corsHeaders);
            }

            // Register/remove a browser Web Push subscription (Task 22)
            if (url.pathname === '/api/auth/webpush' && request.method === 'POST') {
                return this.handleWebPushSubscription(request, env, corsHeaders);
            }

            // Update the Expo push token of an existing user (mobile contract)
            if (url.pathname === '/api/auth/update-push-token' && request.method === 'POST') {
                return this.handleUpdatePushToken(request, env, corsHeaders);
            }

            // User search
            if (url.pathname === '/api/users/search' && request.method === 'GET') {
                return this.searchUsers(request, env, corsHeaders);
            }

            // List all users
            if (url.pathname === '/api/users/list' && request.method === 'GET') {
                return this.listUsers(request, env, corsHeaders);
            }

            // Get user by full username (username#discriminator)
            if (url.pathname === '/api/users/find' && request.method === 'GET') {
                return this.findUserByUsername(request, env, corsHeaders);
            }

            // Get user by device ID
            if (url.pathname === '/api/users/by-device-id' && request.method === 'GET') {
                return this.getUserByDeviceId(request, env, corsHeaders);
            }

            // Get user public key by user ID
            if (url.pathname === '/api/users/public-key' && request.method === 'GET') {
                return this.getUserPublicKey(request, env, corsHeaders);
            }

            // Contact management endpoints
            if (url.pathname === '/api/contacts/request' && request.method === 'POST') {
                return this.sendContactRequest(request, env, corsHeaders);
            }

            if (url.pathname === '/api/contacts/requests' && request.method === 'GET') {
                return this.getContactRequests(request, env, corsHeaders);
            }

            if (url.pathname === '/api/contacts/accept' && request.method === 'POST') {
                return this.acceptContactRequest(request, env, corsHeaders);
            }

            if (url.pathname === '/api/contacts/reject' && request.method === 'POST') {
                return this.rejectContactRequest(request, env, corsHeaders);
            }

            if (url.pathname === '/api/contacts/list' && request.method === 'GET') {
                return this.getContactsList(request, env, corsHeaders);
            }

            // Start new direct message conversation
            if (url.pathname === '/api/dm/start' && request.method === 'POST') {
                return this.startDirectMessage(request, env, corsHeaders);
            }

            // Delete conversation for user
            if (url.pathname === '/api/dm/delete' && request.method === 'POST') {
                return this.deleteConversation(request, env, corsHeaders);
            }

            // Get user's conversations list
            if (url.pathname === '/api/dm/conversations' && request.method === 'GET') {
                return this.getUserConversations(request, env, corsHeaders);
            }

            // Connect to direct message conversation (WebSocket or HTTP)
            if (url.pathname.startsWith('/api/dm/')) {
                const parts = url.pathname.split('/');
                if (parts.length >= 4 && parts[3] !== 'start' && parts[3] !== 'conversations') {
                    const conversationId = parts[3];
                    return this.joinDirectMessage(request, env, conversationId, corsHeaders);
                }
            }

            // Test Push Notification Endpoint (Optional, for debugging)
            if (url.pathname === '/api/test/push' && request.method === 'POST') {
                return this.testPushNotification(request, env, corsHeaders);
            }

            // Listar todas las salas (paginado)
            if (url.pathname === '/api/rooms' && request.method === 'GET') {
                return this.listRooms(request, env, corsHeaders);
            }

            // Crear nueva sala
            if (url.pathname === '/api/room/create' && request.method === 'POST') {
                return this.createRoom(request, env, corsHeaders);
            }

            // Unirse a una sala existente o acceder a sus endpoints
            if (url.pathname.startsWith('/api/room/')) {
                const parts = url.pathname.split('/');
                const roomId = parts[3];

                if (!roomId) {
                    return new Response(JSON.stringify({
                        error: 'Room ID is required'
                    }), {
                        status: 400,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    });
                }

                // Delegar al Durable Object correspondiente
                return this.joinRoom(request, env, roomId, corsHeaders);
            }

            // Default response con documentación de API
            return new Response(JSON.stringify({
                app: 'Chatti',
                version: '2.1.0',
                description: 'Real-time chat with persistent storage',
                endpoints: {
                    health: 'GET /health',
                    listRooms: 'GET /api/rooms?cursor={cursor}',
                    createRoom: 'POST /api/room/create',
                    joinRoom: 'WS /api/room/:roomId',
                    roomInfo: 'GET /api/room/:roomId/info',
                    roomMessages: 'GET /api/room/:roomId/messages?cursor={timestamp}&limit={limit}',
                    postMessage: 'POST /api/room/:roomId/post'
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } catch (error) {
            console.error('Worker error:', error);
            return new Response(JSON.stringify({
                error: 'Internal server error',
                message: error.message
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    },

    /**
     * Crear una nueva sala de chat
     */
    async createRoom(request, env, corsHeaders) {
        try {
            const body = await request.json();
            const { name, isPrivate, password, owner } = body;

            // Generar ID único para la sala
            const roomId = this.generateRoomId();

            // Metadatos de la sala
            const roomMetadata = {
                id: roomId,
                name: name || `Sala ${roomId}`,
                isPrivate: isPrivate || false,
                hasPassword: !!password,
                owner: owner || 'anonymous',
                createdAt: Date.now(),
                url: `/room/${roomId}`
            };

            // Guardar en KV con key que permite ordenación por fecha
            // Formato: room:timestamp:id
            const kvKey = `room:${Date.now()}:${roomId}`;
            await env.ROOMS_KV.put(kvKey, JSON.stringify(roomMetadata), {
                metadata: {
                    roomId: roomId,
                    createdAt: roomMetadata.createdAt
                }
            });

            console.log(`Room created: ${roomId}`);

            return new Response(JSON.stringify({
                success: true,
                room: roomMetadata
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } catch (error) {
            console.error('Error creating room:', error);
            return new Response(JSON.stringify({
                success: false,
                error: error.message
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    },

    /**
     * Listar salas disponibles (con paginación)
     */
    async listRooms(request, env, corsHeaders) {
        try {
            const url = new URL(request.url);
            const cursor = url.searchParams.get('cursor');
            const limit = parseInt(url.searchParams.get('limit') || '20');

            // Listar keys con prefijo "room:"
            const listOptions = {
                prefix: 'room:',
                limit: Math.min(limit, 100), // Max 100 por seguridad
                cursor: cursor || undefined
            };

            const list = await env.ROOMS_KV.list(listOptions);

            // Obtener metadatos de cada sala
            const roomPromises = list.keys.map(async (key) => {
                try {
                    const data = await env.ROOMS_KV.get(key.name);
                    return data ? JSON.parse(data) : null;
                } catch (error) {
                    console.error(`Error reading room ${key.name}:`, error);
                    return null;
                }
            });

            const rooms = (await Promise.all(roomPromises))
                .filter(room => room !== null)
                .sort((a, b) => b.createdAt - a.createdAt); // Más recientes primero

            return new Response(JSON.stringify({
                rooms,
                cursor: list.cursor,
                hasMore: !list.list_complete,
                total: rooms.length
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } catch (error) {
            console.error('Error listing rooms:', error);
            return new Response(JSON.stringify({
                error: 'Failed to list rooms',
                message: error.message
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    },

    /**
     * Unirse a una sala (WebSocket o HTTP)
     */
    async joinRoom(request, env, roomId, corsHeaders) {
        // Validar roomId
        if (!roomId || roomId.length < 6) {
            return new Response(JSON.stringify({
                error: 'Invalid room ID'
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        try {
            // Obtener o crear Durable Object para esta sala
            const id = env.CHAT_ROOMS.idFromName(roomId);
            const room = env.CHAT_ROOMS.get(id);

            // Pasar la petición al Durable Object
            return room.fetch(request);
        } catch (error) {
            console.error('Error joining room:', error);
            return new Response(JSON.stringify({
                error: 'Failed to join room',
                message: error.message
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    },

    /**
     * Register new user with username and password
     * Assigns discriminator like Discord (username#1234)
     */
    async registerUser(request, env, corsHeaders) {
        try {
            const body = await request.json();
            const { username, password, deviceId, expoPushToken, publicKey } = body;

            if (!username || !password) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Username and password are required'
                }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            if (password.length < 6) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Password must be at least 6 characters'
                }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // Generate discriminator
            const discriminator = await this.generateDiscriminator(username, env);
            const fullUsername = `${username}#${discriminator}`;

            // Hash password
            const passwordHash = await bcrypt.hash(password, 10);

            const user = {
                username,
                discriminator,
                fullUsername,
                passwordHash,
                deviceId: deviceId || this.generateDeviceId(),
                userId: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                createdAt: Date.now(),
                expoPushToken: expoPushToken || null,
                publicKey: publicKey || null
            };

            // Save user data
            // Key by username:discriminator for login lookup
            await env.ROOMS_KV.put(
                `user:username:${username}:${discriminator}`,
                JSON.stringify(user)
            );

            // Index by userId for easier lookup for notifications and DMs
            await env.ROOMS_KV.put(
                `user:id:${user.userId}`,
                JSON.stringify(user)
            );

            // Also index by deviceId if provided (for backward compatibility)
            if (deviceId) {
                await env.ROOMS_KV.put(`user:device:${deviceId}`, JSON.stringify(user));
            }

            console.log(`User registered: ${user.fullUsername}`);

            // Return user without password hash
            const { passwordHash: _, ...userWithoutPassword } = user;

            return new Response(JSON.stringify({
                success: true,
                user: userWithoutPassword,
                isNewUser: true
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } catch (error) {
            console.error('Error registering user:', error);
            return new Response(JSON.stringify({
                success: false,
                error: error.message
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    },

    /**
     * Login user with username#discriminator and password
     */
    async loginUser(request, env, corsHeaders) {
        try {
            const body = await request.json();
            const { fullUsername, password, expoPushToken, publicKey } = body;

            if (!fullUsername || !password) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Full username and password are required'
                }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            if (!fullUsername.includes('#')) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Invalid username format. Expected username#discriminator'
                }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            const [username, discriminator] = fullUsername.split('#');
            const key = `user:username:${username}:${discriminator}`;

            const userData = await env.ROOMS_KV.get(key);

            if (!userData) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Invalid username or password'
                }), {
                    status: 401,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            const user = JSON.parse(userData);

            // Verify password
            const isValidPassword = await bcrypt.compare(password, user.passwordHash);

            if (!isValidPassword) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Invalid username or password'
                }), {
                    status: 401,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // Update push token and public key if provided
            let needsUpdate = false;

            if (expoPushToken && user.expoPushToken !== expoPushToken) {
                user.expoPushToken = expoPushToken;
                needsUpdate = true;
            }

            if (publicKey && user.publicKey !== publicKey) {
                user.publicKey = publicKey;
                needsUpdate = true;
            }

            if (needsUpdate) {
                await env.ROOMS_KV.put(key, JSON.stringify(user));
                await env.ROOMS_KV.put(`user:id:${user.userId}`, JSON.stringify(user));
            }

            console.log(`User logged in: ${user.fullUsername}`);

            // Return user without password hash
            const { passwordHash: _, ...userWithoutPassword } = user;

            return new Response(JSON.stringify({
                success: true,
                user: userWithoutPassword
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } catch (error) {
            console.error('Error logging in user:', error);
            return new Response(JSON.stringify({
                success: false,
                error: error.message
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    },

    /**
     * Delete user account and all associated data (conversations)
     */
    async deleteUser(request, env, corsHeaders) {
        try {
            const body = await request.json();
            const { userId, deviceId } = body;

            if (!userId) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'userId is required'
                }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            console.log(`Deleting user account: ${userId}`);

            // 1. Get user data to clean up indices
            const userDataString = await env.ROOMS_KV.get(`user:id:${userId}`);

            // 2. Delete all conversations involving this user
            // We need to delete references for BOTH participants to truly "delete messages" access
            const listOptions = {
                prefix: `dm:conversation:${userId}:`,
                limit: 100 // Process in batches if needed, simpler for now
            };

            let list = await env.ROOMS_KV.list(listOptions);

            // Iterate and delete
            const conversationcleanupPromises = list.keys.map(async (key) => {
                const convDataString = await env.ROOMS_KV.get(key.name);
                if (convDataString) {
                    const conv = JSON.parse(convDataString);
                    const conversationId = conv.conversationId;

                    // Delete for me
                    await env.ROOMS_KV.delete(`dm:conversation:${userId}:${conversationId}`);

                    // Delete for other participants
                    const otherParticipants = conv.participants.filter(p => p !== userId);
                    for (const otherId of otherParticipants) {
                        await env.ROOMS_KV.delete(`dm:conversation:${otherId}:${conversationId}`);
                    }
                }
            });

            await Promise.all(conversationcleanupPromises);

            // 3. Delete User Indices
            // Delete device mapping
            if (deviceId) {
                await env.ROOMS_KV.delete(`user:device:${deviceId}`);
            } else if (userDataString) {
                // Try to find deviceId from user data if not provided
                const u = JSON.parse(userDataString);
                if (u.deviceId) {
                    await env.ROOMS_KV.delete(`user:device:${u.deviceId}`);
                }
            }

            // Delete username index and ID index
            if (userDataString) {
                const u = JSON.parse(userDataString);
                await env.ROOMS_KV.delete(`user:username:${u.username}:${u.discriminator}`);
            }

            // 4. Delete web push subscriptions (browsers) for this user
            await deleteWebPushSubscriptions(env, userId);

            await env.ROOMS_KV.delete(`user:id:${userId}`);

            return new Response(JSON.stringify({
                success: true,
                message: 'Account deleted successfully'
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } catch (error) {
            console.error('Error deleting user:', error);
            return new Response(JSON.stringify({
                success: false,
                error: error.message
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    },

    /**
     * Register or remove a browser Web Push subscription (Task 22).
     * Body: { userId, deviceId, action: 'register'|'remove', subscription? }
     * subscription: { endpoint, expirationTime?, keys: { p256dh, auth } }
     * Almacenado en KV como `user:<userId>:webpush:<deviceId>` (ver WebPush.js).
     */
    async handleWebPushSubscription(request, env, corsHeaders) {
        try {
            const body = await request.json();
            const { userId, deviceId, action, subscription } = body || {};

            if (!userId || typeof userId !== 'string' || !deviceId || typeof deviceId !== 'string') {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'userId y deviceId son obligatorios'
                }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            if (!['register', 'remove'].includes(action)) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'action debe ser "register" o "remove"'
                }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            const key = webPushKey(userId, deviceId);

            if (action === 'remove') {
                await env.ROOMS_KV.delete(key);
                return new Response(JSON.stringify({ success: true }), {
                    status: 200,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            if (!subscription || typeof subscription !== 'object' || typeof subscription.endpoint !== 'string') {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'subscription inválida: se espera { endpoint, keys: { p256dh, auth } }'
                }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            if (!/^https:\/\/.+/.test(subscription.endpoint)) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'endpoint debe ser una URL https:// válida'
                }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            const { keys } = subscription;
            if (!keys || typeof keys !== 'object' || !keys.p256dh || !keys.auth) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'subscription inválida: faltan keys.p256dh / keys.auth'
                }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // Una suscripción por usuario/dispositivo; TTL 180 días (refresco
            // del navegador cuando el push service la da de baja).
            await env.ROOMS_KV.put(key, JSON.stringify(subscription), { expirationTtl: 15552000 });

            return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            console.error('Error in webpush handler:', error);
            return new Response(JSON.stringify({
                success: false,
                error: error.message
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    },

    /**
     * Update the Expo push token of an existing user (mobile contract).
     * Body: { userId, deviceId, expoPushToken } — espejo del contrato en
     * src/services/AuthService.js. También refresca el índice user:device del
     * propio dispositivo.
     */
    async handleUpdatePushToken(request, env, corsHeaders) {
        try {
            const body = await request.json();
            const { userId, deviceId, expoPushToken } = body || {};

            if (!userId || !deviceId || !expoPushToken) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'userId, deviceId y expoPushToken son obligatorios'
                }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            const userDataString = await env.ROOMS_KV.get(`user:id:${userId}`);
            if (!userDataString) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Usuario no encontrado'
                }), {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            const userData = JSON.parse(userDataString);
            userData.expoPushToken = expoPushToken;
            userData.deviceId = deviceId;

            await Promise.all([
                env.ROOMS_KV.put(`user:id:${userId}`, JSON.stringify(userData)),
                env.ROOMS_KV.put(`user:device:${deviceId}`, JSON.stringify(userData)),
            ]);

            return new Response(JSON.stringify({
                success: true,
                message: 'Push token actualizado correctamente'
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            console.error('Error updating push token:', error);
            return new Response(JSON.stringify({
                success: false,
                error: error.message
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    },

    /**
     * Generate unique discriminator for username
     * Like Discord: username#0001, username#0002, etc.
     */
    async generateDiscriminator(username, env) {
        // Try discriminators from 0001 to 9999
        for (let i = 1; i <= 9999; i++) {
            const discriminator = i.toString().padStart(4, '0');
            const key = `user:username:${username}:${discriminator}`;

            const exists = await env.ROOMS_KV.get(key);
            if (!exists) {
                return discriminator;
            }
        }

        // If all discriminators taken (very unlikely), use random
        return Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    },

    /**
     * Search users by EXACT username#discriminator match only (for privacy)
     * No fuzzy search or prefix matching allowed
     */
    async searchUsers(request, env, corsHeaders) {
        try {
            const url = new URL(request.url);
            const query = url.searchParams.get('query');

            if (!query) {
                return new Response(JSON.stringify({
                    users: [],
                    message: 'Query is required'
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // Only allow exact match with discriminator (username#1234)
            if (!query.includes('#')) {
                return new Response(JSON.stringify({
                    users: [],
                    message: 'Please provide full username with discriminator (e.g., username#1234)'
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            const [username, discriminator] = query.split('#');
            const key = `user:username:${username}:${discriminator}`;

            const userData = await env.ROOMS_KV.get(key);

            if (!userData) {
                return new Response(JSON.stringify({
                    users: [],
                    message: 'User not found'
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            const user = JSON.parse(userData);

            return new Response(JSON.stringify({
                users: [{
                    username: user.username,
                    discriminator: user.discriminator,
                    fullUsername: user.fullUsername,
                    userId: user.userId,
                    deviceId: user.deviceId,
                    publicKey: user.publicKey
                }],
                total: 1
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } catch (error) {
            console.error('Error searching users:', error);
            return new Response(JSON.stringify({
                error: 'Failed to search users',
                message: error.message
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    },

    /**
     * List all registered users - DISABLED for privacy
     * Users must be added by exact username#discriminator
     */
    async listUsers(request, env, corsHeaders) {
        return new Response(JSON.stringify({
            error: 'User directory is disabled for privacy',
            message: 'Please use exact username search (username#discriminator) to find users'
        }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    },

    /**
     * Find user by full username (username#discriminator)
     */
    async findUserByUsername(request, env, corsHeaders) {
        try {
            const url = new URL(request.url);
            const fullUsername = url.searchParams.get('username');

            if (!fullUsername || !fullUsername.includes('#')) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Invalid username format. Expected username#discriminator'
                }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            const [username, discriminator] = fullUsername.split('#');
            const key = `user:username:${username}:${discriminator}`;

            const userData = await env.ROOMS_KV.get(key);

            if (!userData) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'User not found'
                }), {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            const parsed = JSON.parse(userData);

            // Get full user data including public key from user:id index
            const fullUserData = await env.ROOMS_KV.get(`user:id:${parsed.userId}`);
            let publicKey = null;

            if (fullUserData) {
                const fullUser = JSON.parse(fullUserData);
                publicKey = fullUser.publicKey;
            }

            return new Response(JSON.stringify({
                success: true,
                user: {
                    username,
                    discriminator,
                    fullUsername,
                    userId: parsed.userId,
                    deviceId: parsed.deviceId,
                    publicKey: publicKey
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } catch (error) {
            console.error('Error finding user:', error);
            return new Response(JSON.stringify({
                success: false,
                error: error.message
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    },

    /**
     * Start a new direct message conversation
     */
    async startDirectMessage(request, env, corsHeaders) {
        try {
            const body = await request.json();
            const { userId, recipientId } = body;

            if (!userId || !recipientId) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'userId and recipientId are required'
                }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // Generate deterministic conversation ID (always same for same pair)
            const conversationId = this.generateConversationId(userId, recipientId);

            console.log(`DM conversation ID generated: ${conversationId}`);

            return new Response(JSON.stringify({
                success: true,
                conversationId,
                url: `/api/dm/${conversationId}`
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } catch (error) {
            console.error('Error starting DM:', error);
            return new Response(JSON.stringify({
                success: false,
                error: error.message
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    },

    /**
     * Get user's conversations list
     */
    async getUserConversations(request, env, corsHeaders) {
        try {
            const url = new URL(request.url);
            const userId = url.searchParams.get('userId');

            if (!userId) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'userId is required'
                }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // List all conversations for this user
            const listOptions = {
                prefix: `dm:conversation:${userId}:`,
                limit: 100
            };

            const list = await env.ROOMS_KV.list(listOptions);

            // Get conversation data and enrich with recipient info
            const conversationPromises = list.keys.map(async (key) => {
                try {
                    const data = await env.ROOMS_KV.get(key.name);
                    if (!data) return null;

                    const conversation = JSON.parse(data);

                    // Find the other participant
                    const otherUserId = conversation.participants.find(p => p !== userId);

                    if (otherUserId) {
                        // Fetch other user's info
                        const otherUserData = await env.ROOMS_KV.get(`user:id:${otherUserId}`);
                        if (otherUserData) {
                            const otherUser = JSON.parse(otherUserData);
                            conversation.recipient = {
                                userId: otherUser.userId,
                                username: otherUser.username,
                                discriminator: otherUser.discriminator,
                                fullUsername: otherUser.fullUsername,
                                publicKey: otherUser.publicKey
                            };
                        }
                    }

                    return conversation;
                } catch (error) {
                    console.error(`Error reading conversation ${key.name}:`, error);
                    return null;
                }
            });

            const conversations = (await Promise.all(conversationPromises))
                .filter(conv => conv !== null)
                .sort((a, b) => b.createdAt - a.createdAt);

            return new Response(JSON.stringify({
                conversations,
                total: conversations.length
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } catch (error) {
            console.error('Error getting conversations:', error);
            return new Response(JSON.stringify({
                error: 'Failed to get conversations',
                message: error.message
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    },

    /**
     * Delete a conversation for a user
     */
    async deleteConversation(request, env, corsHeaders) {
        try {
            const body = await request.json();
            const { userId, conversationId } = body;

            if (!userId || !conversationId) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'userId and conversationId are required'
                }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // Delete from valid KV key for this user
            const key = `dm:conversation:${userId}:${conversationId}`;
            await env.ROOMS_KV.delete(key);

            return new Response(JSON.stringify({
                success: true,
                message: 'Conversation deleted'
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } catch (error) {
            console.error('Error deleting conversation:', error);
            return new Response(JSON.stringify({
                success: false,
                error: error.message
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    },

    /**
     * Join/connect to a direct message conversation
     */
    async joinDirectMessage(request, env, conversationId, corsHeaders) {
        if (!conversationId || conversationId.length < 6) {
            return new Response(JSON.stringify({
                error: 'Invalid conversation ID'
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        try {
            // Get or create DirectMessage Durable Object
            const id = env.DIRECT_MESSAGES.idFromName(conversationId);
            const dm = env.DIRECT_MESSAGES.get(id);

            // Forward request to Durable Object
            return dm.fetch(request);
        } catch (error) {
            console.error('Error joining DM:', error);
            return new Response(JSON.stringify({
                error: 'Failed to join conversation',
                message: error.message
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    },

    /**
     * Get user by device ID
     */
    async getUserByDeviceId(request, env, corsHeaders) {
        try {
            const url = new URL(request.url);
            const deviceId = url.searchParams.get('deviceId');

            if (!deviceId) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'deviceId is required'
                }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // Get user data from device ID
            const userData = await env.ROOMS_KV.get(`user:device:${deviceId}`);

            if (!userData) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'User not found'
                }), {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            const user = JSON.parse(userData);

            return new Response(JSON.stringify({
                success: true,
                user: {
                    userId: user.userId,
                    username: user.username,
                    discriminator: user.discriminator,
                    fullUsername: user.fullUsername,
                    deviceId: user.deviceId,
                    publicKey: user.publicKey
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } catch (error) {
            console.error('Error getting user by device ID:', error);
            return new Response(JSON.stringify({
                success: false,
                error: error.message
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    },

    /**
     * Get public key for a user
     */
    async getUserPublicKey(request, env, corsHeaders) {
        try {
            const url = new URL(request.url);
            const userId = url.searchParams.get('userId');

            if (!userId) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'userId is required'
                }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            const userData = await env.ROOMS_KV.get(`user:id:${userId}`);

            if (!userData) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'User not found'
                }), {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            const user = JSON.parse(userData);

            return new Response(JSON.stringify({
                success: true,
                userId: user.userId,
                publicKey: user.publicKey,
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } catch (error) {
            console.error('Error getting user public key:', error);
            return new Response(JSON.stringify({
                success: false,
                error: error.message
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    },

    /**
     * Send contact request
     */
    async sendContactRequest(request, env, corsHeaders) {
        try {
            const body = await request.json();
            const { senderId, recipientDeviceId, senderUsername } = body;

            if (!senderId || !recipientDeviceId || !senderUsername) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'senderId, recipientDeviceId, and senderUsername are required'
                }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // Get recipient user data
            const recipientData = await env.ROOMS_KV.get(`user:device:${recipientDeviceId}`);
            if (!recipientData) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Recipient user not found'
                }), {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            const recipient = JSON.parse(recipientData);

            // Check if they're already contacts
            const existingContact = await env.ROOMS_KV.get(
                `contact:accepted:${senderId}:${recipient.userId}`
            );
            if (existingContact) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Already contacts'
                }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // Check if request already exists
            const existingRequest = await env.ROOMS_KV.get(
                `contact:request:${senderId}:${recipient.userId}`
            );
            if (existingRequest) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Contact request already sent'
                }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // Create request
            const requestId = `${senderId}:${recipient.userId}`;
            const requestData = {
                requestId,
                senderId,
                recipientId: recipient.userId,
                senderUsername,
                recipientUsername: recipient.fullUsername,
                status: 'pending',
                createdAt: Date.now()
            };

            // Store request (indexed by both sender and recipient for easy querying)
            await env.ROOMS_KV.put(
                `contact:request:${senderId}:${recipient.userId}`,
                JSON.stringify(requestData)
            );

            await env.ROOMS_KV.put(
                `contact:request:pending:${recipient.userId}:${requestId}`,
                JSON.stringify(requestData)
            );

            console.log(`Contact request sent: ${senderId} → ${recipient.userId}`);

            // Send Push Notification
            if (recipient.expoPushToken) {
                await this.sendPushNotification(
                    recipient.expoPushToken,
                    'New Friend Request',
                    `${senderUsername} wants to be your friend!`,
                    { type: 'contact_request', senderId }
                );
            }

            return new Response(JSON.stringify({
                success: true,
                requestId,
                message: 'Contact request sent successfully'
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } catch (error) {
            console.error('Error sending contact request:', error);
            return new Response(JSON.stringify({
                success: false,
                error: error.message
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    },

    /**
     * Get contact requests for a user
     */
    async getContactRequests(request, env, corsHeaders) {
        try {
            const url = new URL(request.url);
            const userId = url.searchParams.get('userId');

            if (!userId) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'userId is required'
                }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // List all pending requests for this user
            const listOptions = {
                prefix: `contact:request:pending:${userId}:`,
                limit: 100
            };

            const list = await env.ROOMS_KV.list(listOptions);

            // Get request data
            const requestPromises = list.keys.map(async (key) => {
                try {
                    const data = await env.ROOMS_KV.get(key.name);
                    return data ? JSON.parse(data) : null;
                } catch (error) {
                    console.error(`Error reading request ${key.name}:`, error);
                    return null;
                }
            });

            const requests = (await Promise.all(requestPromises))
                .filter(req => req !== null)
                .sort((a, b) => b.createdAt - a.createdAt);

            return new Response(JSON.stringify({
                requests,
                total: requests.length
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } catch (error) {
            console.error('Error getting contact requests:', error);
            return new Response(JSON.stringify({
                error: 'Failed to get contact requests',
                message: error.message
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    },

    /**
     * Accept contact request
     */
    async acceptContactRequest(request, env, corsHeaders) {
        try {
            const body = await request.json();
            const { requestId, userId } = body;

            if (!requestId || !userId) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'requestId and userId are required'
                }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // Get request data
            const requestData = await env.ROOMS_KV.get(`contact:request:pending:${userId}:${requestId}`);
            if (!requestData) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Contact request not found'
                }), {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            const reqData = JSON.parse(requestData);
            const { senderId, recipientId } = reqData;

            // Create contact entries for both users
            const conversationId = this.generateConversationId(senderId, recipientId);
            const contactData = {
                userId1: senderId,
                userId2: recipientId,
                acceptedAt: Date.now(),
                conversationId
            };

            await env.ROOMS_KV.put(
                `contact:accepted:${senderId}:${recipientId}`,
                JSON.stringify(contactData)
            );

            await env.ROOMS_KV.put(
                `contact:accepted:${recipientId}:${senderId}`,
                JSON.stringify(contactData)
            );

            // Create DM conversation metadata
            const conversationData = {
                conversationId,
                participants: [senderId, recipientId].sort(),
                createdAt: Date.now()
            };

            await env.ROOMS_KV.put(
                `dm:conversation:${senderId}:${conversationId}`,
                JSON.stringify(conversationData)
            );

            await env.ROOMS_KV.put(
                `dm:conversation:${recipientId}:${conversationId}`,
                JSON.stringify(conversationData)
            );

            // Delete request entries
            await env.ROOMS_KV.delete(`contact:request:${senderId}:${recipientId}`);
            await env.ROOMS_KV.delete(`contact:request:pending:${recipientId}:${requestId}`);

            console.log(`Contact request accepted: ${senderId} ↔ ${recipientId}`);

            return new Response(JSON.stringify({
                success: true,
                conversationId,
                message: 'Contact request accepted'
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } catch (error) {
            console.error('Error accepting contact request:', error);
            return new Response(JSON.stringify({
                success: false,
                error: error.message
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    },

    /**
     * Reject contact request
     */
    async rejectContactRequest(request, env, corsHeaders) {
        try {
            const body = await request.json();
            const { requestId, userId } = body;

            if (!requestId || !userId) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'requestId and userId are required'
                }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // Get request data to know sender
            const requestData = await env.ROOMS_KV.get(`contact:request:pending:${userId}:${requestId}`);
            if (!requestData) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Contact request not found'
                }), {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            const reqData = JSON.parse(requestData);
            const { senderId, recipientId } = reqData;

            // Delete request entries
            await env.ROOMS_KV.delete(`contact:request:${senderId}:${recipientId}`);
            await env.ROOMS_KV.delete(`contact:request:pending:${recipientId}:${requestId}`);

            console.log(`Contact request rejected: ${senderId} → ${recipientId}`);

            return new Response(JSON.stringify({
                success: true,
                message: 'Contact request rejected'
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } catch (error) {
            console.error('Error rejecting contact request:', error);
            return new Response(JSON.stringify({
                success: false,
                error: error.message
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    },

    /**
     * Get contacts list for a user
     */
    async getContactsList(request, env, corsHeaders) {
        try {
            const url = new URL(request.url);
            const userId = url.searchParams.get('userId');

            if (!userId) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'userId is required'
                }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // List all accepted contacts for this user
            const listOptions = {
                prefix: `contact:accepted:${userId}:`,
                limit: 100
            };

            const list = await env.ROOMS_KV.list(listOptions);

            // Get contact data and user info
            const contactPromises = list.keys.map(async (key) => {
                try {
                    const data = await env.ROOMS_KV.get(key.name);
                    if (!data) return null;

                    const contactData = JSON.parse(data);
                    const otherUserId = contactData.userId1 === userId ? contactData.userId2 : contactData.userId1;

                    // Get user info from user:id index (Much more efficient than scanning all devices)
                    const userData = await env.ROOMS_KV.get(`user:id:${otherUserId}`);
                    let userInfo = null;

                    if (userData) {
                        userInfo = JSON.parse(userData);
                    }

                    return {
                        userId: otherUserId,
                        username: userInfo?.username || 'Unknown',
                        discriminator: userInfo?.discriminator || '0000',
                        fullUsername: userInfo?.fullUsername || otherUserId,
                        publicKey: userInfo?.publicKey || null,
                        conversationId: contactData.conversationId,
                        acceptedAt: contactData.acceptedAt
                    };
                } catch (error) {
                    console.error(`Error reading contact ${key.name}:`, error);
                    return null;
                }
            });

            const contacts = (await Promise.all(contactPromises))
                .filter(contact => contact !== null)
                .sort((a, b) => b.acceptedAt - a.acceptedAt);

            return new Response(JSON.stringify({
                contacts,
                total: contacts.length
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } catch (error) {
            console.error('Error getting contacts list:', error);
            return new Response(JSON.stringify({
                error: 'Failed to get contacts list',
                message: error.message
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    },

    /**
     * Generate deterministic conversation ID for two users
     * Always returns same ID for same pair of users
     */
    generateConversationId(userId1, userId2) {
        // Sort to ensure consistency
        const [user1, user2] = [userId1, userId2].sort();

        // Create deterministic hash-like ID
        const combined = `${user1}:${user2}`;
        let hash = 0;
        for (let i = 0; i < combined.length; i++) {
            const char = combined.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }

        // Convert to base36 and ensure minimum length
        const hashStr = Math.abs(hash).toString(36);

        // Removed timestamp to ensure same ID is always generated for same pair
        return `dm_${hashStr}_v2`;
    },

    /**
     * Generar ID único para sala
     */
    generateRoomId() {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },

    /**
     * Generate unique device ID
     */
    generateDeviceId() {
        return 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },

    /**
     * Send Push Notification using Expo API
     */
    async sendPushNotification(token, title, body, data = {}) {
        if (!token) return;

        try {
            const message = {
                to: token,
                sound: 'default',
                title: title,
                body: body,
                data: data,
            };

            await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Accept-encoding': 'gzip, deflate',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(message),
            });
            console.log(`Push notification sent to ${token}`);
        } catch (error) {
            console.error('Error sending push notification:', error);
        }
    },

    async testPushNotification(request, env, corsHeaders) {
        try {
            const body = await request.json();
            const { token } = body;
            await this.sendPushNotification(token, 'Test Notification', 'This is a test notification from Chatti', { test: true });
            return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        } catch (error) {
            return new Response(JSON.stringify({ success: false, error: error.message }), { headers: corsHeaders });
        }
    }
};