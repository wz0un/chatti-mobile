# QA-WAVE-2 — REPORT (Fase B, consolidación)

**Célula:** QA-WAVE-2 (Wave 2, Phase B)
**Agente:** QA-WAVE-2 (consolidación) — READ-ONLY sobre producto y Git
**Fecha:** 2026-11-02, 13:34–13:36 CET (Europe/Madrid) / 12:34–12:36 UTC
**Worktree:** `/home/mohsine/.t3/worktrees/chatti-mobile/t3-504e388b`
**HEAD verificado:** `d6608d9e3f3630a408c98bd401516365c95b34df` (= `origin/dev`, merge PR #56; PR #57 = `2d7d798ff33b8500e0bfa29584affdb6ec13dac3`)
**Session id:** `qa-wave-2-phase-b-d6608d9`
**Naturaleza:** consolidación de la QA ya producida. **No se repitió el probe live** contra producción; se muestrearon los números y el estado de despliegues. No se editó producto, tests ni estado Git. Los únicos ficheros escritos son este `REPORT.md` y la sección 8 de `docs/QA-PR27-TASK22.md`.

> **Actualización 2026-11-09:** este informe es histórico (2026-11-02). La entrega push manual ya se ejecutó en producción con `sw-2`: la notificación del SO llegó correctamente; clic→deep link y caso negativo siguen pendientes. Estado vigente en `docs/QA-PR27-TASK22.md` §9–§10 y `docs/STATUS.md`.

---

## 0. Base verificada

| Ref | SHA | Comprobación |
|-----|-----|--------------|
| `HEAD` / `origin/dev` | `d6608d9e3f3630a408c98bd401516365c95b34df` | `git rev-parse HEAD` |
| Merge PR #57 | `2d7d798ff33b8500e0bfa29584affdb6ec13dac3` | `git log -1`, 2026-11-02 13:16:03 +0100 |
| Merge PR #56 | `d6608d9e3f3630a408c98bd401516365c95b34df` | `git log --oneline -6` |
| `origin/master` | `6221d4c` (sin #52/#56/#57) | `git show origin/master:backend/src/index.js` → `bcrypt.hash` / `bcrypt.compare` |

`git status --porcelain` al inicio: limpio. `node_modules/` no existía en el worktree; se instaló con `pnpm install --frozen-lockfile` en `backend/` y `web/` (sin cambios de lockfile ni de ficheros trackeados).

---

## 1. Resultado por item de la TASK

| # | Item | Resultado | Evidencia |
|---|------|-----------|-----------|
| 1 | **Task 22** — deep link on click (GitHub #45), QA sobre `dev` mergeado | ✅ **PASS** técnico (con salvedades) — entrega manual **NOT RUN** | Informe fuente: `.mece/cells/QA-WAVE-2/WEBPUSH-DEV-D6608D9.md` (worktree `t3-989546bb`), ejecutado 13:19–13:34 CET sobre `d6608d9`. Gates web PASS (typecheck, lint, 119/119 tests, build), `dist/sw.js` con `sw-2`, harness 9/9, entrega push headless 5/5 con `data.url` correcto, 0 excepciones, contrato 7/7. |
| 1b | **Task 22** — prueba manual real Chrome/Firefox | ⚠️ **NOT RUN** | El headless no puede enfocar ventanas; la tabla §6.4 del informe fuente está preparada y vacía. Requiere Staff + despliegue previo de `d6608d9` en staging. |
| 1c | **Task 22** — cobertura del harness (target con query/hash) | ❌ **FAIL (solo test)** | El harness cubre 9 casos, pero no target con hash ni query exacta; comportamiento verificado por sonda independiente, no por CI. Bug nuevo `BUG-NEW-03` (P2). |
| 1d | **Task 22** — invariantes PR #44 (fan-out paginado + badge “Blocked” en/en es/ar/fr) | ✅ **PASS** | `listKeysPaginated` 2/2; call sites verificados; claves `statusBlocked` en 4 idiomas + test i18n. Backend 29/29 re-ejecutado aquí. |
| 2 | **BUG-01** — source parity (PR #52/#56) | ❌ **FAIL de paridad** | Probe live 126/126 200, 0 5xx/1102 (PASS del procedimiento), **pero producción ejecuta bcrypt de `master`**, no PBKDF2 de `dev`. Fuente: `.mece/cells/QA-WAVE-2/BUG01-LIVE.md` (worktree `t3-4ee4cae1`), 12:20–12:23 UTC. Código: `master` `bcrypt.hash` L377 y `bcrypt.compare` L480; `dev` `verifyPassword` L72 + PBKDF2. |
| 3 | **device-id** — `users/find` vs `users/by-device-id` (M2 finding 4) | ✅ **PASS en tests locales** · ⚠️ **NOT RUN live** | Tests backend `Contact recipient resolution after device change (M2 finding #4)`: `keeps users/find and contacts/request consistent after update-push-token changes deviceId` (L540) y `lets login adopt a new deviceId and refresh all indices` (L585), dentro de 29/29. Live no ejecutado: el fix no está desplegado; producción sigue con el comportamiento de `master` (marcador `bug01qa_devid_…`: `by-device-id` nuevo 404). |
| 4 | **DM history** — contrato Staff | ⚠️ **NOT RUN — no hay decisión Staff** | BE-AUTH-CLOSE §Item 3: recomendación (a) mover `history` de `handleWebSocket` a `handleJoin`, **no implementada**. Sin contrato elegido no hay nada que validar en web ni en móvil. |

**Resumen:** 2 PASS (Task 22 técnico, device-id local), 1 FAIL (paridad BUG-01), 2 NOT RUN (manual Task 22, device-id live, DM history) y 1 FAIL de cobertura de tests. Nada se declara DONE: faltan QA funcional formal y sign-off CTO/Staff (AGENTS.md).

---

## 2. Muestreo ejecutado en esta consolidación

Comandos y resultados exactos (2026-11-02):

| Hora (UTC) | Comando | Resultado | Exit |
|------------|---------|-----------|------|
| 12:34:46–12:34:50 | `cd backend && pnpm test` | **Test Files 2 passed (2) · Tests 29 passed (29)** · 2.60 s | 0 |
| 12:34:46–12:34:48 | `cd web && pnpm test` | **Test Files 9 passed (9) · Tests 119 passed (119)** · 974 ms | 0 |
| 12:35:07 | `curl -sS https://chatti-web.wz0un.workers.dev/sw.js` | HTTP **200**, **3 701 bytes**, `text/javascript`, contiene **`sw-1`** | 0 |
| 12:35:07 | `curl -sS https://chatti-web-staging.wz0un.workers.dev/sw.js` | HTTP **200**, **543 bytes**, **`text/html`**, cuerpo `<!doctype html>…` (index.html SPA) | 0 |
| 12:35 | `grep -n "SW_VERSION\|sameSearch\|sameHash" web/public/sw.js` | `SW_VERSION = 'sw-2'` (L17); regla search/hash exacta (L103–105) | 0 |
| 12:35 | `git show origin/master:backend/src/index.js \| grep bcrypt` | `bcrypt.hash(password, 10)` L377; `bcrypt.compare` L480 | 0 |
| 12:35 | `git show HEAD:backend/src/index.js \| grep verifyPassword` | `verifyPassword` L72; fallback `bcrypt.compare` L97; login L573 | 0 |

Los dos números centrales de los informes fuente se sostienen: **backend 29/29** y **web 119/119**. El estado de despliegues también se reproduce: producción sirve `sw-1` y staging devuelve HTML en `/sw.js`. No se creó ninguna cuenta ni se envió tráfico de escritura en esta sesión.

---

## 3. Detalle por área

### 3.1 Task 22 — deep link on click

**PASS técnico sobre `dev` `d6608d9`; entrega manual NOT RUN.**

Evidencia del informe fuente `WEBPUSH-DEV-D6608D9.md`:

- Gates web sobre el árbol mergeado: `typecheck` 0, `lint` 0, **119/119 tests**, `build` OK (77 módulos, 1.40 s).
- `dist/sw.js` idéntico a `public/sw.js` (SHA-256 `2bc71fdc19bd49068e5911f7048a1bea9d485a72c29ebbb6a37fc3d644848c60`), con `sw-2`, `skipWaiting`, `clients.claim`, fallback `/rooms` y `openWindow`.
- Harness `swNotificationClick.test.ts`: **9/9** (sin ventana, otra ruta, misma ruta con slash, uncontrolled, `navigate()` rechaza, `focus()` rechaza, URL inválida).
- Entrega push headless (Chrome 156, `ServiceWorker.deliverPushMessage`): **5/5 payloads**, `data.url` correcto, `sw-2`, **0 excepciones**.
- Contrato `shared/notifications/webPush.ts` ⇄ SW: **7/7** payloads idénticos.
- Invariantes #44: backend 29/29, `listKeysPaginated` 2/2, badge “Blocked” en en/es/ar/fr.

**Lo que no está probado:** el click real de una notificación del sistema en Chrome/Firefox de escritorio. El sandbox headless no puede enfocar ventanas (`Not allowed to focus a window`) y un `NotificationEvent` sintético no permite `waitUntil` (`InvalidStateError`). La tabla §6.4 de `WEBPUSH-DEV-D6608D9.md` (20 filas C1–C10, F1–F10) está preparada y **vacía**. Sin esa tabla no hay QA funcional de Task 22.

### 3.2 BUG-01 — paridad de código

**FAIL de paridad.** El probe live pasó (126/126 HTTP 200, 0 5xx, 0 `error code: 1102`, 12:20–12:22 UTC), pero **no cierra BUG-01**:

- Producción se comporta como `master`: login con contraseña idéntica en los primeros 72 bytes y distinta después → **200** (truncación bcrypt); control con diferencia en byte 51 → **401**. Con PBKDF2 habría sido 401.
- Segundo marcador: login con `deviceId` nuevo **no** lo adopta en producción (`users/find` devuelve el viejo; `by-device-id` nuevo → 404). `dev` sí lo adopta.
- `master` (`6221d4c`) sigue con `bcrypt.hash(password, 10)` (L377) y `bcrypt.compare` (L480); PR #52 no es ancestro de `master`.
- `dev` (`d6608d9`) usa PBKDF2-HMAC-SHA-256 (100 000 iteraciones, 16 B salt, 256 bits) con fallback bcrypt + migración, y endurece hashes malformados a 401.

**Consecuencia:** el camino que consume CPU y produjo el 1102 sigue desplegado. El probe es secuencial y no prueba concurrencia ni cuentas legacy. **PASS del probe ≠ BUG-01 cerrado.**

### 3.3 device-id (`users/find` vs `users/by-device-id`)

**PASS en tests locales; NOT RUN live.**

- Causa raíz (BE-AUTH-CLOSE): `update-push-token` no refrescaba `user:username`, así que `users/find` devolvía el `deviceId` viejo y `by-device-id` daba 404.
- Fix en `dev`: `users/find` lee `user:id`; `update-push-token` refresca los tres índices y borra el device anterior; `loginUser` acepta `deviceId` opcional.
- Tests de regresión M2 en la suite 29/29: L540 y L585 (dos tests). **PASS.**
- Live **NOT RUN**: el fix no está desplegado y producción mostró el comportamiento viejo. No se puede validar el flujo de contacto real contra producción.

### 3.4 DM history

**NOT RUN — no hay decisión Staff.**

`backend/src/DirectMessage.js:146` envía `history` en `handleWebSocket` antes del `join`; `handleJoin` (`:199`) no lo envía. Móvil (`src/services/DirectMessageService.js:109`, `handleHistory` `:230`) añade sin deduplicar; web (`shared/ws/DirectMessageSocket.ts:134`, `DirectMessagePage.tsx:100`) reemplaza la lista. La recomendación (a) —mover el envío a `handleJoin`— **no se implementó** y requiere decisión Staff + QA live. No hay contrato que verificar.

---

## 4. Bugs nuevos (con severidad)

| ID | Severidad | Bug | Evidencia | Acción |
|----|-----------|-----|-----------|--------|
| **BUG-NEW-01** | **P1 — release blocker Task 22** | Producción `chatti-web.wz0un.workers.dev` sirve **`sw-1`**; el fix `sw-2` de `d6608d9` no está desplegado. Los usuarios reales siguen con el bug #45 (click sin navegación). | `GET /sw.js` 2026-11-02 12:35Z: HTTP 200, 3 701 B, `text/javascript`, `sw-1`, sin `sameSearch`/`sameHash`. `origin/master` no contiene #57. | Staff: PR `dev → master` + despliegue de `chatti-web`. No lo puede hacer QA. |
| **BUG-NEW-02** | **P1 — entorno/bloqueo de la prueba manual** | `chatti-web-staging.wz0un.workers.dev` devuelve **HTML** (index.html SPA) en `/sw.js`. El SW no se registra; una prueba manual ahí no valida nada. | `GET /sw.js` 2026-11-02 12:35Z: HTTP 200, **543 B**, `content-type: text/html`, cuerpo `<!doctype html>`. | DevOps/Staff: publicar un build de `d6608d9` en staging con `pnpm build` (production mode, VAPID horneada) y verificar `sw-2` + `application/javascript` antes de la prueba. |
| **BUG-NEW-03** | **P2 — cobertura de tests** | El harness no cubre target con **hash** ni target con **query**: faltan 6 casos (hash ausente/distinto/igual, query distinta/igual, todos los clientes con URL inválida). La regla “search/hash exactos” queda sin CI. | `web/src/lib/swNotificationClick.test.ts` 9 tests; sonda `vm` independiente confirma que el comportamiento es correcto, pero no queda en CI. | FE: añadir los 6 tests en follow-up. No bloquea el merge del fix; sí debe cerrarse antes de DONE. |

Hallazgos menores heredados (P3, no bloqueantes): comentario del SW engañoso sobre query/hash; `new URL()` sin `try/catch` ni allowlist de esquema; `parsePushPayload` del SW descarta `conversationPartnerId`/`timestamp`.

---

## 5. Cuentas desechables creadas (para purga del Staff)

Del probe BUG-01 (`BUG01-LIVE.md` §5): **45 cuentas** con prefijo **`bug01qa_`**.

| Origen | N | Patrón |
|--------|---|--------|
| `pnpm qa:bug01` (12 pares) | 12 | `bug01qa_r1_<0-11>_<base36>` |
| `qa:bug01:stress` (3×10) | 30 | `bug01qa_r<1-3>_<0-9>_<base36>` |
| Canary truncación bcrypt | 1 | `bug01qa_trunc_1793622014#0001` |
| Control <72 B | 1 | `bug01qa_ctl60_1793622171#0001` |
| Marcador deviceId | 1 | `bug01qa_devid_1793622171#0001` |
| **Total** | **45** | |

- Las 42 del probe se borraron best-effort (`delete`) sin warnings; las 3 manuales se borraron y se verificó login posterior → 401.
- No se puede verificar individualmente sin acceso a KV. Purga recomendada: listar `user:username:bug01qa_` (ventanas `12:20:41–12:20:55Z`, `12:21:00–12:21:57Z`, y manuales de `12:20:14Z`/`12:22:51Z`).
- Esta sesión de consolidación **no creó cuentas**.

---

## 6. Riesgos residuales

1. **Click real sin verificar** (Task 22): la única evidencia es harness + sonda + entrega headless. La prueba manual en Chrome/Firefox es obligatoria y no se ejecutó.
2. **Producción stale** (`sw-1`): los usuarios siguen con el bug #45 hasta que #57 llegue a `master` y se despliegue. Probar en producción hoy daría FAIL y no probaría el fix.
3. **Staging sin SW**: si Staff prueba sin redesplegar, el SW no se registra y la prueba no es válida.
4. **BUG-01 sigue vivo en producción**: `master` ejecuta bcrypt; el 1102 es sensible a concurrencia y CPU por isolate. El probe secuencial no lo descarta.
5. **Cuentas legacy bcrypt**: en `dev`, el primer login de una cuenta legacy ejecuta `bcrypt.compare`; dos primeros logins concurrentes ejecutan bcrypt dos veces. La migración reduce el riesgo con el tiempo, no de golpe.
6. **Sin cota de iteraciones PBKDF2**: `verifyPassword` acepta cualquier `iterations > 0`; un hash absurdo (solo escribible por el servidor) consumiría CPU.
7. **device-id live sin validar**: el fix solo está probado en tests; el flujo de contacto real contra producción no se ha verificado.
8. **DM history sin contrato**: duplicar `history` (conectar + join) rompería el móvil, que no deduplica. Cualquier cambio requiere decisión Staff + QA live.
9. **Cobertura de tests**: gap hash/query (BUG-NEW-03); badge “Blocked” validado por i18n, no por render DOM; fan-out sin test E2E.
10. **Purga de 45 cuentas QA** pendiente de Staff.
11. **`/health` no distingue versión real**: `2.2.0` hardcodeada en ambas ramas.
12. **Esquema de `data.url`**: sin allowlist `http(s)` ni `try/catch`; el payload lo controla el backend (riesgo bajo).

---

## 7. Entorno y fecha

| Dato | Valor |
|------|-------|
| Fecha | **2026-11-02** (13:34–13:36 CET / 12:34–12:36 UTC) |
| SO | Linux (x86_64) |
| Node | v24.13.1 |
| pnpm | 11.9.0 |
| Worktree | `/home/mohsine/.t3/worktrees/chatti-mobile/t3-504e388b` |
| HEAD | `d6608d9e3f3630a408c98bd401516365c95b34df` |
| Navegador (informe fuente) | Chrome 156.0.8078.79 headless |
| Instalación | `pnpm install --frozen-lockfile` en `backend/` y `web/`; sin cambios trackeados |

---

## 8. STATUS delta (para CTO-STATUS-SYNC; no aplicado)

- **Task 22 / GitHub #45:** QA técnica sobre `dev` `d6608d9` = **PASS**; prueba manual real = **NOT RUN**; sign-off CTO/Staff pendiente. **No DONE.** Sigue en QA/IN PROGRESS.
- **PR #57:** mergeado en `dev` (`2d7d798`); verificado sobre el árbol mergeado. Sin reviews formales registradas.
- **PR #56 / BE-AUTH-CLOSE:** mergeado en `dev` (`d6608d9`); 4 tests extra en la suite 29/29.
- **BUG-01:** **FAIL de paridad**. Probe live PASS (126/126, 0 5xx) pero producción ejecuta bcrypt de `master`; el fix PBKDF2 de `dev` no está desplegado. No DONE.
- **device-id (M2 finding 4):** PASS en tests locales (2 tests); live NOT RUN. No DONE.
- **DM history:** NOT RUN — sin decisión Staff; sin código. No DONE.
- **Despliegues:** ninguno realizado por QA. Producción `chatti-web` sirve `sw-1`; `chatti-web-staging` sirve HTML en `/sw.js`; `chatti-workers` ejecuta `master` (bcrypt).
- **Acción recomendada:** (1) DevOps publica `d6608d9` en staging y verifica `sw-2`; (2) Staff ejecuta la tabla §6.4; (3) PR revisado `dev → master` con #52/#56/#57; (4) repetir probe BUG-01 con ráfaga concurrente y una cuenta legacy real; (5) FE añade los 6 tests de hash/query; (6) purgar `bug01qa_`.

---

## 9. Veredictos finales

Task 22 QA PASS pending manual delivery

BUG-01 parity QA FAIL

device-id NOT RUN live — PASS en tests locales (29/29)

DM history NOT RUN — no hay decisión Staff

---

## 10. Fuentes

| Fuente | Ruta / enlace |
|--------|---------------|
| QA Web Push sobre `dev` mergeado | `/home/mohsine/.t3/worktrees/chatti-mobile/t3-989546bb/.mece/cells/QA-WAVE-2/WEBPUSH-PRE-MERGE.md` |
| QA BUG-01 live | `/home/mohsine/.t3/worktrees/chatti-mobile/t3-4ee4cae1/.mece/cells/QA-WAVE-2/BUG01-LIVE.md` |
| FE report | `.mece/cells/FE-WEBPUSH-CLICK/REPORT.md` · PR https://github.com/wz0un/chatti-mobile/pull/57 |
| BE report | `.mece/cells/BE-AUTH-CLOSE/REPORT.md` · PR https://github.com/wz0un/chatti-mobile/pull/56 |
| Doc Task 22 | `docs/QA-PR27-TASK22.md` §7.2 y §8 (nueva) |
| Doc M2 interop | `docs/QA-M2-INTEROP.md` (finding 4) |
| Doc BUG-01 re-test | `docs/QA-BUG01-RETEST.md` |
| AGENTS.md | Definition of Done (QA + CTO/Staff) |
