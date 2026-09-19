/**
 * Web Push payload schema — Task 22.
 * Contract between the Chatti backend (Cloudflare Worker) and the web Service
 * Worker. The backend composes push payloads and sends them through the
 * standard Web Push API (VAPID); this module defines the shape both sides
 * agree on and the deep-link routing rules the Service Worker applies on
 * `notificationclick`. Spec: docs/WEB-PUSH.md.
 */

export type PushNotificationKind = 'room' | 'dm';

/**
 * `data` carried inside a push notification. The Service Worker uses it to
 * route clicks to the right chat screen.
 */
export interface PushNotificationData {
  kind: PushNotificationKind;
  roomId?: string;
  conversationId?: string;
  conversationPartnerId?: string;
  timestamp?: string;
}

/** Full payload the backend sends in the push message JSON body. */
export interface PushNotificationPayload {
  /** Notification title (e.g. `💬 alice#1234`). */
  title: string;
  /** Notification body (message preview, system event...). */
  body?: string;
  /** Routing metadata. */
  data?: PushNotificationData;
  /** Dedup tag so repeated events group in the browser. */
  tag?: string;
  /** Optional icon URL (defaults to `/icons/chatti-icon-192.png`). */
  icon?: string;
  /**
   * Absolute-click override: if the payload carries its own `url`, the
   * Service Worker uses it verbatim; otherwise it builds the deep link from
   * `data`.
   */
  url?: string;
}

/** Deep link for the SPA route corresponding to a push notification. */
export const notificationUrlFor = (payload: PushNotificationPayload): string => {
  if (payload.url) return payload.url;
  const data = payload.data;
  if (!data) return '/rooms';
  if (data.kind === 'room' && data.roomId) return `/room/${encodeURIComponent(data.roomId)}`;
  if (data.kind === 'dm' && data.conversationId) {
    return `/dm/${encodeURIComponent(data.conversationId)}`;
  }
  return '/rooms';
};

/**
 * Normalize an untyped push message body into the payload contract. Returns
 * null when the payload has no usable title (the Service Worker must then
 * skip showing a notification).
 */
export const parsePushPayload = (raw: unknown): PushNotificationPayload | null => {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const title = typeof obj.title === 'string' ? obj.title : '';
  if (!title) return null;
  const data = obj.data as Record<string, unknown> | undefined;
  const kind = data?.kind === 'room' ? ('room' as const) : data?.kind === 'dm' ? ('dm' as const) : undefined;
  return {
    title,
    body: typeof obj.body === 'string' ? obj.body : undefined,
    tag: typeof obj.tag === 'string' ? obj.tag : undefined,
    icon: typeof obj.icon === 'string' ? obj.icon : undefined,
    url: typeof obj.url === 'string' ? obj.url : undefined,
    data: kind
      ? {
          kind,
          roomId: typeof data?.roomId === 'string' ? data.roomId : undefined,
          conversationId: typeof data?.conversationId === 'string' ? data.conversationId : undefined,
          conversationPartnerId:
            typeof data?.conversationPartnerId === 'string' ? data.conversationPartnerId : undefined,
          timestamp: typeof data?.timestamp === 'string' ? data.timestamp : undefined,
        }
      : undefined,
  };
};

/** Default icon served alongside notifications (vite copies `public/` as-is). */
export const DEFAULT_NOTIFICATION_ICON = '/icons/chatti-icon-192.png';