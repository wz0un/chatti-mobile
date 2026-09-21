# QA Verdict — PR #27 promote Task 22 Web Push to master

**QA Agent:** Senior QA (sesión 2026-09-19) + follow-up QA prod (sesión 2026-09-21, §7)
**PR:** [#27](https://github.com/wz0un/chatti-mobile/pull/27) — `dev` (`f8a876a`) → `master` (`14a6bef`); mergeado por Staff (`master` `a6381f9`, 2026-09-20)
**PRs complementarios (mergeados):** #33 (backend WebPush), #37 (runbook VAPID), #38 (CI backend GHA), #40/#41 (pnpm11 + sync master→dev)
**Scope:** Task 22 Web Push (FE): Service Worker + VAPID helper + `/api/auth/webpush` contract + Profile toggle + tests + docs (20 archivos, +1218/−6)
**Authoritative docs:** `docs/WEB-PUSH.md`, `docs/WEB-TASKS.md`, `docs/WEB-PARITY.md`

---

## Veredicto resumido

| Área | Resultado |
|------|-----------|
| Código / estática | ✅ **PASS** |
| Merge safety (móvil) | ✅ **PASS** — no se toca `App.js`/`src/`/`package.json`; SDK 57 conservado |
| Merge simulado en config CI | ✅ **PASS** — build + 109/109 tests sobre el árbol fusionado |
| Check de producción (Workers Builds) | ✅ **RESUELTO por DevOps** (2026-09-19) — ver §4 |
| Función end-to-end | ✅ **OPERATIVA EN PROD** (2026-09-21) — endpoint `/api/auth/webpush` + VAPID live (ver §7); pendiente solo QA manual de entrega en navegador real |

Conclusión QA: **código aprobado para promoción**, mergeado a `master` (`a6381f9`). Bloqueo 1 (pipeline) resuelto por DevOps; bloqueo 2 (backend + VAPID) **resuelto y verificado live en prod** (2026-09-21, §7). La task 22 **NO puede marcarse 100% DONE** hasta el sign-off de entrega manual en navegador real (este entorno de QA no puede recibir push) + CTO/Staff.

---

## 1. Gates técnicos (head `f8a876a`, clone limpio)

| Gate | Resultado |
|------|-----------|
| `pnpm run typecheck` (tsc `-b`, strict) | ✅ PASS |
| `pnpm run lint` (eslint) | ✅ PASS |
| `pnpm run build` (`tsc -b && vite build`) | ✅ PASS — 77 módulos, `assets/index-*.js` 353.39 kB / 108.92 kB gzip; `sw.js` + `icons/chatti-icon-192.png` copiados a `dist/` |
| `pnpm test` (unit) | ✅ **109/109** (8 files) — incluye `webPush.test.ts`, `web/src/lib/webPush.test.ts`, `ApiService.test.ts` |
| `pnpm run smoke` (live backend) | ✅ 4/4 |
| Probes de regresión (`reconnect.vitest.config.ts`) | ✅ 2/2 (BUG-02 sigue resuelto) |
| Interop cripto web⇄mobile (`interop.vitest.config.ts`) | ✅ 5/5 |
| i18n claves `profile.webPush.*` | ✅ 11/11 × 4 idiomas (en/es/ar/fr) — `getNested` resuelve todas; sin claves huérfanas |
| CSP (`web/public/_headers`) | ✅ `worker-src 'self'` añadido; `connect-src` correcto |
| Rutas deep-link usadas por `sw.js` | ✅ `room/:roomId` y `dm/:conversationId` existen en `src/app/App.tsx` |

## 2. Merge safety

- `git merge-tree origin/master origin/dev` → merge limpio, sin conflictos.
- Árbol fusionado: `expo ~57.0.19`, `react-native 0.86.3` (**SDK 57 de master conservado**, no hay downgrade; `package.json` no cambia porque dev no lo tocó vs. el merge-base).
- Cero cambios en `App.js`, `index.js`, `app.json`, `eas.json`, `src/`.
- Simulación en worktree (`origin/master` + `git merge origin/dev`): `pnpm run build` OK y `pnpm test` **109/109** con la config que usa CI.

## 3. Revisión funcional de código

- `shared/notifications/webPush.ts` — schema + `parsePushPayload` + `notificationUrlFor`: tipado estricto, saneado de tipos en runtime (string-only), fallback `/rooms`. ✅
- `web/src/lib/webPush.ts` — permisos → suscripción VAPID → registro backend; manejos desacoplados (resultado union, sin throws de UI); base64url→Uint8Array correcto (VAPID sin padding). ✅
- `web/public/sw.js` — `skipWaiting`/`claim`; `push` ignora payload sin `title`; `notificationclick` reutiliza/focaliza ventanas; deep-link a SPA. URLs no-`http(s)` rechazadas por `openWindow`/`navigate` (sin vector `javascript:`). ✅
- `shared/api/ApiService.ts` `registerWebPush`/`removeWebPush` — payload según contract; error `{error?}` extraído y propagado. ✅
- `ProfilePage.tsx` — toggle + estados (loading/on/off/blocked/unsupported); refleja errores localizados. ⚠️ **UX menor:** con permiso denegado el badge muestra "On" (`webPushState === 'blocked'` entra en `statusEnabled`); sugerido mostrar "Off/Blocked".

## 4. Pipeline de producción (bloqueo 1 — RESUELTO por DevOps)

Diagnóstico QA sobre check `Workers Builds: chatti-web` (todos los builds fallaban en ~2 s en cualquier rama; último deploy real 11-ago):

- **Causa raíz:** `web/pnpm-workspace.yaml` roto + `tsconfig.json` raíz con `extends: expo/tsconfig.base` no resoluble en el entorno de build de Cloudflare.
- **Fix (en `master`):** `756780b` (elimina pnpm-workspace.yaml) + `f7c896f` (inlina expo tsconfig.base en `tsconfig.json`).
- **Evidencia:** build `51b03b57` **SUCCESS** en `master` `f7c896f` (`npx wrangler deploy`, 2026-09-19 21:03).
- **Nota:** el deploy de `f7c896f` aún NO incluye Task 22 (el código de web push vive en `dev`); llega a producción con el merge de PR #27.

## 5. Bloqueo 2 — feature NO operativa end-to-end (pendiente BE/Staff)

Probado live 2026-09-19 contra `chatti-workers.wz0un.workers.dev`:

- `POST /api/auth/webpush` → **HTTP 200 con el JSON raíz de la app** (endpoint inexistente; cae al índice). `registerWebPush` recibirá `success !== true` → `register-error` → toggle muestra "Could not update push notifications".
- `VITE_VAPID_PUBLIC_KEY` sin valor en el build → estado "not configured".
- Conclusión: el FE degrada con gracia (sin crash), pero la feature solo será usable cuando el Worker implemente el endpoint + VAPID + envío (contract en `docs/WEB-PUSH.md` §2). Apta para promoción del código; **no para declarar Task 22 DONE**.

## 6. Recomendación final

1. ✅ **HECHO:** merge de PR #27 a `master` (`a6381f9`, 2026-09-20) — pipeline verde, sin regresión móvil (SDK 57 conservado).
2. ✅ **HECHO:** sync `master`→`dev` (PR #41) y fixes de CI en `dev` (tsconfig inline + pnpm-workspace fixes, PRs #40).
3. ✅ **HECHO:** backend `POST /api/auth/webpush` + keypair VAPID desarrollados (PR #33/#37) y **desplegados en prod** con secrets VAPID configurados (verificado live, §7).
4. ⏳ **Pendiente:** QA manual de entrega en navegador real (Chrome/Firefox) — este entorno no puede recibir push (ver §7.2).
5. ⏳ **Pendiente (DoD):** sign-off QA funcional final + CTO/Staff para marcar Task 22 **DONE**.

## 7. Follow-up QA — Bloqueo 2 RESUELTO EN PROD (sesión 2026-09-21)

### 7.1 Evidencia live contra producción

`chatti-workers.wz0un.workers.dev` (2026-09-21):

| Prueba | Resultado |
|--------|-----------|
| `GET /health` | ✅ `{"status":"ok",...,"version":"2.2.0"}` |
| `POST /api/auth/webpush` register (subscription válida) | ✅ `{"success":true}` HTTP 200 |
| Register repetido (refresh/upsert) | ✅ `{"success":true}` |
| Register sin `subscription` | ✅ 400 con error contract |
| Register con endpoint `http://` | ✅ 400 "endpoint debe ser una URL https:// válida" |
| Register con JSON malformado | ✅ 500 controlado (sin crash) |
| `remove` | ✅ `{"success":true}` |

Verificación del build web en prod (`chatti-web`):

- Bundle desplegado contiene `VITE_VAPID_PUBLIC_KEY` horneada (`"BIsiZZb..."`, 65-byte P-256) + `applicationServerKey`/`vapid`/`webpush` → Task 22 FE en producción.
- `/sw.js` servido (HTTP 200) = SW de Task 22 activo.
- Navegador real (Chrome headless) acepta el formato de la VAPID public key (el `subscribe` llega al push service; no falla en el parseo de la clave).
- Edo. front: usuario QA registrado/autenticado en prod; `Profile` muestra sección Push Notifications con toggle y estados correctos.

### 7.2 Límite del entorno de QA (NO resuelto en esta sesión)

El `subscribe()` del navegador de prueba lanzó **`AbortError: Registration failed - push service not available`**: el entorno sandbox no tiene conectividad/backing del push service (FCM/Mozilla). La suscripción no llegó a crearse, por lo que **no se pudo validar la entrega real** (envío worker → push service → SW → `showNotification`).

**Verificación manual requerida (1–2 min, Chrome/Firefox de escritorio):**
1. Abrir `https://chatti-web.wz0un.workers.dev`, registrarse/loguearse como usuario A.
2. Profile → Push Notifications → **Enable notifications** (aceptar el permiso del navegador). El badge debe pasar a "On".
3. En otra pestaña/incógnito, usuario B envía un **DM o mensaje de sala** dirigido/alcanzable por A, con A **sin** conexión activa a esa conversación.
4. Esperar ~5 s: debe aparecer la notificación del SO con título `💬 <usuario>` (room) o `🔒 <usuario>` (DM, cuerpo opaco) y al hacer click debe navegar al chat correcto (`/room/:id` o `/dm/:id`).
5. Verificar el caso negativo: con permiso denegado, el toggle debe mostrar el estado bloqueado (bug UX menor del badge "On" documentado en §3).

### 7.3 Hallazgos QA (no bloquean el deploy; P1/P2 a considerar por CTO/Staff)

1. **P1 — `ChatRoom.js:487` (escala):** el fan-out de rooms usa `ROOMS_KV.list({ prefix: 'user:', limit: 1000 })` y filtra por regex las claves `user:*:webpush:*`. **Sin paginación**: con >1000 claves `user:` (user:id + user:device + webpush) las suscripciones de la página 2+ dejan de recibir avisos de sala en silencio. Además es O(todos los usuarios) por mensaje y **notifica a todos los usuarios con suscripción** (no solo miembros de la sala). El path de DM sí está bien acotado (`listWebPushSubscriptions` por usuario). Propuesta: prefijo dedicado `webpush:<uid>` + loop con `cursor`, o índice `room:<id>:members`.
   - **Resuelto (PR #44):** paginación con `cursor` via `listKeysPaginated()` (`backend/src/WebPush.js`), aplicada al fan-out de rooms y también a `listWebPushSubscriptions`/`deleteWebPushSubscriptions` (mismo bug latente). Tests unitarios añadidos (mock KV multi-página). *La acotación por-membresía de sala (índice `room:<id>:members`) queda fuera de este fix — requiere un modelo de datos nuevo; sigue siendo mejora futura.*
2. **P2 — endpoint sin autenticación:** `/api/auth/webpush` acepta `userId`/`deviceId` aportados por el cliente (cualquiera puede registrar/borrar suscripciones ajenas). Consistente con el modelo actual (registro sin sesión stateful) — **confirmado como aceptado by design** (nota de seguridad documentada en `docs/WEB-PUSH.md` §2.1).
3. **P3 (UX, ya documentado §3):** badge "On" cuando el permiso está bloqueado (`webPushState === 'blocked'`) — mostrar "Off/Blocked".
   - **Resuelto (PR #44):** badge ahora muestra **"Blocked"/"Bloqueadas"/etc.** (nueva clave i18n `profile.webPush.statusBlocked` en en/es/ar/fr) para el estado `blocked`; test de paridad i18n añadido.
4. ✅ **Resuelto:** CI del backend (antes inexistente) — workflow `.github/workflows/backend.yml` mergeado vía PR #38; runs "Backend Tests" en `dev` **verdes** (Node 22 + vitest 20/20).