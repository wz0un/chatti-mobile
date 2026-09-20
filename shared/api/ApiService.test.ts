/**
 * ApiService endpoint tests — shape/payload assertions with a mocked fetch.
 * Live smoke tests against the real worker run via `npm run smoke`.
 */



import { ApiService } from './ApiService';

const fetchMock = vi.fn();

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('ApiService', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    ApiService.configure('https://chatti-workers.wz0un.workers.dev');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('listRooms builds the paginated query and returns the shape', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ rooms: [{ id: 'r1' }], cursor: 'c1', hasMore: true }),
    );
    const result = await ApiService.listRooms('abc', 50);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://chatti-workers.wz0un.workers.dev/api/rooms?cursor=abc&limit=50',
    );
    expect(result).toEqual({ rooms: [{ id: 'r1' }], cursor: 'c1', hasMore: true });
  });

  it('listRooms without cursor omits the cursor param', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ rooms: [] }));
    await ApiService.listRooms(null, 20);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://chatti-workers.wz0un.workers.dev/api/rooms?limit=20',
    );
  });

  it('createRoom sends the mobile payload', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, room: { id: 'r1' } }));
    const room = await ApiService.createRoom('Lobby', 'owner_1', false, null);
    expect(room).toEqual({ id: 'r1' });
    const init = fetchMock.mock.calls[0][1];
    expect(JSON.parse(init.body)).toEqual({
      name: 'Lobby',
      owner: 'owner_1',
      isPrivate: false,
      password: null,
    });
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://chatti-workers.wz0un.workers.dev/api/room/create',
    );
  });

  it('getMessageHistory hits the room messages endpoint', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ messages: [], hasMore: false }));
    await ApiService.getMessageHistory('r1', null, 50);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://chatti-workers.wz0un.workers.dev/api/room/r1/messages?limit=50',
    );
  });

  it('postMessage posts to the room and returns the id', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, id: 'm1' }));
    const id = await ApiService.postMessage('r1', 'alice#1', 'hello', 'u1');
    expect(id).toBe('m1');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      username: 'alice#1',
      userId: 'u1',
      content: 'hello',
    });
  });

  it('findUserByUsername returns null on 404', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'not found' }, 404));
    expect(await ApiService.findUserByUsername('nobody#1')).toBeNull();
  });

  it('findUserByUsername returns the user', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ success: true, user: { userId: 'u1', fullUsername: 'alice#1' } }),
    );
    const user = await ApiService.findUserByUsername('alice#1');
    expect(user?.fullUsername).toBe('alice#1');
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://chatti-workers.wz0un.workers.dev/api/users/find?username=alice%231',
    );
  });

  it('getPublicKey returns null when the user has none', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: false }));
    expect(await ApiService.getPublicKey('u1')).toBeNull();
  });

  it('getPublicKey returns the key', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, publicKey: '0xbeef' }));
    expect(await ApiService.getPublicKey('u1')).toBe('0xbeef');
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://chatti-workers.wz0un.workers.dev/api/users/public-key?userId=u1',
    );
  });

  it('startDirectMessage posts userId + recipientId and returns conversationId', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ success: true, conversationId: 'c1', url: '/api/dm/c1' }),
    );
    const result = await ApiService.startDirectMessage('u1', 'u2');
    expect(result.conversationId).toBe('c1');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ userId: 'u1', recipientId: 'u2' });
  });

  it('startDirectMessage throws the backend error on failure', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: false, error: 'Not a contact' }));
    await expect(ApiService.startDirectMessage('u1', 'u2')).rejects.toThrow('Not a contact');
  });

  it('getUserConversations returns the conversation array', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ conversations: [{ conversationId: 'c1' }], total: 1 }),
    );
    const convos = await ApiService.getUserConversations('u1');
    expect(convos).toHaveLength(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://chatti-workers.wz0un.workers.dev/api/dm/conversations?userId=u1',
    );
  });

  it('deleteConversation posts userId + conversationId', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true }));
    expect(await ApiService.deleteConversation('u1', 'c1')).toBe(true);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      userId: 'u1',
      conversationId: 'c1',
    });
  });

  it('contact request endpoints use the mobile payloads', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, requestId: 'rq1' }));
    const res = await ApiService.sendContactRequest('u1', 'dev1', 'alice#1');
    expect(res.success).toBe(true);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      senderId: 'u1',
      recipientDeviceId: 'dev1',
      senderUsername: 'alice#1',
    });
  });

  it('getContactRequests returns requests', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ requests: [{ requestId: 'rq1' }], total: 1 }));
    const requests = await ApiService.getContactRequests('u1');
    expect(requests).toHaveLength(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://chatti-workers.wz0un.workers.dev/api/contacts/requests?userId=u1',
    );
  });

  it('accept/reject contact requests post the mobile payloads', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true }));
    await ApiService.acceptContactRequest('rq1', 'u1');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ requestId: 'rq1', userId: 'u1' });

    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true }));
    await ApiService.rejectContactRequest('rq1', 'u1');
    expect(fetchMock.mock.calls[1][0]).toBe(
      'https://chatti-workers.wz0un.workers.dev/api/contacts/reject',
    );
  });

  it('getContactsList returns contacts', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ contacts: [{ userId: 'u2' }], total: 1 }));
    const contacts = await ApiService.getContactsList('u1');
    expect(contacts).toHaveLength(1);
  });

  it('deleteAccount posts userId + deviceId', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true }));
    expect(await ApiService.deleteAccount('u1', 'dev1')).toBe(true);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ userId: 'u1', deviceId: 'dev1' });
  });

  it('registerWebPush posts the web push subscription to /api/auth/webpush', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true }));
    const subscription = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
      expirationTime: null,
      keys: { p256dh: 'p256dh-b64', auth: 'auth-b64' },
    };
    const ok = await ApiService.registerWebPush('u1', 'dev1', subscription);
    expect(ok).toBe(true);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://chatti-workers.wz0un.workers.dev/api/auth/webpush',
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      userId: 'u1',
      deviceId: 'dev1',
      action: 'register',
      subscription,
    });
  });

  it('registerWebPush returns false when the backend rejects (200 + success:false)', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: false, error: 'VAPID not configured' }));
    expect(
      await ApiService.registerWebPush('u1', 'dev1', {
        endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
        expirationTime: null,
        keys: { p256dh: 'b64', auth: 'b64' },
      }),
    ).toBe(false);
  });

  it('registerWebPush throws on HTTP error', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'boom' }, 500));
    await expect(ApiService.registerWebPush('u1', 'dev1', {
      endpoint: 'ep',
      expirationTime: null,
      keys: { p256dh: 'b64', auth: 'b64' },
    })).rejects.toThrow('boom');
  });

  it('removeWebPush posts the remove action with the endpoint', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true }));
    const ok = await ApiService.removeWebPush('u1', 'dev1', 'https://fcm.googleapis.com/fcm/send/abc');
    expect(ok).toBe(true);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://chatti-workers.wz0un.workers.dev/api/auth/webpush',
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      userId: 'u1',
      deviceId: 'dev1',
      action: 'remove',
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
    });
  });

  it('removeWebPush throws on HTTP error', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'boom' }, 500));
    await expect(ApiService.removeWebPush('u1', 'dev1', 'ep')).rejects.toThrow('boom');
  });

  it('configure strips trailing slashes', () => {
    ApiService.configure('https://example.com/api/');
    expect(ApiService.baseUrl).toBe('https://example.com/api');
  });
});
