/**
 * Web Push helper tests — Task 22 (FE side).
 * Exercises the browser API wrapper with stubbed globals (navigator.serviceWorker,
 * window.PushManager, Notification) and a spied ApiService (no network).
 */

import { ApiService } from '@shared/api/ApiService';
import {
  SW_PATH,
  disableWebPush,
  enableWebPush,
  getActiveSubscription,
  isWebPushSupported,
  pushPermissionState,
} from './webPush';

const VAPID_KEY = 'YWJj'; // base64url for "abc"

const makeSubscription = (endpoint = 'https://push.example/endpoint') => ({
  endpoint,
  toJSON: () => ({
    endpoint,
    expirationTime: null,
    keys: { p256dh: 'PDH', auth: 'AUTH' },
  }),
  unsubscribe: vi.fn().mockResolvedValue(true),
});

const mockPushEnabledEnv = (subscription: ReturnType<typeof makeSubscription> | null = null) => {
  const pushManager = {
    getSubscription: vi.fn().mockResolvedValue(subscription),
    subscribe: vi.fn().mockResolvedValue(subscription ?? makeSubscription()),
  };
  const registration = { pushManager };
  const serviceWorker = {
    register: vi.fn().mockResolvedValue(registration),
    ready: Promise.resolve(registration),
  };
  vi.stubGlobal('navigator', { serviceWorker });
  vi.stubGlobal('window', { PushManager: {} });
  vi.stubGlobal('Notification', { permission: 'granted', requestPermission: vi.fn() });
  return { pushManager, serviceWorker, registration };
};

describe('webPush support & permission', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('is not supported without PushManager', () => {
    vi.stubGlobal('navigator', { serviceWorker: {} });
    vi.stubGlobal('window', {});
    expect(isWebPushSupported()).toBe(false);
  });

  it('is supported when all APIs exist', () => {
    vi.stubGlobal('navigator', { serviceWorker: {} });
    vi.stubGlobal('window', { PushManager: {} });
    vi.stubGlobal('Notification', { permission: 'default' });
    expect(isWebPushSupported()).toBe(true);
  });

  it('pushPermissionState reports unsupported', () => {
    vi.stubGlobal('navigator', { serviceWorker: {} });
    vi.stubGlobal('window', {});
    expect(pushPermissionState()).toBe('unsupported');
  });

  it('getActiveSubscription returns null when unsupported', async () => {
    vi.stubGlobal('navigator', { serviceWorker: {} });
    vi.stubGlobal('window', {});
    expect(await getActiveSubscription()).toBeNull();
  });
});

describe('enableWebPush', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('registers the service worker, subscribes and calls the backend', async () => {
    const { pushManager, serviceWorker } = mockPushEnabledEnv();
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', VAPID_KEY);
    const spy = vi.spyOn(ApiService, 'registerWebPush').mockResolvedValue(true);

    const result = await enableWebPush('u1', 'dev1');

    expect(result).toEqual({ ok: true });
    expect(serviceWorker.register).toHaveBeenCalledWith(SW_PATH);
    expect(pushManager.subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: expect.any(Uint8Array),
    });
    expect(pushManager.getSubscription).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith(
      'u1',
      'dev1',
      {
        endpoint: 'https://push.example/endpoint',
        expirationTime: null,
        keys: { p256dh: 'PDH', auth: 'AUTH' },
      },
    );
    expect(pushManager.subscribe).not.toHaveBeenCalledWith(
      expect.objectContaining({ applicationServerKey: VAPID_KEY }),
    );
  });

  it('reuses an existing subscription instead of subscribing twice', async () => {
    const existing = makeSubscription('https://push.example/keep');
    const { pushManager } = mockPushEnabledEnv(existing);
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', VAPID_KEY);
    vi.spyOn(ApiService, 'registerWebPush').mockResolvedValue(true);

    const result = await enableWebPush('u1', 'dev1');
    expect(result).toEqual({ ok: true });
    expect(pushManager.subscribe).not.toHaveBeenCalled();
  });

  it('returns permission-denied when the user denies the prompt', async () => {
    mockPushEnabledEnv();
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', VAPID_KEY);
    const notif = {
      permission: 'default' as NotificationPermission,
      requestPermission: vi.fn().mockResolvedValue('denied' as NotificationPermission),
    };
    vi.stubGlobal('Notification', notif);

    expect(await enableWebPush('u1', 'dev1')).toEqual({ ok: false, reason: 'permission-denied' });
    expect(notif.requestPermission).toHaveBeenCalled();
  });

  it('returns vapid-missing without a configured key', async () => {
    mockPushEnabledEnv();
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', '');
    expect(await enableWebPush('u1', 'dev1')).toEqual({ ok: false, reason: 'vapid-missing' });
  });

  it('returns register-error when the backend rejects', async () => {
    mockPushEnabledEnv();
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', VAPID_KEY);
    vi.spyOn(ApiService, 'registerWebPush').mockResolvedValue(false);
    expect(await enableWebPush('u1', 'dev1')).toEqual({ ok: false, reason: 'register-error' });
  });
});

describe('disableWebPush', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('unsubscribes locally and removes the backend registration', async () => {
    const sub = makeSubscription('https://push.example/gone');
    mockPushEnabledEnv(sub);
    const spy = vi.spyOn(ApiService, 'removeWebPush').mockResolvedValue(true);

    const result = await disableWebPush('u1', 'dev1');
    expect(result).toEqual({ ok: true });
    expect(sub.unsubscribe).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith('u1', 'dev1', 'https://push.example/gone');
  });

  it('is a no-op when there is no subscription', async () => {
    mockPushEnabledEnv(null);
    expect(await disableWebPush('u1', 'dev1')).toEqual({ ok: true });
  });
});