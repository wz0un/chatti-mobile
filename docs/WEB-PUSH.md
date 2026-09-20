# Chatti Web — Web Push Notifications (Task 22)

Status: **FE implemented · BE implemented in `backend/` (monorepo) — pending VAPID secrets, deploy y QA end-to-end**

Task: `docs/WEB-TASKS.md` #22 — *Web Push notifications: Service Worker + VAPID + backend endpoint* — Owner: **BE + FE**.

---

## 1. What shipped in this repo (FE side)

| Piece | Location | Notes |
|-------|----------|-------|
| Push payload schema + deep-link routing | `shared/notifications/webPush.ts` | Single contract the Service Worker and the app agree on |
| Notification click routing | `web/public/sw.js` | Deep-links room/DM notifications to `/room/:id` or `/dm/:id` |
| Browser Web Push helper | `web/src/lib/webPush.ts` | permission → subscribe (VAPID) → backend registration |
| Profile UI toggle | `web/src/features/profile/ProfilePage.tsx` | Enable/disable card with status + localized errors |
| Backend client methods | `shared/api/ApiService.ts` (`registerWebPush` / `removeWebPush`) | `POST /api/auth/webpush` |
| CSP | `web/public/_headers` | `worker-src 'self'` added |
| Build config | `web/.env.example` | `VITE_VAPID_PUBLIC_KEY` documented |

No mobile file (`App.js`, `src/`, `index.js`, `app.json`, `eas.json`) was touched.

## 1b. What shipped on the backend side (`backend/`, Task 22 BE)

| Piece | Location | Notes |
|-------|----------|-------|
| VAPID + cifrado aes128gcm zero-dep | `backend/src/WebPush.js` | RFC 8188/8291/8292 sobre WebCrypto, fijado byte-a-byte al vector del RFC 8291 |
| Endpoint `POST /api/auth/webpush` | `backend/src/index.js` | register/remove, validación de subscription, KV `user:<userId>:webpush:<deviceId>` |
| Endpoint `POST /api/auth/update-push-token` | `backend/src/index.js` | Contrato móvil pendiente que también faltaba (AuthService.js) |
| Purga al enviar `404/410 Gone` | `backend/src/ChatRoom.js` / `DirectMessage.js` | Auto-limpieza de suscripciones muertas |
| Hook salas (room) | `backend/src/ChatRoom.js` | Fan-out web push a no conectados, deep link `/room/:id` |
| Hook DMs (opaco) | `backend/src/DirectMessage.js` | Solo "🔒 <sender>/New encrypted message", deep link `/dm/:id` |
| Purga al borrar cuenta | `backend/src/index.js` (`deleteUser`) | Elimina todas las suscripciones del usuario |
| Tests | `backend/src/WebPush.test.js`, `index.test.js` | Known-answer RFC 8291 + round-trip + endpoints |

> Nota: la crypto de `WebPush.js` está probada contra el vector del RFC 8291
> (ciphertext idéntico byte a byte). Reto pendiente de infra: generar el keypair
> VAPID y fijar los secrets del worker (ver §5).

## 2. Backend contract (implemented in `backend/`)

### 2.1 Endpoint — `POST /api/auth/webpush`

Device/auth model parity: no tokens, `userId` is the auth handle, exactly like
`/api/auth/update-push-token` (mobile contract).

Register a subscription (`action: 'register'`):

```json
{
  "userId": "…",
  "deviceId": "device_…",
  "action": "register",
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/fcm/send/…",
    "expirationTime": null,
    "keys": { "p256dh": "…", "auth": "…" }
  }
}
```

Remove a subscription (`action: 'remove'` — sent when the user disables push or
when `unsubscribe()` succeeds on the browser):

```json
{
  "userId": "…",
  "deviceId": "device_…",
  "action": "remove",
  "endpoint": "https://fcm.googleapis.com/fcm/send/…"
}
```

Responses:

```json
{ "success": true }
{ "success": false, "error": "reason string" }
```

Non-OK HTTP → the web app surfaces the error string in the Profile UI.

Types live in `shared/api/contracts.ts` (`WebPushSubscription`, `WebPushAction`,
`WebPushRegisterPayload`, `WebPushRemovePayload`, `WebPushResponse`).

### 2.2 Sending notifications (Worker)

When a room/DM message is persisted and the recipient is not the sender, the
Worker should look up the recipient's stored Web Push subscriptions and push to
each endpoint **encrypted with VAPID** using the standard Web Push protocol
(`POST` to `endpoint`, `Content-Encoding: aes128gcm` or `aesgcm`, `TTL` header
≥ 60s, `VAPID` JWT signed with the application server key).

The message body must follow the payload schema below.

## 3. Push payload schema (BE → Service Worker)

Defined in `shared/notifications/webPush.ts`:

