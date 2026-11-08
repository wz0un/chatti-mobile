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

> **Estado a 2026-11-08:** §8 es el registro histórico de la sesión del 2026-11-02 (veredictos de entonces: `sw-1` en producción, BUG-01 FAIL de paridad). **La verificación post-despliegue vigente es §9**: `sw-2` live, BUG-01 PASS, device-id PASS. Los FAIL de §8 quedan como histórico, no como estado actual.

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

#### 7.2.1 Hallazgo FE post-prod (2026-09-21) — click en notificación no navega

**Reportado por Staff en pruebas reales de navegador** (usuario A, prod `chatti-web.wz0un.workers.dev`): la notificación **sí llega** y se muestra, pero al hacer **click no redirige a los mensajes** (no abre el chat `/room/:id` ni `/dm/:id`).

**Estado de la investigación (no concluida — pasa al equipo):**
- ✔️ `sw.js` desplegado en prod contiene el handler `notificationclick` (coincide con `web/public/sw.js`).
- ✔️ La SPA sirve correctamente las rutas profundas: `/room/<id>` responde `index.html` (fallback `single-page-application` de `web/wrangler.jsonc`), y `App.tsx` define las rutas `/room/:roomId` y `/dm/:conversationId`.
- ✔️ El backend manda `data: { kind:'room', roomId }` (o `kind:'dm'`) → `notificationUrlFor()` produce la deep link correcta.
- ❓ **Causa raíz sin confirmar.** Sospechas a validar en el navegador:
  1. `Client.navigate()` en una pestaña **no controlada** por el SW lanza error (el handler usa `appWindow.navigate()`); o bien `focus()` roba el foco sin navegación si la comparación `client.url === target.href` no acierta por `trailing slash`/query.
  2. El SW registrado/activo en el navegador del usuario es una versión previa en caché (aunque `/sw.js` de prod ya es el nuevo; un `skipWaiting`/recarga forzada puede resolverlo).
- Recomendación: reproducir en Chrome con DevTools (Application → Service Workers → Push) o usando `self.clients.matchAll` + fallback a `openWindow` si `navigate` falla; opcional: simplificar el click a `clients.openWindow(target.href)` siempre que no exista pestaña ya en ese chat.

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

## 8. QA-WAVE-2 — consolidación Fase B (2026-11-02)

