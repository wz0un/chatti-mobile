import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
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
});
