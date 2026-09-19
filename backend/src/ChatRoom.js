/**
 * ChatRoom Durable Object with SQLite Persistence
 * Cada sala de chat es una instancia de este Durable Object
 * Maneja WebSocket connections, broadcasting de mensajes y persistencia en SQLite
 */
export class ChatRoom {
    constructor(state, env) {
        this.state = state;
        this.env = env;
        this.storage = state.storage;

        // Cache en memoria para acceso rápido (últimos mensajes)
        this.recentMessages = [];
        this.users = new Map();

        // Inicializar SQLite y cargar mensajes recientes
        this.state.blockConcurrencyWhile(async () => {
            this.initDB();
        });
    }

    initDB() {
        // Obtener acceso a SQLite
        this.sql = this.storage.sql;

        // Crear tabla de mensajes si no existe
        this.sql.exec(`
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                username TEXT NOT NULL,
                userId TEXT,
                content TEXT NOT NULL,
                type TEXT DEFAULT 'message',
                timestamp INTEGER NOT NULL
            );
        `);

        // Crear índice para queries eficientes
        this.sql.exec(`
            CREATE INDEX IF NOT EXISTS idx_timestamp ON messages(timestamp DESC);
        `);

        // Cargar últimos 50 mensajes en memoria al iniciar
        const cursor = this.sql.exec(`
            SELECT id, username, userId, content, type, timestamp 
            FROM messages 
            ORDER BY timestamp DESC 
            LIMIT 50
        `);

        // Convertir cursor a array y ordenar cronológicamente
        const rows = [...cursor].reverse();
        this.recentMessages = rows.map(row => ({
            id: row.id,
            username: row.username,
            userId: row.userId,
            content: row.content,
            type: row.type || 'message',
            timestamp: row.timestamp
        }));

        console.log(`ChatRoom initialized with ${this.recentMessages.length} cached messages`);
    }

    async fetch(request) {
        const url = new URL(request.url);

        // Upgrade HTTP request to WebSocket
        if (request.headers.get('Upgrade') === 'websocket') {
            return this.handleWebSocket(request);
        }

        // API endpoints
        if (url.pathname.endsWith('/messages')) {
            const cursor = url.searchParams.get('cursor');
            const limit = parseInt(url.searchParams.get('limit') || '50');
            return this.getHistory(cursor, limit);
        }

        if (url.pathname.endsWith('/post') && request.method === 'POST') {
            const body = await request.json();
            return this.postMessageHTTP(body);
        }

        if (url.pathname.endsWith('/info')) {
            return this.getRoomInfo();
        }

        return new Response('Not found', { status: 404 });
    }

    /**
     * Maneja conexión WebSocket
     */
    async handleWebSocket(request) {
        const pair = new WebSocketPair();
        const [client, server] = Object.values(pair);

        // Aceptar la conexión WebSocket usando la API de hibernación
        this.state.acceptWebSocket(server);

        // Metadata inicial del usuario en el socket
        server.serializeAttachment({
            username: null,
            userId: null,
            joinedAt: Date.now()
        });

        // Enviar historial reciente al nuevo usuario
        if (this.recentMessages.length > 0) {
            server.send(JSON.stringify({
                type: 'history',
                messages: this.recentMessages
            }));
        }

        // Enviar lista de usuarios conectados
        const userList = Array.from(this.users.keys());
        server.send(JSON.stringify({
            type: 'user_list',
            users: userList,
            totalUsers: userList.length
        }));

        return new Response(null, {
            status: 101,
            webSocket: client,
        });
    }

