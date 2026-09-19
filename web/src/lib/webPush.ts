/**
 * Web Push helper — Task 22 (FE side).
 * Wraps the browser Web Push API (Service Worker + VAPID) behind a small
 * API used by the Profile screen. The backend contract (POST /api/auth/webpush)
 * lives in `shared/api/contracts.ts`; spec in docs/WEB-PUSH.md.
 *
 * All functions are forgiving: they return a result union instead of throwing,
 * so the UI can render a friendly status/error without try/catch noise.
 */

import { ApiService } from '@shared/api/ApiService';
import type { WebPushSubscription } from '@shared/api/contracts';

export const SW_PATH = '/sw.js';

/** Reason a push action could not complete. */
export type WebPushFailureReason =
  | 'unsupported'
  | 'permission-denied'
  | 'vapid-missing'
  | 'subscribe-error'
  | 'register-error'
  | 'service-worker-error'
  | 'unsubscribe-error'
  | 'remove-error';

export type WebPushResult = { ok: true } | { ok: false; reason: WebPushFailureReason; message?: string };

/** Browser support check (guard for older engines / non-secure contexts). */
export const isWebPushSupported = (): boolean =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  typeof Notification !== 'undefined';

/** VAPID public key provided at build time via `VITE_VAPID_PUBLIC_KEY`. */
export const getVapidPublicKey = (): string | null => {
  const key = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined)?.trim();
  return key || null;
};

const base64UrlToUint8Array = (base64Url: string): Uint8Array => {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob(`${base64}${padding}`);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
};

/** Register the service worker and wait until it is active. */
const getReadyRegistration = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!isWebPushSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.register(SW_PATH);
    await navigator.serviceWorker.ready;
    return registration;
  } catch {
    return null;
  }
};

/** Current active Web Push subscription, if the browser has one. */
export const getActiveSubscription = async (): Promise<PushSubscription | null> => {
  if (!isWebPushSupported()) return null;
  const registration = await getReadyRegistration();
  if (!registration) return null;
  try {
    return (await registration.pushManager.getSubscription()) ?? null;
  } catch {
    return null;
  }
};

/** `Notification.permission`, or 'denied-like' state when unsupported. */
export const pushPermissionState = (): NotificationPermission | 'unsupported' => {
  if (!isWebPushSupported()) return 'unsupported';
  return Notification.permission;
};

/**
 * Enable Web Push for the current device: request permission, subscribe with
 * the VAPID key, then register the subscription on the backend.
 */
export const enableWebPush = async (userId: string, deviceId: string): Promise<WebPushResult> => {
  if (!isWebPushSupported()) return { ok: false, reason: 'unsupported' };

  let permission = Notification.permission;
  if (permission !== 'granted') {
    try {
      permission = await Notification.requestPermission();
    } catch {
      return { ok: false, reason: 'permission-denied', message: 'requestPermission failed' };
    }
  }
  if (permission !== 'granted') return { ok: false, reason: 'permission-denied' };

  const vapidPublicKey = getVapidPublicKey();
  if (!vapidPublicKey) return { ok: false, reason: 'vapid-missing' };

  const registration = await getReadyRegistration();
  if (!registration) return { ok: false, reason: 'service-worker-error' };

  let subscription: PushSubscription;
  try {
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      subscription = existing;
    } else {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToUint8Array(vapidPublicKey) as BufferSource,
      });
    }
  } catch {
    return { ok: false, reason: 'subscribe-error' };
  }

  const json = subscription.toJSON() ?? {};
  const payload: WebPushSubscription = {
    endpoint: subscription.endpoint,
    expirationTime: json.expirationTime ?? null,
    keys: { p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '' },
  };

  try {
    const ok = await ApiService.registerWebPush(userId, deviceId, payload);
    return ok ? { ok: true } : { ok: false, reason: 'register-error' };
  } catch (error) {
    return {
      ok: false,
      reason: 'register-error',
      message: error instanceof Error ? error.message : undefined,
    };
  }
};

/**
 * Disable Web Push: unsubscribe from the browser and remove the registration
 * on the backend.
 */
export const disableWebPush = async (userId: string, deviceId: string): Promise<WebPushResult> => {
  const subscription = await getActiveSubscription();
  if (!subscription) return { ok: true };
  const endpoint = subscription.endpoint;

  try {
    await subscription.unsubscribe();
  } catch (error) {
    return {
      ok: false,
      reason: 'unsubscribe-error',
      message: error instanceof Error ? error.message : undefined,
    };
  }

  try {
    const ok = await ApiService.removeWebPush(userId, deviceId, endpoint);
    return ok ? { ok: true } : { ok: false, reason: 'remove-error' };
  } catch (error) {
    return {
      ok: false,
      reason: 'remove-error',
      message: error instanceof Error ? error.message : undefined,
    };
  }
};

/** True when the browser currently holds an active push subscription. */
export const isPushSubscribed = async (): Promise<boolean> => {
  return (await getActiveSubscription()) !== null;
};