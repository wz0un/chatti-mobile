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
});
