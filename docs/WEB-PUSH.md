# Chatti Web — Web Push Notifications (Task 22)

Status: **FE implemented · BE contract defined (Worker change pending in the separate backend repo) · VAPID runbook documented (§5)**

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

## 2. Backend contract (for the separate Cloudflare Worker repo)

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

## 5. VAPID keys — runbook (Staff/BE)

VAPID (RFC 8292) is how the app server proves its identity to the browser push
services (FCM, Safari/APNs, Mozilla). Without it the browser refuses to
subscribe and the push service rejects sends. Because of this, Web Push is
**non-functional until the full keypair + secrets + build key exist** — the
backend degrades gracefully (it registers subscriptions but does not send)
and the Profile UI shows the *"not configured"* state.

### 5.1 What each key is for

| Key | Visibility | Purpose |
|-----|-----------|---------|
| `VAPID_PUBLIC_KEY` | Public (worker + web build) | P-256 public key (65 bytes, uncompressed, base64url). Signs the JWT server-side **and** is what the browser injects at subscribe time |
| `VAPID_PRIVATE_KEY` | Secret — **backend only** | P-256 private scalar (32 bytes, base64url). Signs the `Authorization: vapid t=..., k=...` JWT that FCM validates on every send |
| `VAPID_SUBJECT` | Public | `mailto:` or `https://` URI identifying the operator (goes inside the JWT) |
| `VITE_VAPID_PUBLIC_KEY` | Public (web build env) | Same public key as `VAPID_PUBLIC_KEY`, baked into the web build |

> **Critical:** the public and private keys must be a **single generated pair**,
> and the **same public key** must be used in the worker and the web build.
> If they don't match, the browser receives the push but cannot decrypt it.

### 5.2 Generate the keypair

The repo's backend ships a zero-dependency generator (`backend/src/WebPush.js`,
`generateVapidKeys()`, ECDSA P-256 export public/private as base64url).

```bash
cd backend
node --input-type=module -e "import('./src/WebPush.js').then(async m => console.log(JSON.stringify(await m.generateVapidKeys(), null, 2)))"
```

Output (example):

```json
{
  "publicKey": "BPAeKq…",
  "privateKey": "xZOxu…"
}
```

> Nota: `backend/` está ya en el monorepo, pero `backend/src/WebPush.js`
> todavía no está mergeado en `dev` (va en el PR del backend Web Push). Hasta
> entonces, ejecuta el mismo snippet contra tu copia local del worker legacy
> (`chatti/workers/`) o usa cualquier generador VAPID
> (`npx web-push generate-vapid-keys --json`) — el formato es base64url
> estándar y las funciones aceptan valores de la longitud correcta (65 bytes
> pública / 32 bytes privada) sea cual sea su origen.

Generate the **keys once, keep them privately**, and reuse them across worker
and build. Do not commit them.

### 5.3 Store the secrets in the backend Worker

Set three Worker secrets (values are prompted interactively; never hardcode
them in `wrangler.toml`):

```bash
cd backend
wrangler secret put VAPID_SUBJECT       # value: mailto:admin@chatti.app (mailto:/https: obligatorio)
wrangler secret put VAPID_PUBLIC_KEY    # value: publicKey from §5.2
wrangler secret put VAPID_PRIVATE_KEY   # value: privateKey from §5.2
```

Local dev (`wrangler dev`) reads them from `backend/.dev.vars` instead:

```
VAPID_SUBJECT=mailto:admin@chatti.app
VAPID_PUBLIC_KEY=BPAeKq…
VAPID_PRIVATE_KEY=xZOxu…
```

### 5.4 Publish the public key to the web build

```bash
cd web
echo 'VITE_VAPID_PUBLIC_KEY=BPAeKq…' >> .env.local
```

`.env.local` is git-ignored; `.env.example` documents the variable. Without it
the Profile UI shows the *"not configured"* state.

> **Cloudflare deploy build:** Cloudflare Workers Builds clones the repo and
> runs `pnpm run build` (Vite, mode=production) — `.env.local` **no existe** ahí.
> Vite solo lee ficheros `.env*` del repo, no variables de entorno del shell, así
> que la clave pública debe commitearse en `web/.env.production` (el valor es
> público por diseño; es la misma clave que va en el worker). Si un día se
> quisiera dejar de commitear, habría que inyectar la var en el trigger y cargarla
> con `loadEnv` en `vite.config.ts`.

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

1. Implement `POST /api/auth/webpush` (register/remove) storing the subscription
   under `user:<userId>:webpush:<deviceId>` in KV.
2. Generate VAPID keypair as Worker secret; expose the public key for the build.
   → **Procedimiento completo en §5** (generación, secrets, `VITE_VAPID_PUBLIC_KEY`).
3. Hook room events (and DM events, opaque body) to push recipients.
4. Keep mobile (`expoPushToken` path) untouched — mobile regression must stay
   green.