```ts
interface PushNotificationPayload {
  title: string;        // e.g. "💬 alice#1234" or "🔒 bob"
  body?: string;        // message preview / system event text
  data?: {
    kind: 'room' | 'dm';
    roomId?: string;         // set when kind === 'room'
    conversationId?: string; // set when kind === 'dm'
    conversationPartnerId?: string;
    timestamp?: string;
  };
  tag?: string;         // dedup key (browser groups same-tag notifications)
  icon?: string;        // default /icons/chatti-icon-192.png
  url?: string;         // optional absolute-click override (deep link)
}
```

Mapping applied on click (both in `sw.js` and `notificationUrlFor`):

| Payload | Target URL |
|---------|-----------|
| `data.kind === 'room'`, `roomId = r1` | `/room/r1` |
| `data.kind === 'dm'`, `conversationId = dm_x_v2` | `/dm/dm_x_v2` |
| `url` set | used verbatim |
| anything else | `/rooms` |

The backend **cannot compose message bodies for encrypted DMs** (it can't
decrypt) — it should send an opaque preview like *"New encrypted message"* with
the `conversationId`, mirroring the mobile `notifyEncryptedMessage` behavior.
Room messages are plaintext, so the body can carry the message text (max ~50
chars preview, mobile parity).

## 4. Service Worker (`web/public/sw.js`)

Classic worker copied verbatim to `dist/` by Vite and registered at `/sw.js`
(`script-src 'self'` + `worker-src 'self'` CSP allow it).

- `install` → `skipWaiting()` · `activate` → `clients.claim()`.
- `push` → `parsePushPayload(event.data.json())` → `showNotification(title, {body, icon, badge, tag, data:{url}})`.
  Invalid payloads without a `title` are ignored.
- `notificationclick` → focus a window already on the target URL, else reuse an
  open app window and `navigate()`, else `openWindow()`.
- `message` → ping/pong handshake (`{type:'ping'}` → `{type:'pong'}`) for
  tooling/tests.

## 5. VAPID keys

- The **public key** must be injected at build time:
  `VITE_VAPID_PUBLIC_KEY` (base64url, no padding). `web/.env.example`
  documents it. Without it the Profile UI shows the *"not configured"* state.
- The **private key** stays in the backend Worker (secret) and signs the VAPID
  JWT; the matching public key is what ships in the web build.
- Backend secrets a fijar por Staff/infra (mismo estilo que los secrets ya
  usados en el worker):

  ```bash
  cd backend
  wrangler secret put VAPID_SUBJECT      # mailto:admin@domain.com (mailto:/https: obligatorio)
  wrangler secret put VAPID_PUBLIC_KEY   # base64url P-256 pública (65 bytes)
  wrangler secret put VAPID_PRIVATE_KEY  # base64url P-256 privada (escalar 32 bytes)
  ```

- Generación del keypair:

  ```bash
  pnpm --dir backend exec node -e "import('./src/WebPush.js').then(async m => console.log(JSON.stringify(await m.generateVapidKeys(), null, 2)))"
  ```

- Sin secrets configurados, el worker degrada controladamente (registra
  suscripciones pero no envía) — comportamiento documentado en
  `backend/README.md`.

## 6. Browser behavior notes

- Web Push requires a **secure context** (https) except on `localhost`.
  `VITE_API_URL` is unrelated; the *page origin* must be https for `PushManager`
  to exist.
- `Notification.permission === 'denied'` cannot be re-prompted; the Profile UI
  shows an explanatory message instead of a dead toggle.
- Multi-tab: one subscription per browser profile is enough; the SW reuses/opens
  an existing window on click.

## 7. Unit & regression coverage

- `shared/api/ApiService.test.ts` — register/remove payloads + error paths.
- `shared/notifications/webPush.test.ts` — payload parse + click routing.
- `web/src/lib/webPush.test.ts` — browser API wrapper (stubbed globals):
  support detection, subscribe/refresh, permission-denied, VAPID-missing,
  backend rejection, unsubscribe/remove flows.
- Run: `npm test` (109 tests), `npm run typecheck`, `npm run lint`,
  `npm run build` from `web/`.

## 8. Remaining backend work (Worker repo)

~~1. Implement `POST /api/auth/webpush` (register/remove) storing the subscription
   under `user:<userId>:webpush:<deviceId>` in KV.~~ **DONE** en `backend/`.
~~2. Generate VAPID keypair as Worker secret; expose the public key for the build.~~
   Pendiente solo de infra (fijar secrets, ver §5).
~~3. Hook room events (and DM events, opaque body) to push recipients.~~ **DONE**.
~~4. Keep mobile (`expoPushToken` path) untouched — mobile regression must stay
   green.~~ **DONE** (el camino Expo push se mantiene intacto; `update-push-token`
   que también faltaba quedó implementado).

Pendientes para cerrar Task 22 (DoD):
1. **Staff/infra**: generar keypair VAPID y fijar los secrets
   `VAPID_SUBJECT`/`VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` en el entorno real;
   publicar `VITE_VAPID_PUBLIC_KEY` en el build web.
2. **QA end-to-end**: navegador → suscripción → mensaje en sala/DM → notificación
   → click deep-link. Evidencia en `docs/QA-PR27-TASK22.md` o similar.
3. **Sign-off** CTO/Staff antes de marcar DONE.