# Chatti Web — Web Push Notifications (Task 22)

Status: **FE + BE en producción (PR #27, `master` `a6381f9`) · secrets VAPID aplicados en prod (DevOps 2026-09-20) · verificado QA live (§7 de `QA-PR27-TASK22.md`) — pendiente QA de entrega en navegador real + sign-off CTO/Staff**

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

## 2. Backend contract (merged in `backend/`, monorepo)

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

> **Seguridad (P2 QA 2026-09-21):** el endpoint no autentica al llamante — confía
> en el `userId`/`deviceId` aportados por el cliente (cualquiera puede
> registrar/borrar suscripciones ajenas). Es **consistente con el modelo actual
> del backend** (auth device-based sin sesión stateful, `userId` como parámetro en
> `/api/auth/update-push-token`), por lo que se acepta **by design**. Si en el
> futuro se introduce una sesión/cookie autenticada en el web, este endpoint debe
> validar que `userId === session.userId`. El riesgo práctico es bajo (un atacante
> con un `userId` ajeno puede suscribir su propio navegador a las push de la
> víctima o borrarlas, pero no lee contenido de chats).

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

> Nota: `backend/src/WebPush.js` ya está mergeado en `dev` (PR #33, monorepo).
> El snippet de arriba funciona directamente desde el repo.

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

> **Estado 2026-09-20:** los tres secrets están **aplicados en el worker de
> producción** `chatti-workers` — versión live `1e93cd9e` over master `a6381f9`
> (deployment `93a64718`, build `23d2103f`, 2026-09-20T17:12Z). `VAPID_SUBJECT` es
> `mailto:contact@mohsine.com` y `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` son el par
> emparejado con `VITE_VAPID_PUBLIC_KEY` de `web/.env.production`. `backend/.dev.vars`
> creado localmente (git-ignored). Pendiente solo QA end-to-end (§8.2).

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

> **Estado 2026-09-20:** `web/.env.production` ya contiene el `VITE_VAPID_PUBLIC_KEY`
> válido (commit `f6097a8`, mergeado a `master` vía PR #27). Los secrets del worker
> `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` están **emparejados** con esa misma clave
> pública (verificación live QA 2026-09-21).

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

1. ~~Implement `POST /api/auth/webpush` (register/remove) storing the subscription
   under `user:<userId>:webpush:<deviceId>` in KV.~~ **DONE** en `backend/`.
2. Generate VAPID keypair as Worker secret; expose the public key for the build.
   → **Procedimiento completo en §5** (generación, secrets, `VITE_VAPID_PUBLIC_KEY`).
3. ~~Hook room events (and DM events, opaque body) to push recipients.~~ **DONE**.
4. ~~Keep mobile (`expoPushToken` path) untouched~~ **DONE** (camino Expo intacto;
   `update-push-token` que también faltaba quedó implementado).

Pendientes para cerrar Task 22 (DoD):
1. **Staff/infra**: generar keypair VAPID y fijar los secrets del worker real
   (`VAPID_SUBJECT`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, ver §5); publicar
   `VITE_VAPID_PUBLIC_KEY` en el build web.
2. **QA end-to-end**: navegador → suscripción → mensaje en sala/DM → notificación
   → click deep-link. Evidencia en `docs/QA-PR27-TASK22.md` o similar.
3. **Sign-off** CTO/Staff antes de marcar DONE.