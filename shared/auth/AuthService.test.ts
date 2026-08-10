/**
 * AuthService tests — register, login, logout, session restore.
 * Live API validation against a throwaway account runs via `npm run smoke`.
 */



import { AuthService } from './AuthService';
import { generateDeviceId } from './deviceId';
import { ApiService } from '../api/ApiService';
import { MemoryStorageAdapter, STORAGE_KEYS } from '../storage/StorageAdapter';
import { defaultEncryptionService } from '../crypto/EncryptionService';

const MOCK_USER = {
  userId: 'user_123',
  username: 'webtest',
  discriminator: '1234',
  fullUsername: 'webtest#1234',
  deviceId: 'device_123_42_abc',
  publicKey: 'abc123',
  createdAt: '2026-01-01T00:00:00.000Z',
};

const fetchMock = vi.fn();

describe('AuthService', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    ApiService.configure('https://chatti-workers.wz0un.workers.dev');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const buildService = () => {
    const storage = new MemoryStorageAdapter();
    const service = new AuthService(storage, defaultEncryptionService);
    return { storage, service };
  };

  it('registers a user and persists the session', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, user: MOCK_USER }), { status: 200 }),
    );

    const { storage, service } = buildService();
    const user = await service.registerUser('webtest', 'secret123');

    expect(user.fullUsername).toBe('webtest#1234');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://chatti-workers.wz0un.workers.dev/api/auth/register');
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      username: 'webtest',
      password: 'secret123',
      expoPushToken: null,
    });
    expect(body.deviceId).toMatch(/^device_\d+_\d+_[a-z0-9]{9}$/);
    expect(body.publicKey).toBeTruthy();

    // Session persisted under the mobile key
    expect(await storage.getItem(STORAGE_KEYS.userData)).toBe(JSON.stringify(MOCK_USER));
  });

  it('registers with a trimmed username', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, user: MOCK_USER }), { status: 200 }),
    );
    const { service } = buildService();
    await service.registerUser('  webtest  ', 'secret123');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).username).toBe('webtest');
  });

  it('throws the backend error when registration fails', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: false, error: 'Username already taken' }), {
        status: 400,
      }),
    );
    const { service } = buildService();
    await expect(service.registerUser('webtest', 'secret123')).rejects.toThrow(
      'Username already taken',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('logs in and persists the session', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, user: MOCK_USER }), { status: 200 }),
    );
    const { storage, service } = buildService();
    const user = await service.loginUser('webtest#1234', 'secret123');

    expect(user.fullUsername).toBe('webtest#1234');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://chatti-workers.wz0un.workers.dev/api/auth/login');
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ fullUsername: 'webtest#1234', expoPushToken: null });
    expect(await storage.getItem(STORAGE_KEYS.userData)).toBe(JSON.stringify(MOCK_USER));
  });

  it('restores the session from storage', async () => {
    const { storage, service } = buildService();
    await storage.setItem(STORAGE_KEYS.userData, JSON.stringify(MOCK_USER));
    const user = await service.getCurrentUser();
    expect(user?.fullUsername).toBe('webtest#1234');
  });

  it('returns null when no session exists', async () => {
    const { service } = buildService();
    expect(await service.getCurrentUser()).toBeNull();
  });

  it('logs out by removing the session but keeping the deviceId', async () => {
    const { storage, service } = buildService();
    await storage.setItem(STORAGE_KEYS.userData, JSON.stringify(MOCK_USER));
    await storage.setItem(STORAGE_KEYS.deviceId, 'device_persist');

    await service.logout();

    expect(await storage.getItem(STORAGE_KEYS.userData)).toBeNull();
    expect(await storage.getItem(STORAGE_KEYS.deviceId)).toBe('device_persist');
  });

  it('persists a generated deviceId', async () => {
    const { storage, service } = buildService();
    const id = await service.getDeviceId();
    expect(id).toMatch(/^device_\d+_\d+_[a-z0-9]{9}$/);
    expect(await storage.getItem(STORAGE_KEYS.deviceId)).toBe(id);
    // Second call returns the stored one
    expect(await service.getDeviceId()).toBe(id);
  });

  it('formats usernames with discriminator', () => {
    expect(AuthService.formatUsername('alice', '42')).toBe('alice#42');
  });

  it('updatePushToken is a no-op on web', async () => {
    const { service } = buildService();
    expect(await service.updatePushToken()).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('deviceId generation', () => {
  it('matches the mobile format device_<ts>_<hash>_<rand>', () => {
    const id = generateDeviceId('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36');
    expect(id).toMatch(/^device_\d+_\d+_[a-z0-9]{9}$/);
  });

  it('is deterministic for the same user agent', () => {
    const agent = 'Mozilla/5.0 test-agent';
    const hash1 = generateDeviceId(agent).split('_')[2];
    const hash2 = generateDeviceId(agent).split('_')[2];
    expect(hash1).toBe(hash2);
  });
});
