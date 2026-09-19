/**
 * DirectMessage Durable Object for 1-to-1 encrypted chat
 * Stores encrypted messages and relays them between two participants
 * Does NOT decrypt messages - acts as a secure relay
 */
export class DirectMessage {
    constructor(state, env) {
        this.state = state;
        this.env = env;
        this.storage = state.storage;

        // Cache en memoria para mensajes recientes
        this.recentMessages = [];
        this.participants = new Map(); // Map of userId -> {username, ws, publicKey}

        // Inicializar SQLite
        this.state.blockConcurrencyWhile(async () => {
            this.initDB();
        });
    }

    initDB() {
        // Obtener acceso a SQLite
        this.sql = this.storage.sql;

        // Crear tabla de mensajes cifrados
        this.sql.exec(`
            CREATE TABLE IF NOT EXISTS encrypted_messages (
                id TEXT PRIMARY KEY,
                senderId TEXT NOT NULL,
                recipientId TEXT NOT NULL,
                encryptedContent TEXT NOT NULL,
                iv TEXT NOT NULL,
                senderPublicKey TEXT,
                timestamp INTEGER NOT NULL
            );
        `);

        // Índices para queries eficientes
        this.sql.exec(`
            CREATE INDEX IF NOT EXISTS idx_timestamp ON encrypted_messages(timestamp DESC);
        `);

        this.sql.exec(`
            CREATE INDEX IF NOT EXISTS idx_sender_recipient ON encrypted_messages(senderId, recipientId);
        `);

        // Tabla para almacenar claves públicas de los participantes
        this.sql.exec(`
            CREATE TABLE IF NOT EXISTS participant_keys (
                userId TEXT PRIMARY KEY,
                username TEXT NOT NULL,
                publicKey TEXT NOT NULL,
                lastSeen INTEGER NOT NULL
            );
        `);

        // Cargar últimos 50 mensajes en memoria
        const cursor = this.sql.exec(`
            SELECT id, senderId, recipientId, encryptedContent, iv, senderPublicKey, timestamp
            FROM encrypted_messages
            ORDER BY timestamp DESC
            LIMIT 50
        `);

        const rows = [...cursor].reverse();
        this.recentMessages = rows.map(row => ({
            id: row.id,
            senderId: row.senderId,
            recipientId: row.recipientId,
            encryptedContent: row.encryptedContent,
            iv: row.iv,
            senderPublicKey: row.senderPublicKey,
            timestamp: row.timestamp
        }));

        console.log(`DirectMessage initialized with ${this.recentMessages.length} cached messages`);
    }

    async fetch(request) {
        const url = new URL(request.url);

        // Extract conversation ID from URL
        // /api/dm/:roomId/...
        const pathParts = url.pathname.split('/');
        // pathParts: ['', 'api', 'dm', 'roomId', ...]
        if (pathParts.length >= 4) {
            this.conversationId = pathParts[3];
        }

        // CORS headers
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Upgrade, Connection, Sec-WebSocket-Key, Sec-WebSocket-Version, Sec-WebSocket-Protocol',
        };

        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        // Upgrade a WebSocket para chat en tiempo real
        if (request.headers.get('Upgrade') === 'websocket') {
            return this.handleWebSocket(request);
        }

        // API endpoints
        if (url.pathname.endsWith('/messages')) {
            const cursor = url.searchParams.get('cursor');
            const limit = parseInt(url.searchParams.get('limit') || '50');
            return this.getHistory(cursor, limit, corsHeaders);
        }

        if (url.pathname.endsWith('/info')) {
            return this.getConversationInfo(corsHeaders);
        }

        if (url.pathname.endsWith('/key-exchange') && request.method === 'POST') {
            const body = await request.json();
            return this.handleKeyExchange(body, corsHeaders);
        }