    /**
     * Maneja mensajes entrantes de WebSocket
     */
    async webSocketMessage(ws, message) {
        try {
            const data = JSON.parse(message);

            switch (data.type) {
                case 'join':
                    this.handleJoin(ws, data);
                    break;

                case 'message':
                    this.handleMessage(ws, data);
                    break;

                case 'typing':
                    this.handleTyping(ws, data);
                    break;

                default:
                    console.log('Unknown message type:', data.type);
            }
        } catch (error) {
            console.error('Error processing message:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Invalid message format'
            }));
        }
    }

    /**
     * Usuario se une a la sala
     */
    handleJoin(ws, data) {
        const { username, userId } = data;

        // Guardar metadata en el socket
        ws.serializeAttachment({
            username,
            userId,
            joinedAt: Date.now()
        });

        this.users.set(username, { userId, joinedAt: Date.now() });

        // Notificar a todos que un usuario se unió
        this.broadcast({
            type: 'user_joined',
            username,
            userId,
            totalUsers: this.users.size,
            timestamp: Date.now()
        });

        console.log(`User ${username} joined room`);
    }

    /**
     * Maneja envío de mensaje via WebSocket
     */
    handleMessage(ws, data) {
        const attachment = ws.deserializeAttachment();
        if (!attachment || !attachment.username) {
            console.warn('Message received from user without username');
            return;
        }

        const messageData = {
            id: data.id || crypto.randomUUID(),
            username: attachment.username,
            userId: attachment.userId,
            content: data.content,
            type: 'message',
            timestamp: Date.now()
        };

        this.persistAndBroadcast(messageData);
    }

    /**
     * Fallback HTTP para enviar mensajes (para clientes sin WebSocket)
     */
    async postMessageHTTP(data) {
        if (!data.username || !data.content) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Missing username or content'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const messageData = {
            id: data.id || crypto.randomUUID(),
            username: data.username,
            userId: data.userId || null,
            content: data.content,
            type: 'message',
            timestamp: Date.now()
        };

        this.persistAndBroadcast(messageData);

        return new Response(JSON.stringify({
            success: true,
            id: messageData.id
        }), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }

    /**
     * Persiste mensaje en SQLite y hace broadcast
     */
    persistAndBroadcast(message) {
        try {
            // 1. Escribir en SQLite (transaccional y durable)
            this.sql.exec(`
                INSERT OR REPLACE INTO messages (id, username, userId, content, type, timestamp)
                VALUES (?, ?, ?, ?, ?, ?)
            `,
                message.id,
                message.username,
                message.userId,
                message.content,
                message.type,
                message.timestamp
            );

            // 2. Actualizar cache en memoria
            this.recentMessages.push(message);

            // Mantener solo los últimos 200 mensajes en memoria
            if (this.recentMessages.length > 200) {
                this.recentMessages.shift();
            }

            // 3. Broadcast a todos los clientes conectados
            this.broadcast(message);

            // 4. Send push notifications to offline users
            this.sendPushNotificationsToOfflineUsers(message).catch(err =>
                console.error('Error sending push notifications:', err)
            );

            console.log(`Message persisted and broadcast: ${message.id}`);
        } catch (error) {
            console.error('Error persisting message:', error);
        }
    }

    /**
     * Obtener historial paginado desde SQLite
     */
    async getHistory(cursorTimestamp, limit = 50) {
        try {
            let query, params;

            if (cursorTimestamp) {
                // Paginación: obtener mensajes anteriores al cursor
                query = `
                    SELECT id, username, userId, content, type, timestamp 
                    FROM messages 
                    WHERE timestamp < ? 
                    ORDER BY timestamp DESC 
                    LIMIT ?
                `;
                params = [parseInt(cursorTimestamp), limit];
            } else {
                // Sin cursor: obtener los más recientes
                query = `
                    SELECT id, username, userId, content, type, timestamp 
                    FROM messages 
                    ORDER BY timestamp DESC 
                    LIMIT ?
                `;
                params = [limit];
            }

            const cursor = this.sql.exec(query, ...params);
            const rows = [...cursor];

            // Ordenar cronológicamente para el cliente
            const messages = rows.reverse().map(row => ({
                id: row.id,
                username: row.username,
                userId: row.userId,
                content: row.content,
                type: row.type,
                timestamp: row.timestamp
            }));

            // El próximo cursor es el timestamp del mensaje más antiguo
            const nextCursor = rows.length > 0 ? rows[rows.length - 1].timestamp : null;

            return new Response(JSON.stringify({
                messages,
                nextCursor,
                hasMore: rows.length === limit
            }), {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        } catch (error) {
            console.error('Error fetching history:', error);
            return new Response(JSON.stringify({
                error: 'Failed to fetch history'
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    /**
     * Indicador de "usuario está escribiendo"
     */
    handleTyping(ws, data) {
        const attachment = ws.deserializeAttachment();
        if (!attachment?.username) return;

        this.broadcast({
            type: 'typing',
            username: attachment.username,
            userId: attachment.userId,
            isTyping: data.isTyping
        }, ws); // Excluir al remitente
    }

    /**
     * Maneja cierre de WebSocket
     */
    async webSocketClose(ws, code, reason, wasClean) {
        const attachment = ws.deserializeAttachment();
        const username = attachment?.username;

        if (username) {
            this.users.delete(username);

            // Notificar a otros usuarios
            this.broadcast({
                type: 'user_left',
                username: username,
                userId: attachment.userId,
                totalUsers: this.users.size,
                timestamp: Date.now()
            });

            console.log(`User ${username} left room`);
        }
    }

    /**
     * Maneja errores de WebSocket
     */
    async webSocketError(ws, error) {
        console.error('WebSocket error:', error);
    }

    /**
     * Broadcast mensaje a todos los clientes (o todos excepto uno)
     */
    broadcast(message, excludeWs = null) {
        const messageStr = JSON.stringify(message);

        // Usar this.state.getWebSockets() para obtener todos los sockets activos
        for (const ws of this.state.getWebSockets()) {
            if (ws !== excludeWs) {
                try {
                    ws.send(messageStr);
                } catch (error) {
                    console.error('Error sending to client:', error);
                }
            }
        }
    }

    /**
     * Send push notifications to users not currently connected
     */
    async sendPushNotificationsToOfflineUsers(message) {
        try {
            // Get all users who have been in this room recently
            const roomId = this.state.id.toString();
            
            // For now, we'll send to all registered users with push tokens
            // In a real app, you'd track room membership
            const listOptions = {
                prefix: 'user:device:',
                limit: 100
            };

            const list = await this.env.ROOMS_KV.list(listOptions);
            
            const notificationPromises = list.keys.map(async (key) => {
                try {
                    const userData = await this.env.ROOMS_KV.get(key.name);
                    if (!userData) return;
                    
                    const user = JSON.parse(userData);
                    
                    // Don't send notification to the sender
                    if (user.fullUsername === message.username) return;
                    
                    // Only send if user has push token
                    if (!user.expoPushToken || user.expoPushToken === 'expo-go-mock-token') return;
                    
                    // Check if user is currently connected to this room
                    const isConnected = Array.from(this.users.keys()).includes(user.fullUsername);
                    if (isConnected) return; // Skip connected users
                    
                    // Send push notification
                    await this.sendPushNotification(
                        user.expoPushToken,
                        `💬 ${message.username}`,
                        message.content,
                        { type: 'message', roomId, username: message.username }
                    );
                } catch (error) {
                    console.error('Error sending notification to user:', error);
                }
            });
            
            await Promise.all(notificationPromises);
        } catch (error) {
            console.error('Error sending push notifications:', error);
        }
    }

    /**
     * Send push notification using Expo API
     */
    async sendPushNotification(token, title, body, data = {}) {
        if (!token || token === 'expo-go-mock-token') return;

        try {
            const message = {
                to: token,
                sound: 'default',
                title: title,
                body: body.length > 100 ? body.substring(0, 100) + '...' : body,
                data: data,
            };

            const response = await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Accept-encoding': 'gzip, deflate',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(message),
            });
            
            if (!response.ok) {
                console.error('Push notification failed:', await response.text());
            }
        } catch (error) {
            console.error('Error sending push notification:', error);
        }
    }

    /**
     * Obtener información de la sala
     */
    async getRoomInfo() {
        // Obtener estadísticas de la base de datos
        const countCursor = this.sql.exec(`SELECT COUNT(*) as count FROM messages`);
        const totalMessages = [...countCursor][0]?.count || 0;

        return new Response(JSON.stringify({
            totalUsers: this.users.size,
            users: Array.from(this.users.keys()),
            cachedMessages: this.recentMessages.length,
            totalMessages: totalMessages,
            activeSessions: this.state.getWebSockets().length
        }), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
}
