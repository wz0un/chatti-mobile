/*
 * Chatti Web Push Service Worker — Task 22.
 *
 * Classic (non-module) service worker served from /sw.js. Responsibilities:
 *   - lifecycle: skipWaiting + clients.claim so updates roll out fast
 *   - push: render the notification described by the backend payload
 *   - notificationclick: route to the matching chat screen (deep link)
 *   - message: ping/ready handshake (used by dev tools / test helpers)
 *
 * Payload contract (BE -> SW) is defined in docs/WEB-PUSH.md and mirrored in
 * shared/notifications/webPush.ts. The URL mapping below must stay in sync
 * with `notificationUrlFor` in that module.
 */

const DEFAULT_ICON = '/icons/chatti-icon-192.png';
const FALLBACK_PATH = '/rooms';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

function parsePushPayload(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const title = typeof raw.title === 'string' ? raw.title : '';
  if (!title) return null;
  const data = raw.data;
  const kind = data && (data.kind === 'room' || data.kind === 'dm') ? data.kind : null;
  const parsedData = kind
    ? {
        kind,
        roomId: typeof data.roomId === 'string' ? data.roomId : undefined,
        conversationId: typeof data.conversationId === 'string' ? data.conversationId : undefined,
      }
    : undefined;
  return {
    title,
    body: typeof raw.body === 'string' ? raw.body : undefined,
    tag: typeof raw.tag === 'string' ? raw.tag : undefined,
    icon: typeof raw.icon === 'string' ? raw.icon : undefined,
    url: typeof raw.url === 'string' ? raw.url : undefined,
    data: parsedData,
  };
}

function notificationUrlFor(payload) {
  if (payload.url) return payload.url;
  const data = payload.data;
  if (!data) return FALLBACK_PATH;
  if (data.kind === 'room' && data.roomId) return `/room/${encodeURIComponent(data.roomId)}`;
  if (data.kind === 'dm' && data.conversationId) {
    return `/dm/${encodeURIComponent(data.conversationId)}`;
  }
  return FALLBACK_PATH;
}

self.addEventListener('push', (event) => {
  let payload = null;
  try {
    payload = event.data ? event.data.json() : null;
  } catch (err) {
    console.error('[sw] bad push payload:', err);
  }

  const parsed = parsePushPayload(payload);
  if (!parsed) return;

  event.waitUntil(
    self.registration.showNotification(parsed.title, {
      body: parsed.body,
      icon: parsed.icon || DEFAULT_ICON,
      badge: DEFAULT_ICON,
      tag: parsed.tag,
      data: { url: notificationUrlFor(parsed), payload: parsed },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetRaw = event.notification.data && event.notification.data.url;
  const target = new URL(targetRaw || FALLBACK_PATH, self.registration.scope);

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clientList) {
        if (client.url === target.href) {
          await client.focus();
          return;
        }
      }
      // Reuse any open window of the app instead of stacking tabs.
      const appWindow = clientList.find((client) => new URL(client.url).origin === target.origin);
      if (appWindow) {
        await appWindow.focus();
        await appWindow.navigate(target.href);
        return;
      }
      await self.clients.openWindow(target.href);
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'ping' && event.source) {
    event.source.postMessage({ type: 'pong', version: 'sw-1' });
  }
});