        return new Response('Not found', { status: 404, headers: corsHeaders });
    }

    /**
     * Maneja conexión WebSocket para chat en tiempo real
     */
    async handleWebSocket(request) {
        const pair = new WebSocketPair();
        const [client, server] = Object.values(pair);

        // Aceptar la conexión WebSocket
        this.state.acceptWebSocket(server);

        // Metadata inicial del usuario
        server.serializeAttachment({
            userId: null,
            username: null,
            publicKey: null,
            joinedAt: Date.now()
        });

        // Enviar historial reciente al nuevo usuario
        if (this.recentMessages.length > 0) {
            server.send(JSON.stringify({
                type: 'history',
                messages: this.recentMessages
            }));
        }

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

                case 'encrypted_message':
                    this.handleEncryptedMessage(ws, data);
                    break;

                case 'key_exchange':
                    this.handleKeyExchangeWS(ws, data);
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
     * Usuario se une a la conversación
     */
    handleJoin(ws, data) {
        const { userId, username, publicKey } = data;

        // Guardar metadata en el socket
        ws.serializeAttachment({
            userId,
            username,
            publicKey,
            joinedAt: Date.now()
        });

        // Almacenar en participantes activos
        this.participants.set(userId, { username, ws, publicKey });

        // Guardar/actualizar clave pública en DB
        if (publicKey) {
            this.sql.exec(`
                INSERT OR REPLACE INTO participant_keys (userId, username, publicKey, lastSeen)
                VALUES (?, ?, ?, ?)
            `, userId, username, publicKey, Date.now());
        }

        // Notificar al otro participante
        this.broadcast({
            type: 'user_joined',
            userId,
            username,
            publicKey,
            timestamp: Date.now()
        }, ws);

        console.log(`User ${username} (${userId}) joined conversation`);
    }

    /**
     * Maneja envío de mensaje cifrado via WebSocket
     */
    handleEncryptedMessage(ws, data) {
        const attachment = ws.deserializeAttachment();
        if (!attachment || !attachment.userId) {
            console.warn('Message received from user without userId');
            return;
        }

        const messageData = {
            id: data.id || crypto.randomUUID(),
            senderId: attachment.userId,
            recipientId: data.recipientId,
            encryptedContent: data.encryptedContent,
            iv: data.iv,
            senderPublicKey: attachment.publicKey,
            timestamp: Date.now()
        };

        this.persistAndRelay(messageData);
    }

    /**
     * Intercambio de claves públicas via WebSocket
     */
    handleKeyExchangeWS(ws, data) {
        const attachment = ws.deserializeAttachment();
        if (!attachment || !attachment.userId) return;

        // Actualizar clave pública del usuario
        if (data.publicKey) {
            attachment.publicKey = data.publicKey;
            ws.serializeAttachment(attachment);

            // Guardar en DB
            this.sql.exec(`
                INSERT OR REPLACE INTO participant_keys (userId, username, publicKey, lastSeen)
                VALUES (?, ?, ?, ?)
            `, attachment.userId, attachment.username, data.publicKey, Date.now());

            // Enviar al otro participante
            this.broadcast({
                type: 'key_exchanged',
                userId: attachment.userId,
                publicKey: data.publicKey,
                timestamp: Date.now()
            }, ws);
        }
    }

    /**
     * Intercambio de claves vía HTTP
     */
    async handleKeyExchange(data, corsHeaders) {
        const { userId, username, publicKey } = data;

        if (!userId || !publicKey) {
            return new Response(JSON.stringify({
                success: false,
                error: 'userId and publicKey are required'
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Guardar clave pública
        this.sql.exec(`
            INSERT OR REPLACE INTO participant_keys (userId, username, publicKey, lastSeen)
            VALUES (?, ?, ?, ?)
        `, userId, username, publicKey, Date.now());

        // Obtener clave pública del otro participante
        const otherKeyResult = this.sql.exec(`
            SELECT publicKey FROM participant_keys
            WHERE userId != ?
            LIMIT 1
        `, userId);

        const otherKey = [...otherKeyResult][0]?.publicKey || null;

        return new Response(JSON.stringify({
            success: true,
            recipientPublicKey: otherKey
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    /**
     * Persiste mensaje cifrado y lo reenvía al destinatario
     */
    persistAndRelay(message) {
        try {
            // 1. Escribir mensaje cifrado en SQLite
            this.sql.exec(`
                INSERT OR REPLACE INTO encrypted_messages 
                (id, senderId, recipientId, encryptedContent, iv, senderPublicKey, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
                message.id,
                message.senderId,
                message.recipientId,
                message.encryptedContent,
                message.iv,
                message.senderPublicKey,
                message.timestamp
            );

            // 2. Actualizar cache en memoria
            this.recentMessages.push(message);
            if (this.recentMessages.length > 200) {
                this.recentMessages.shift();
            }

            // 3. Relay a los participantes (broadcast)
            this.broadcast({
                type: 'encrypted_message',
                ...message
            });

            console.log(`Encrypted message persisted and relayed: ${message.id}`);

            // 4. Update Inbox in KV for both users
            this.updateConversationsList(message).catch(err =>
                console.error('Error updating conversations list:', err)
            );

            // 5. Send Push Notification if recipient is not connected
            if (!this.participants.has(message.recipientId)) {
                this.sendPushNotificationToUser(message.recipientId, message.senderId, 'New Message');
            }
        } catch (error) {
            console.error('Error persisting encrypted message:', error);
        }
    }

    /**
     * Updates the conversation list in KV for participants
     */
    async updateConversationsList(message) {
        let conversationId = this.conversationId;

        // Fallback: Generate conversation ID if missing
        if (!conversationId) {
            const [u1, u2] = [message.senderId, message.recipientId].sort();
            const combined = `${u1}:${u2}`;
            let hash = 0;
            for (let i = 0; i < combined.length; i++) {
                const char = combined.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            conversationId = `dm_${Math.abs(hash).toString(36)}_v2`;
            console.log(`Generated fallback conversationId: ${conversationId}`);
        }

        const baseData = {
            conversationId: conversationId,
            participants: [message.senderId, message.recipientId].sort(),
            createdAt: message.timestamp,
            lastMessage: {
                content: message.encryptedContent ? '🔒 Mensaje Cifrado' : 'Mensaje',
                timestamp: message.timestamp,
                senderId: message.senderId
            }
        };

        try {
            // Actualizar para el Remitente
            // Necesitamos los datos del Destinatario para que el remitente vea su nombre
            const recipientData = await this.env.ROOMS_KV.get(`user:id:${message.recipientId}`);
            const senderData = await this.env.ROOMS_KV.get(`user:id:${message.senderId}`);

            if (recipientData) {
                const recipient = JSON.parse(recipientData);
                const senderConvoData = {
                    ...baseData,
                    recipient: {
                        userId: recipient.userId,
                        username: recipient.username,
                        publicKey: recipient.publicKey
                    }
                };
                await this.env.ROOMS_KV.put(
                    `dm:conversation:${message.senderId}:${conversationId}`,
                    JSON.stringify(senderConvoData)
                );
            }

            // Actualizar para el Destinatario
            // El destinatario debe ver el nombre del remitente
            if (senderData) {
                const sender = JSON.parse(senderData);
                const recipientConvoData = {
                    ...baseData,
                    recipient: {
                        userId: sender.userId,
                        username: sender.username,
                        publicKey: sender.publicKey
                    }
                };
                await this.env.ROOMS_KV.put(
                    `dm:conversation:${message.recipientId}:${conversationId}`,
                    JSON.stringify(recipientConvoData)
                );
            }

            console.log(`Conversation list updated for both participants in ${conversationId}`);
        } catch (error) {
            console.error('Error updating conversations KV:', error);
        }
    }

    /**
     * Send push notification to a specific user
     */
    async sendPushNotificationToUser(userId, senderId, title) {
        try {
            // Get user data to find device/token
            // Since we don't have direct userId -> token mapping in memory, we check KV
            // We need to look up by user ID. 
            // In index.js `registerUser` we added `user:id:${userId}` index.

            const userData = await this.env.ROOMS_KV.get(`user:id:${userId}`);
            if (!userData) return;

            const user = JSON.parse(userData);
            if (!user.expoPushToken) return;

            const message = {
                to: user.expoPushToken,
                sound: 'default',
                title: title,
                body: 'You have a new encrypted message',
                data: { type: 'message', senderId, conversationId: this.state.id.toString() },
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
        } catch (error) {
            console.error('Error sending DM push notification:', error);
        }
    }


    /**
     * Obtener historial cifrado paginado
     */
    async getHistory(cursorTimestamp, limit = 50, corsHeaders) {
        try {
            let query, params;

            if (cursorTimestamp) {
                query = `
                    SELECT id, senderId, recipientId, encryptedContent, iv, senderPublicKey, timestamp
                    FROM encrypted_messages
                    WHERE timestamp < ?
                    ORDER BY timestamp DESC
                    LIMIT ?
                `;
                params = [parseInt(cursorTimestamp), limit];
            } else {
                query = `
                    SELECT id, senderId, recipientId, encryptedContent, iv, senderPublicKey, timestamp
                    FROM encrypted_messages
                    ORDER BY timestamp DESC
                    LIMIT ?
                `;
                params = [limit];
            }

            const cursor = this.sql.exec(query, ...params);
            const rows = [...cursor];

            const messages = rows.reverse().map(row => ({
                id: row.id,
                senderId: row.senderId,
                recipientId: row.recipientId,
                encryptedContent: row.encryptedContent,
                iv: row.iv,
                senderPublicKey: row.senderPublicKey,
                timestamp: row.timestamp
            }));

            const nextCursor = rows.length > 0 ? rows[rows.length - 1].timestamp : null;

            return new Response(JSON.stringify({
                messages,
                nextCursor,
                hasMore: rows.length === limit
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            console.error('Error fetching history:', error);
            return new Response(JSON.stringify({
                error: 'Failed to fetch history'
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }

    /**
     * Indicador de "usuario está escribiendo"
     */
    handleTyping(ws, data) {
        const attachment = ws.deserializeAttachment();
        if (!attachment?.userId) return;

        this.broadcast({
            type: 'typing',
            userId: attachment.userId,
            username: attachment.username,
            isTyping: data.isTyping
        }, ws);
    }

    /**
     * Maneja cierre de WebSocket
     */
    async webSocketClose(ws, code, reason, wasClean) {
        const attachment = ws.deserializeAttachment();
        const userId = attachment?.userId;

        if (userId) {
            this.participants.delete(userId);

            // Notificar al otro usuario
            this.broadcast({
                type: 'user_left',
                userId: userId,
                username: attachment.username,
                timestamp: Date.now()
            });

            console.log(`User ${attachment.username} left conversation`);
        }
    }

    /**
     * Maneja errores de WebSocket
     */
    async webSocketError(ws, error) {
        console.error('WebSocket error:', error);
    }

    /**
     * Broadcast mensaje a todos los participantes (o todos excepto uno)
     */
    broadcast(message, excludeWs = null) {
        const messageStr = JSON.stringify(message);

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
     * Obtener información de la conversación
     */
    async getConversationInfo(corsHeaders) {
        // Obtener estadísticas
        const countCursor = this.sql.exec(`SELECT COUNT(*) as count FROM encrypted_messages`);
        const totalMessages = [...countCursor][0]?.count || 0;

        // Obtener participantes registrados
        const participantsCursor = this.sql.exec(`SELECT userId, username, publicKey FROM participant_keys`);
        const participantsList = [...participantsCursor].map(row => ({
            userId: row.userId,
            username: row.username,
            hasPublicKey: !!row.publicKey
        }));

        return new Response(JSON.stringify({
            totalMessages,
            participants: participantsList,
            activeConnections: this.state.getWebSockets().length,
            cachedMessages: this.recentMessages.length
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}
