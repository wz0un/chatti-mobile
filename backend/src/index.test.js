import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';
import { pbkdf2Sync } from 'node:crypto';
import { Buffer } from 'node:buffer';
import worker from '../src/index.js';

describe('Chatti Workers API', () => {
    it('should respond to health check', async () => {
        const request = new Request('http://example.com/health');
        const ctx = createExecutionContext();
        const response = await worker.fetch(request, env, ctx);
        await waitOnExecutionContext(ctx);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.status).toBe('ok');
    });

    it('should create a new room', async () => {
        const request = new Request('http://example.com/api/room/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test Room',
                owner: 'test-user'
            })
        });

        const ctx = createExecutionContext();
        const response = await worker.fetch(request, env, ctx);
        await waitOnExecutionContext(ctx);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.room).toBeDefined();
        expect(data.room.id).toBeDefined();
        expect(data.room.name).toBe('Test Room');
    });

    it('should list rooms', async () => {
        const request = new Request('http://example.com/api/rooms');
        const ctx = createExecutionContext();
        const response = await worker.fetch(request, env, ctx);
        await waitOnExecutionContext(ctx);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.rooms).toBeDefined();
        expect(Array.isArray(data.rooms)).toBe(true);
    });

    it('should get room info', async () => {
        // First create a room
        const createRequest = new Request('http://example.com/api/room/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Info Test Room' })
        });

        const createCtx = createExecutionContext();
        const createResponse = await worker.fetch(createRequest, env, createCtx);
        await waitOnExecutionContext(createCtx);
        const { room } = await createResponse.json();

        // Then get its info
        const infoRequest = new Request(`http://example.com/api/room/${room.id}/info`);
        const infoCtx = createExecutionContext();
        const infoResponse = await worker.fetch(infoRequest, env, infoCtx);
        await waitOnExecutionContext(infoCtx);

        expect(infoResponse.status).toBe(200);
        const data = await infoResponse.json();
        expect(data.totalUsers).toBeDefined();
        expect(data.totalMessages).toBeDefined();
    });

    it('should post message via HTTP', async () => {
        // Create a room first
        const createRequest = new Request('http://example.com/api/room/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Message Test Room' })
        });

        const createCtx = createExecutionContext();
        const createResponse = await worker.fetch(createRequest, env, createCtx);
        await waitOnExecutionContext(createCtx);
        const { room } = await createResponse.json();

        // Post a message
        const postRequest = new Request(`http://example.com/api/room/${room.id}/post`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'test-user',
                userId: 'user-123',
                content: 'Hello, World!'
            })
        });

        const postCtx = createExecutionContext();
        const postResponse = await worker.fetch(postRequest, env, postCtx);
        await waitOnExecutionContext(postCtx);

        expect(postResponse.status).toBe(200);
        const data = await postResponse.json();
        expect(data.success).toBe(true);
        expect(data.id).toBeDefined();
    });

    it('should fetch message history', async () => {
        // Create room and post message
        const createRequest = new Request('http://example.com/api/room/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'History Test Room' })
        });

        const createCtx = createExecutionContext();
        const createResponse = await worker.fetch(createRequest, env, createCtx);
        await waitOnExecutionContext(createCtx);
        const { room } = await createResponse.json();

        // Post message
        const postRequest = new Request(`http://example.com/api/room/${room.id}/post`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'test-user',
                content: 'Test message'
            })
        });

        const postCtx = createExecutionContext();
        await worker.fetch(postRequest, env, postCtx);
        await waitOnExecutionContext(postCtx);

        // Fetch history
        const historyRequest = new Request(`http://example.com/api/room/${room.id}/messages`);
        const historyCtx = createExecutionContext();
        const historyResponse = await worker.fetch(historyRequest, env, historyCtx);
        await waitOnExecutionContext(historyCtx);

        expect(historyResponse.status).toBe(200);
        const data = await historyResponse.json();
        expect(data.messages).toBeDefined();
        expect(Array.isArray(data.messages)).toBe(true);
        expect(data.messages.length).toBeGreaterThan(0);
    });

    describe('Web Push subscription endpoint (Task 22)', () => {
        const VALID_SUBSCRIPTION = {
            endpoint: 'https://updates.push.services.mozilla.com/wpush/v2/test_id_123',
            expirationTime: null,
            keys: {
                p256dh: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
                auth: 'BTBZMqHH6r4Tts7J_aSIgg'
            }
        };

        const callWebPush = async (body) => {
            const request = new Request('http://example.com/api/auth/webpush', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const ctx = createExecutionContext();
            const response = await worker.fetch(request, env, ctx);
            await waitOnExecutionContext(ctx);
            return response;
        };

        it('registers a browser subscription', async () => {
            const response = await callWebPush({
                userId: 'user-webpush-1',
                deviceId: 'browser-1',
                action: 'register',
                subscription: VALID_SUBSCRIPTION
            });

            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data.success).toBe(true);

            const stored = await env.ROOMS_KV.get('user:user-webpush-1:webpush:browser-1');
            expect(stored).toBeDefined();
            expect(JSON.parse(stored).endpoint).toBe(VALID_SUBSCRIPTION.endpoint);
        });

        it('rejects a register without a subscription', async () => {
            const response = await callWebPush({
                userId: 'user-webpush-2',
                deviceId: 'browser-2',
                action: 'register'
            });

            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data.success).toBe(false);
        });

        it('rejects a non-https endpoint', async () => {
            const response = await callWebPush({
                userId: 'user-webpush-3',
                deviceId: 'browser-3',
                action: 'register',
                subscription: { ...VALID_SUBSCRIPTION, endpoint: 'http://insecure.example.com/push' }
            });

            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data.success).toBe(false);
        });

        it('removes an existing subscription', async () => {
            await callWebPush({
                userId: 'user-webpush-4',
                deviceId: 'browser-4',
                action: 'register',
                subscription: VALID_SUBSCRIPTION
            });

            const response = await callWebPush({
                userId: 'user-webpush-4',
                deviceId: 'browser-4',
                action: 'remove'
            });

            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data.success).toBe(true);

            const stored = await env.ROOMS_KV.get('user:user-webpush-4:webpush:browser-4');
            expect(stored).toBeNull();
        });

        it('rejects an unknown action', async () => {
            const response = await callWebPush({
                userId: 'user-webpush-5',
                deviceId: 'browser-5',
                action: 'upsert',
                subscription: VALID_SUBSCRIPTION
            });

            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data.success).toBe(false);
        });
    });

    describe('Update push token endpoint (mobile contract)', () => {
        it('updates the expo push token of an existing user', async () => {
            // Crear usuario real primero
            const registerRequest = new Request('http://example.com/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: 'pushuser', password: 'secret123' })
            });
            const regCtx = createExecutionContext();
            const regResponse = await worker.fetch(registerRequest, env, regCtx);
            await waitOnExecutionContext(regCtx);
            const regData = await regResponse.json();
            expect(regData.success).toBe(true);
            const { userId } = regData.user;

            const request = new Request('http://example.com/api/auth/update-push-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    deviceId: 'device-expo-1',
                    expoPushToken: 'ExponentPushToken[new_token_123]'
                })
            });
            const ctx = createExecutionContext();
            const response = await worker.fetch(request, env, ctx);
            await waitOnExecutionContext(ctx);

            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data.success).toBe(true);

            const stored = JSON.parse(await env.ROOMS_KV.get(`user:id:${userId}`));
            expect(stored.expoPushToken).toBe('ExponentPushToken[new_token_123]');
        });

        it('returns 404 for an unknown user', async () => {
            const request = new Request('http://example.com/api/auth/update-push-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: 'user-does-not-exist',
                    deviceId: 'device-x',
                    expoPushToken: 'ExponentPushToken[x]'
                })
            });
            const ctx = createExecutionContext();
            const response = await worker.fetch(request, env, ctx);
            await waitOnExecutionContext(ctx);

            expect(response.status).toBe(404);
            const data = await response.json();
            expect(data.success).toBe(false);
        });

        it('requires all fields', async () => {
            const request = new Request('http://example.com/api/auth/update-push-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: 'user-x' })
            });
            const ctx = createExecutionContext();
            const response = await worker.fetch(request, env, ctx);
            await waitOnExecutionContext(ctx);

            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data.success).toBe(false);
        });
    });

    describe('Auth password hashing (BUG-01 source parity)', () => {
        const call = async (path, body) => {
            const request = new Request(`http://example.com${path}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const ctx = createExecutionContext();
            const response = await worker.fetch(request, env, ctx);
            await waitOnExecutionContext(ctx);
            return response;
        };

        it('stores PBKDF2 hashes on register and verifies login', async () => {
            const register = await call('/api/auth/register', {
                username: 'pbkdf2user',
                password: 'secret123',
                deviceId: 'device-pbkdf2-1'
            });
            expect(register.status).toBe(200);
            const regData = await register.json();
            expect(regData.success).toBe(true);

            const stored = JSON.parse(await env.ROOMS_KV.get(
                `user:username:pbkdf2user:${regData.user.discriminator}`
            ));
            expect(stored.passwordHash).toMatch(/^pbkdf2\$sha256\$100000\$/);
            expect(stored.passwordHash).not.toMatch(/^\$2[aby]\$/);

            const login = await call('/api/auth/login', {
                fullUsername: regData.user.fullUsername,
                password: 'secret123'
            });
            expect(login.status).toBe(200);
            expect((await login.json()).success).toBe(true);

            const wrong = await call('/api/auth/login', {
                fullUsername: regData.user.fullUsername,
                password: 'wrong-pass'
            });
            expect(wrong.status).toBe(401);
        });

        it('accepts legacy bcrypt users and migrates them to PBKDF2', async () => {
            const legacyPassword = 'legacy-pass';
            const legacyHash = await bcrypt.hash(legacyPassword, 4);
            const legacyUser = {
                username: 'legacyuser',
                discriminator: '0001',
                fullUsername: 'legacyuser#0001',
                passwordHash: legacyHash,
                deviceId: 'device-legacy-1',
                userId: 'user-legacy-1',
                createdAt: Date.now(),
                expoPushToken: null,
                publicKey: null
            };

            await env.ROOMS_KV.put('user:username:legacyuser:0001', JSON.stringify(legacyUser));
            await env.ROOMS_KV.put('user:id:user-legacy-1', JSON.stringify(legacyUser));
            await env.ROOMS_KV.put('user:device:device-legacy-1', JSON.stringify(legacyUser));

            const login = await call('/api/auth/login', {
                fullUsername: 'legacyuser#0001',
                password: legacyPassword
            });
            expect(login.status).toBe(200);
            expect((await login.json()).success).toBe(true);

            const migrated = JSON.parse(await env.ROOMS_KV.get('user:username:legacyuser:0001'));
            expect(migrated.passwordHash).toMatch(/^pbkdf2\$sha256\$100000\$/);

            const byId = JSON.parse(await env.ROOMS_KV.get('user:id:user-legacy-1'));
            expect(byId.passwordHash).toBe(migrated.passwordHash);

            const byDevice = JSON.parse(await env.ROOMS_KV.get('user:device:device-legacy-1'));
            expect(byDevice.passwordHash).toBe(migrated.passwordHash);

            const relogin = await call('/api/auth/login', {
                fullUsername: 'legacyuser#0001',
                password: legacyPassword
            });
            expect(relogin.status).toBe(200);

            const wrong = await call('/api/auth/login', {
                fullUsername: 'legacyuser#0001',
                password: 'nope'
            });
            expect(wrong.status).toBe(401);
        });

        it('verifies PBKDF2 hashes from an independent implementation (standard and URL-safe base64)', async () => {
            const password = 'vector-pass';
            const salt = Buffer.from('0123456789abcdef');
            const derived = pbkdf2Sync(password, salt, 100000, 32, 'sha256');
            const standard = `pbkdf2$sha256$100000$${salt.toString('base64')}$${derived.toString('base64')}`;
            const urlSafe = standard
                .split('$')
                .map((part, index) => (index < 3 ? part : part.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')))
                .join('$');

            const makeUser = (suffix, hash) => ({
                username: `vectoruser${suffix}`,
                discriminator: '0001',
                fullUsername: `vectoruser${suffix}#0001`,
                passwordHash: hash,
                deviceId: `device-vector-${suffix}`,
                userId: `user-vector-${suffix}`,
                createdAt: Date.now(),
                expoPushToken: null,
                publicKey: null
            });

            for (const [suffix, hash] of [['std', standard], ['url', urlSafe]]) {
                const user = makeUser(suffix, hash);
                await env.ROOMS_KV.put(`user:username:${user.username}:0001`, JSON.stringify(user));
                await env.ROOMS_KV.put(`user:id:${user.userId}`, JSON.stringify(user));
                await env.ROOMS_KV.put(`user:device:${user.deviceId}`, JSON.stringify(user));

                const login = await call('/api/auth/login', {
                    fullUsername: user.fullUsername,
                    password
                });
                expect(login.status).toBe(200);
                expect((await login.json()).success).toBe(true);

                const wrong = await call('/api/auth/login', {
                    fullUsername: user.fullUsername,
                    password: 'wrong-vector-pass'
                });
                expect(wrong.status).toBe(401);
            }
        });

        it('rejects malformed PBKDF2 hashes without returning 500', async () => {
            const user = {
                username: 'malformeduser',
                discriminator: '0001',
                fullUsername: 'malformeduser#0001',
                passwordHash: 'pbkdf2$sha256$100000$!!!$!!!',
                deviceId: 'device-malformed',
                userId: 'user-malformed',
                createdAt: Date.now(),
                expoPushToken: null,
                publicKey: null
            };
            await env.ROOMS_KV.put('user:username:malformeduser:0001', JSON.stringify(user));
            await env.ROOMS_KV.put('user:id:user-malformed', JSON.stringify(user));

            const response = await call('/api/auth/login', {
                fullUsername: 'malformeduser#0001',
                password: 'whatever'
            });
            expect(response.status).toBe(401);
        });

        it('handles concurrent first logins of a legacy bcrypt account', async () => {
            const password = 'legacy-race-pass';
            const legacyHash = await bcrypt.hash(password, 4);
            const user = {
                username: 'legacyrace',
                discriminator: '0001',
                fullUsername: 'legacyrace#0001',
                passwordHash: legacyHash,
                deviceId: 'device-race',
                userId: 'user-race',
                createdAt: Date.now(),
                expoPushToken: null,
                publicKey: null
            };
            await env.ROOMS_KV.put('user:username:legacyrace:0001', JSON.stringify(user));
            await env.ROOMS_KV.put('user:id:user-race', JSON.stringify(user));
            await env.ROOMS_KV.put('user:device:device-race', JSON.stringify(user));

            const [first, second] = await Promise.all([
                call('/api/auth/login', { fullUsername: user.fullUsername, password }),
                call('/api/auth/login', { fullUsername: user.fullUsername, password })
            ]);
            expect(first.status).toBe(200);
            expect(second.status).toBe(200);

            const stored = JSON.parse(await env.ROOMS_KV.get('user:username:legacyrace:0001'));
            expect(stored.passwordHash).toMatch(/^pbkdf2\$sha256\$100000\$/);

            const relogin = await call('/api/auth/login', {
                fullUsername: user.fullUsername,
                password
            });
            expect(relogin.status).toBe(200);
        });
    });

    describe('Contact recipient resolution after device change (M2 finding #4)', () => {
        const call = async (path, body, method = 'POST') => {
            const request = new Request(`http://example.com${path}`, {
                method,
                headers: { 'Content-Type': 'application/json' },
                ...(body ? { body: JSON.stringify(body) } : {})
            });
            const ctx = createExecutionContext();
            const response = await worker.fetch(request, env, ctx);
            await waitOnExecutionContext(ctx);
            return response;
        };

        const register = async (username, deviceId) => {
            const response = await call('/api/auth/register', {
                username,
                password: 'secret123',
                deviceId,
                publicKey: `pk-${username}`
            });
            expect(response.status).toBe(200);
            return (await response.json()).user;
        };

        it('keeps users/find and contacts/request consistent after update-push-token changes deviceId', async () => {
            const user = await register('m2recipient', 'device-old');

            // Simulate the M2 stale mapping: the old device index is gone.
            await env.ROOMS_KV.delete('user:device:device-old');

            const update = await call('/api/auth/update-push-token', {
                userId: user.userId,
                deviceId: 'device-new',
                expoPushToken: 'ExponentPushToken[new]'
            });
            expect(update.status).toBe(200);

            const usernameEntry = JSON.parse(await env.ROOMS_KV.get(
                `user:username:${user.username}:${user.discriminator}`
            ));
            expect(usernameEntry.deviceId).toBe('device-new');
            expect(await env.ROOMS_KV.get('user:device:device-old')).toBeNull();
            expect(await env.ROOMS_KV.get('user:device:device-new')).toBeTruthy();

            const found = await call(
                `/api/users/find?username=${encodeURIComponent(user.fullUsername)}`,
                null,
                'GET'
            );
            expect(found.status).toBe(200);
            const foundUser = (await found.json()).user;
            expect(foundUser.deviceId).toBe('device-new');
            expect(foundUser.publicKey).toBe('pk-m2recipient');

            const byDevice = await call('/api/users/by-device-id?deviceId=device-new', null, 'GET');
            expect(byDevice.status).toBe(200);
            expect((await byDevice.json()).user.userId).toBe(user.userId);

            const contact = await call('/api/contacts/request', {
                senderId: 'user-sender-1',
                recipientDeviceId: 'device-new',
                senderUsername: 'sender#0001'
            });
            expect(contact.status).toBe(200);
            expect(await env.ROOMS_KV.get(
                `contact:request:user-sender-1:${user.userId}`
            )).toBeTruthy();
        });

        it('lets login adopt a new deviceId and refresh all indices', async () => {
            const user = await register('m2relogin', 'device-before');

            const login = await call('/api/auth/login', {
                fullUsername: user.fullUsername,
                password: 'secret123',
                deviceId: 'device-after'
            });
            expect(login.status).toBe(200);

            const usernameEntry = JSON.parse(await env.ROOMS_KV.get(
                `user:username:${user.username}:${user.discriminator}`
            ));
            expect(usernameEntry.deviceId).toBe('device-after');

            const byId = JSON.parse(await env.ROOMS_KV.get(`user:id:${user.userId}`));
            expect(byId.deviceId).toBe('device-after');
            expect(await env.ROOMS_KV.get('user:device:device-before')).toBeNull();
            expect(await env.ROOMS_KV.get('user:device:device-after')).toBeTruthy();

            const found = await call(
                `/api/users/find?username=${encodeURIComponent(user.fullUsername)}`,
                null,
                'GET'
            );
            expect((await found.json()).user.deviceId).toBe('device-after');
        });
    });
});