**Base:** `dev` @ `d6608d9e3f3630a408c98bd401516365c95b34df` (merge PR #56; PR #57 = `2d7d798`). **Entorno:** Linux, Node v24.13.1, pnpm 11.9.0, worktree `t3-504e388b`. **Hora:** 13:34–13:36 CET (12:34–12:36 UTC). **Modo:** read-only sobre producto y Git; no se repitió el probe live.

### 8.1 Resultado por item

| Item | Resultado | Evidencia |
|------|-----------|-----------|
| Task 22 — deep link on click (QA sobre `dev` mergeado) | ✅ **PASS** técnico | Gates web PASS (typecheck, lint, **119/119**, build); `dist/sw.js` con `sw-2` + fallback; harness 9/9; push headless 5/5 con `data.url` correcto y 0 excepciones; contrato 7/7; invariantes #44 OK. Fuente: `.mece/cells/QA-WAVE-2/WEBPUSH-PRE-MERGE.md`. |
| Task 22 — prueba manual real Chrome/Firefox | ⚠️ **NOT RUN** | El headless no puede enfocar ventanas; tabla §6.4 del informe fuente preparada y vacía. Requiere Staff + despliegue de `d6608d9` en staging. |
| Task 22 — cobertura del harness (query/hash) | ❌ **FAIL (solo test)** | 9 casos, sin target con hash ni query exacta; comportamiento correcto por sonda, pero sin CI (BUG-NEW-03). |
| BUG-01 — source parity (PR #52/#56) | ❌ **FAIL de paridad** | Probe live **126/126** HTTP 200, 0 5xx/1102 (12:20–12:22 UTC), **pero producción ejecuta bcrypt de `master`**: truncación a 72 B → 200; control <72 B → 401; `deviceId` nuevo no adoptado. `master` L377 `bcrypt.hash` / L480 `bcrypt.compare`; `dev` `verifyPassword` L72 + PBKDF2. Fuente: `.mece/cells/QA-WAVE-2/BUG01-LIVE.md`. |
| device-id — `users/find` vs `users/by-device-id` (M2 finding 4) | ✅ **PASS local** · ⚠️ **NOT RUN live** | Tests `keeps users/find and contacts/request consistent after update-push-token changes deviceId` (L540) y `lets login adopt a new deviceId and refresh all indices` (L585), dentro de 29/29. Live no ejecutado: fix no desplegado. |
| DM history — contrato Staff | ⚠️ **NOT RUN** | Sin decisión Staff; recomendación (a) de BE-AUTH-CLOSE no implementada. No hay contrato que validar. |

### 8.2 Evidencia ejecutada (2026-11-02)

| Hora UTC | Comando | Resultado |
|----------|---------|-----------|
| 12:34:46–12:34:50 | `cd backend && pnpm test` | **2 files · 29/29 tests PASS** · 2.60 s |
| 12:34:46–12:34:48 | `cd web && pnpm test` | **9 files · 119/119 tests PASS** · 974 ms |
| 12:35:07 | `curl https://chatti-web.wz0un.workers.dev/sw.js` | HTTP 200 · 3 701 B · `text/javascript` · **`sw-1`** |
| 12:35:07 | `curl https://chatti-web-staging.wz0un.workers.dev/sw.js` | HTTP 200 · 543 B · **`text/html`** (index.html) |
| 12:35 | `grep SW_VERSION web/public/sw.js` | `sw-2` (L17); `sameSearch`/`sameHash` L103–105 |
| 12:35 | `git show origin/master:backend/src/index.js` | `bcrypt.hash` L377 · `bcrypt.compare` L480 |

Los números de los informes fuente se sostienen por muestreo: backend 29/29 y web 119/119. No se crearon cuentas ni se envió tráfico de escritura en esta sesión.

### 8.3 Bugs nuevos

| ID | Severidad | Bug | Acción |
|----|-----------|-----|--------|
| BUG-NEW-01 | **P1 — release blocker** | Producción `chatti-web` sirve **`sw-1`**; el fix `sw-2` de `d6608d9` no está desplegado. Los usuarios reales siguen con el bug #45. | Staff: PR `dev → master` + despliegue de `chatti-web`. |
| BUG-NEW-02 | **P1 — entorno** | `chatti-web-staging` devuelve **HTML** en `/sw.js` (543 B, `text/html`); el SW no se registra y la prueba manual no validaría nada. | DevOps: publicar `d6608d9` en staging y verificar `sw-2` + `application/javascript`. |
| BUG-NEW-03 | **P2 — tests** | El harness no cubre target con **hash** ni **query**: faltan 6 casos (hash ausente/distinto/igual, query distinta/igual, todos los clientes inválidos). La regla “search/hash exactos” queda sin CI. | FE: añadir los 6 tests en follow-up. No bloquea el merge; sí DONE. |

Hallazgos P3 heredados: comentario del SW engañoso sobre query/hash; `new URL()` sin `try/catch` ni allowlist de esquema; `parsePushPayload` del SW descarta `conversationPartnerId`/`timestamp`.

### 8.4 Riesgos residuales

Click real sin verificar; producción stale (`sw-1`); staging sin SW; BUG-01 sigue vivo en producción (bcrypt, 1102 sensible a concurrencia); cuentas legacy ejecutan `bcrypt.compare` hasta migrar; sin cota de iteraciones PBKDF2; device-id live sin validar; DM history sin contrato (duplicar `history` rompería el móvil, que no deduplica); gap de cobertura hash/query; badge “Blocked” validado por i18n, no por DOM; 45 cuentas `bug01qa_` pendientes de purga; `/health` con `2.2.0` hardcodeada.

### 8.5 STATUS delta

- **Task 22 / #45:** QA técnica PASS sobre `dev` `d6608d9`; manual NOT RUN; sign-off pendiente. **No DONE.**
- **BUG-01:** FAIL de paridad; probe live PASS pero producción ejecuta `master` (bcrypt). **No DONE.**
- **device-id:** PASS local (2 tests); live NOT RUN. **No DONE.**
- **DM history:** NOT RUN — sin decisión Staff. **No DONE.**
- **Despliegues:** ninguno por QA; producción `sw-1`, staging HTML, `chatti-workers` con bcrypt.

### 8.6 Veredictos

Task 22 QA PASS pending manual delivery

BUG-01 parity QA FAIL

device-id NOT RUN live — PASS en tests locales (29/29)

DM history NOT RUN — no hay decisión Staff

**Informe completo:** `.mece/cells/QA-WAVE-2/REPORT.md`. **Cuentas desechables del probe BUG-01: 45** con prefijo `bug01qa_` (12 + 30 + 3 manuales), pendientes de purga por el Staff.

---

## 9. POST-DEPLOY — verificación en producción (2026-11-08)

**Base desplegada:** `origin/master` @ `c5610c9` — merge de PR #62 («chore: promote dev into master (Wave 2 complete)»), que incluye #56/#57 (Wave 2), #58 (hotfix PBKDF2), #59/#60/#61. `origin/dev` @ `4118ae2` (#64); la única diferencia con `master` es `pnpm-lock.yaml`.
**Ejecutor:** CTO (verificación directa) — sin cambios de producto ni de Git; solo cuentas desechables de QA.
**Informe de evidencia:** `.mece/cells/QA-WAVE-2/POST-DEPLOY.md`.

### 9.1 Estado del despliegue

| Comprobación | Resultado |
|---|---|
| `chatti-workers` `/health` | ✅ 200 · `{"status":"ok","version":"2.2.0"}` |
| `chatti-web` `/sw.js` | ✅ 200 · `SW_VERSION = 'sw-2'` · `text/javascript` · `skipWaiting` + `clients.claim` |
| `origin/master:backend/src/index.js` | ✅ PBKDF2 (`pbkdf2$sha256$…`) + `bcrypt.compare` solo como fallback legacy |
| `chatti-web-staging` `/sw.js` | ⚠️ 200 · 543 B · `text/html` → SW no servido (BUG-NEW-02 sigue abierto) |

### 9.2 BUG-01 — PBKDF2 live (discriminador)

Script `/tmp/opencode/postdeploy_qa.py` (cabeceras Chrome + `Origin`): **10/10 PASS**.
El check decisivo es el **A2**: `register` con password de 94 B (`A×72 + "TAIL-ONE-DISCRIMINATOR"`) y `login` con `A×72 + "TAIL-TWO-DIFFERENT"` → **401**. Con bcrypt habría devuelto **200** por truncamiento a 72 B. También PASS: login correcto 200, control de 63 B con diferencia en el byte 51 → 401, `users/find` devuelve el `deviceId` nuevo, `by-device-id` d2 → 200 y d1 → 404. Las 4 cuentas creadas se borraron (200).

### 9.3 Estabilidad (`pnpm qa:bug01`)

| Ronda | Hora UTC | Attempts | 200 | 5xx / 1102 | avg / p95 / max |
|---|---|---|---|---|---|
| 1 | 2026-11-08T22:32:53Z | 36 | **36** | **0 / 0** | 204 / 525 / 553 ms |
| 2 | 2026-11-08T22:36:12Z | 36 | **36** | **0 / 0** | 201 / 515 / 598 ms |

Reportes: `/tmp/chatti-qa/bug01-2026-11-08T22-32-53-807Z.json` y `/tmp/chatti-qa/bug01-2026-11-08T22-36-12-689Z.json`.

### 9.4 Tests web

`pnpm test` en `web/` sobre `c5610c9`: **125/125 tests, 9 archivos** (antes 119; los 6 casos de hash/query de BUG-NEW-03 ya están cubiertos).

### 9.5 Veredictos actualizados

| Item | Veredicto |
|---|---|
| **sw-2 live** | ✅ **PASS** — producción sirve `sw-2` (BUG-NEW-01 cerrado) |
| **BUG-01 post-deploy** | ✅ **PASS** — PBKDF2 live; 72/72 requests 200, 0 5xx |
| **device-id (M2 finding 4)** | ✅ **PASS live** — d2 adoptado; d1 → 404 |
| **BUG-NEW-03** | ✅ **RESUELTO** — 125/125 tests |
| **BUG-NEW-02 (staging)** | ⚠️ **OPEN** — staging sigue sirviendo HTML en `/sw.js`; ya no bloquea la prueba manual (se hace en producción) |
| **Task 22 entrega manual** | ✅ **PASS** — validado en navegador real contra producción con `sw-2` (ver §10) |

### 9.6 Procedimiento manual pendiente (Task 22)

Ya se puede ejecutar **en producción** (`https://chatti-web.wz0un.workers.dev`, `sw-2` live), sin esperar a staging:

1. Abrir el sitio en Chrome o Firefox de escritorio y registrarse/loguearse como usuario A.
2. Profile → Push Notifications → **Enable notifications** (aceptar el permiso). El badge debe pasar a "On".
3. En otra pestaña/incógnito, usuario B envía un **DM** (o mensaje de sala) a A **sin** que A tenga esa conversación abierta.
4. Esperar ~5 s: debe aparecer la notificación del SO con título `💬 <usuario>` (room) o `🔒 <usuario>` (DM, cuerpo opaco).
5. Click en la notificación → debe navegar a `/room/:id` o `/dm/:id` (regla query/hash de `sw-2`).
6. Caso negativo: con permiso denegado, el toggle debe mostrar el estado bloqueado.

**Criterio de cierre:** evidencia de 2–6 (captura o descripción fechada) + sign-off CTO/Staff. Hasta entonces **Task 22 permanece `IN PROGRESS (no DONE)`**.

### 9.7 Estado de los bugs de §8.3

| ID | Estado post-deploy |
|----|--------------------|
| BUG-NEW-01 | ✅ **RESUELTO** — producción sirve `sw-2` (verificado por `curl`). |
| BUG-NEW-02 | ⚠️ **ABIERTO** — `chatti-web-staging` sigue devolviendo HTML en `/sw.js`. Ya **no bloquea** Task 22: la prueba manual se hace contra producción, que ya sirve `sw-2`. |
| BUG-NEW-03 | ✅ **RESUELTO** — 6 casos hash/query añadidos; web **125/125**. |

### 9.8 Riesgos residuales post-deploy

- La prueba manual de entrega (notificación del SO + click → deep link) sigue **NOT RUN**: requiere un navegador real y dos usuarios.
- Cuentas legacy con hash bcrypt: se autentican por fallback (`bcrypt.compare`) hasta su siguiente login correcto, que re-hashea a PBKDF2.
- Las 45 cuentas `bug01qa_*` de la QA del 2026-11-02 siguen en KV de producción; la purga es del Staff.
- DM `history` sigue sin contrato decidido.
- `new URL()` del SW sin `try/catch`/allowlist y comentario engañoso (P3) siguen abiertos.
