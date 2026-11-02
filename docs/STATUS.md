# Chatti Mobile — Current Status

Updated: 2026-11-02 (Wave 2 close-out: PR #56 and #57 merged into `dev`; QA-WAVE-2 verdicts; PR #58 hotfix open to `master`; BUG-01 parity QA FAIL; mobile Phase 2 locked).

## Repository

`chatti-mobile` — Expo SDK 54, React Native 0.81.5, React 19.1.0

## Backend (integrated in this repo)

**Monorepo:** el backend de Cloudflare Workers se migró del repo independiente
`wz0un/chatti` (workers/) a `chatti-mobile/backend/` — chore/monorepo-backend.
El repo `chatti` queda como referencia/archivado (solo `master`, 1 commit;
contenía también un frontend CRA obsoleto y un server Socket.IO deprecado que
NO se migran).

- Worker de producción `chatti-workers` en `https://chatti-workers.wz0un.workers.dev`
- Config: `backend/wrangler.toml` (DOs `ChatRoom`, `DirectMessage`; KV `ROOMS_KV`)
- Tests: `backend/` → `pnpm test` (vitest + `@cloudflare/vitest-plugin`, **29/29** en `dev` @ `d6608d9`)
- CI: `.github/workflows/backend.yml` — **solo tests** en `backend/**`
  (push/PR a dev/master). El job de deploy sigue comentado.
- **Deploy automático: ACTIVO vía Cloudflare Workers Builds** (proyecto conectado a
  `wz0un/chatti-mobile`). Cada push a `master` construye y despliega
  `chatti-workers` (último build `6221d4c`, build `ebf709f0…`, versión
  `cf610c96…`, `2026-11-01T19:50:25Z`). GitHub Actions (`backend.yml`) solo
  ejecuta tests; el job de deploy sigue comentado. Los parches manuales al Worker
  (p. ej. el hotfix PBKDF2 del 2026-09-15) son efímeros y quedan sobrescritos por
  el siguiente build de `master`.
- Auth: device-based, no tokens, `userId` as parameter
- Durable Objects: `ChatRoom` (rooms), `DirectMessage` (DMs)
- KV: rooms, users, contacts, conversations
- Known issues: ver `docs/BACKEND-AUDIT.md`, `docs/QA-BUG01-RETEST.md`,
  `docs/QA-BUG01-SOURCE-PARITY.md` (PBKDF2 restaurado en código en `dev`/PR #52,
  pendiente QA/Staff; PR #58 abierto a `master`).

## Branches

| Branch | Purpose | Key files |
|--------|---------|-----------|
| `master` | Producción (mobile + web + backend) | `App.js`, `src/`, `web/`, `shared/`, `docs/`, `backend/` |
| `dev` | Desarrollo activo (19 commits por delante de `master`, incluye #52/#56/#57) | todo lo anterior + Wave 2 |
| `feature/web-implementation` | Histórico: implementación web (ya fusionado a `dev`) | `web/`, `shared/` |
| `hotfix/bug01-pbkdf2-prod` (#58) | Hotfix a `master`: restaura PBKDF2 (cherry-pick de #52); head `c6921f35`, CI verde, pendiente merge del Staff | `backend/src/index.js` |

## What's implemented

### Mobile app (source of truth, untouched)

- Full feature set: auth, rooms, DMs (encrypted), contacts, profile, i18n (en/es/ar/fr)
- Known bugs: 6 discovered (documented in `docs/WEB-ARCHITECTURE.md` §2), not fixed unless explicitly tasked

### Web app (on `dev` branch)

| Feature | Status | Task |
|---------|--------|------|
| Vite + React 19 + TS scaffold | ✅ Done | T1 |
| Shared types/contracts/i18n/storage | ✅ Done | T2 |
| E2E encryption (byte-identical with mobile) | ✅ Done | T3 |
| Auth service (register/login/session) | ✅ Done | T4 |
| REST API client | ✅ Done | T5 |
| WebSocket clients (room + DM) | ✅ Done | T6 |
| Auth UI (login/register) | ✅ Done | T7 |
| App shell (sidebar + responsive) | ✅ Done | T8 |
| Conversations list | ✅ Done | T9 |
| Encrypted DM chat | ✅ Done | T10 |
| Contacts screen (list + add + requests) | ✅ Done | T11 |
| Profile (language selector, delete) | ✅ Done | T12 |
| Room list screen | ✅ Done | T13 |
| Room chat screen | ✅ Done | T14 |
| Deep-linkable routes | ◐ Implementado en código (`room/:roomId`, `dm/:conversationId` + SPA fallback), pendiente QA/CTO | T16 |
| RTL/a11y | ❌ Not started | T18 |
| Dark mode | ❌ Not started | T19 |
| Web Push notifications (SW + VAPID + toggle) | ◐ Implementado en `dev` (sw-2, PR #57); producción sirve `sw-1`; QA técnica PASS, entrega manual NOT RUN; sign-off CTO/Staff pendiente | T22 |
| CI pipeline (lint + typecheck + tests + build) | ◐ Implementado (`.github/workflows/web.yml`, PR #50/#53), pendiente QA/CTO | T24 |

### Cloudflare deployment

- `chatti-web` Worker (producción): desplegado, versión `b11c1eca…`, build `570fb386…`, SHA `master 6221d4c`, `2026-11-01T19:50:56Z`, sirve `sw-1`.
- `chatti-web-staging` Worker (staging): desplegado, pero build `c90f130` (2026-09-14) sin Task 22 ni PR #44; `/sw.js` devuelve HTML (543 B). Requiere redespliegue de `d6608d9` antes de la prueba manual.
- Config: `web/wrangler.jsonc`, `web/public/_headers`
- Workers Builds CI/CD arreglado (2026-09-19): `web/pnpm-workspace.yaml` roto eliminado en `master` (commit `756780b`); `tsconfig.json` raíz inlineado (commit `f7c896f`). Build de producción `51b03b57` SUCCESS sobre `master` `f7c896f` (`npx wrangler deploy`, 2026-09-19 21:03). Fixes reintroducidos en `dev` (PRs #40/#41).
- 2026-09-20/21: Task 22 promovida a producción (PR #27 → `master` `a6381f9`) con el backend Web Push (PR #33), runbook VAPID (PR #37) y CI del backend (PR #38). `chatti-web` y `chatti-workers` desplegados: endpoint `/api/auth/webpush` operativo + VAPID key horneada en el bundle web (verificado por QA 2026-09-21, `docs/QA-PR27-TASK22.md` §7).
- **Riesgo de regresión LIVE (BUG-01):** el deploy de `master` del `2026-11-01T19:50:25Z` reconstruye el Worker desde un `master` que aún usa bcrypt; el fix PBKDF2 (PR #52) sigue solo en `dev`. Versión activa sin confirmar por falta de acceso a Cloudflare (ver `.mece/cells/DEVOPS-DEPLOY-VERIFY/REPORT.md`).

## QA status

| Phase | Gate | Result |
|-------|------|--------|
| M0 Foundations | Unit tests + build | ✅ PASS (85/85 tests, 300kB JS / 94kB gzip) |
| M0 Foundations | Encryption interop | ✅ PASS (byte-identical with mobile) |
| M1 Core chat | Fresh-session DM round-trip | ✅ PASS |
| M1 Core chat | Auth (register/login) | ⚠️ BUG-01 OPEN: QA live probe 126/126 sin 5xx, pero producción ejecuta bcrypt de `master` (paridad QA FAIL). Código PBKDF2 en `dev` (PR #52/#56) pendiente de despliegue; PR #58 abierto a `master`. Ver `docs/QA-BUG01-SOURCE-PARITY.md`. |
| M1 Core chat | DM reconnect | ✅ FIXED (BUG-02: listener wipe resolved) |
| M1 Core chat | Contacts screen | ✅ DONE (Task 11 implemented + validated) |
| M1 Core chat | Profile controls + conversation delete | ✅ DONE (Task 12 + BUG-03; typecheck/lint/85 tests pass) |
| M1 Core chat | Full QA gate | ⚠️ Blocked — BUG-01 (auth) sigue abierto en producción; gate formal pendiente Staff/BE. |
| M2 Rooms | Functional QA | ✅ LIVE PASS 2026-09-15: interop web⇄móvil real. Pendiente: contacto web→móvil (M2 finding 4, corregido en código en PR #56, pendiente QA live). |
| Regression suite | Task 20 (QA regression) | ✅ DONE — `npm run qa:regression` = 92/92 (85 unit + 5 interop + 2 reconnect), reproducible en clone limpio. Ver `docs/QA-REGRESSION.md` |
| Task 22 Web Push — FE+BE | PR #27 → `master` (`a6381f9`) | ✅ QA CODE PASS (gates §1, `docs/QA-PR27-TASK22.md`). ✅ Bloqueo 1 resuelto (pipeline verde). ✅ Bloqueo 2 resuelto EN PROD (2026-09-21). ⏳ Pendiente: QA manual de entrega en navegador real (el entorno sandbox no accede al push service) + sign-off CTO/Staff. Wave 2: QA técnica sobre `dev` `d6608d9` PASS (119/119 tests, harness 9/9, push headless 5/5); entrega real NOT RUN; sign-off pendiente. Producción sirve `sw-1` (BUG-NEW-01). |
| Wave 2 — Task 22 (QA) | dev `d6608d9` | ✅ QA técnica PASS, manual NOT RUN, sign-off pendiente. No DONE. |
| Wave 2 — BUG-01 parity | dev `d6608d9` | ❌ QA parity FAIL: producción ejecuta bcrypt de `master`. No DONE. |
| Wave 2 — device-id (M2 finding 4) | dev `d6608d9` | ✅ PASS local (2 tests), live NOT RUN. No DONE. |
| Wave 2 — DM history | dev `d6608d9` | ⚠️ NOT RUN — sin decisión Staff. No DONE. |

Full report: `docs/QA-REPORT.md` · Regression: `docs/QA-REGRESSION.md` · PR #27: `docs/QA-PR27-TASK22.md`

## Blockers

1. **BUG-01 (CRITICAL, backend):** QA parity FAIL en producción: `chatti-workers` ejecuta bcrypt de `master` (truncación a 72 B confirmada; `deviceId` nuevo no adoptado). Código PBKDF2 en `dev` (PR #52/#56) no desplegado. PR #58 (hotfix a `master`) abierto, head `c6921f35`, CI verde, pendiente merge del Staff. Tras el merge, Workers Builds desplegará `chatti-workers` con PBKDF2 y habrá que repetir el probe live con ráfaga concurrente y una cuenta legacy real.
2. **Backend deploy automático:** ACTIVO vía Workers Builds (no pendiente). `master` sigue con bcrypt hasta que PR #58 se mergee. El deploy manual del hotfix PBKDF2 del 2026-09-15 fue sobrescrito por builds de `master` (2026-09-20 y 2026-11-01).
3. **Task 22 Web Push — QA de entrega (último pendiente de la task):** bloqueos 1 y 2 resueltos y verificados en prod (2026-09-21). ⏳ Pendiente: prueba manual de entrega en navegador real (Chrome/Firefox): usuario B envía un mensaje a un usuario A con web push activo y sin conexión; debe llegar la notificación del SO y deep-link al chat. El entorno sandbox de QA no puede recibir push (`push service not available`). Procedimiento en `docs/QA-PR27-TASK22.md` §7.2. DoD: requiere este sign-off + CTO/Staff. *Hallazgos QA §7.3: P1 (paginación fan-out) y P3 (badge blocked) resueltos en PR #44; P2 (endpoint sin auth) aceptado by design (nota `docs/WEB-PUSH.md` §2.1).*
   - BUG-NEW-01 (P1): producción `chatti-web` sirve `sw-1`; el fix `sw-2` no está desplegado. Probar en producción hoy daría FAIL.
   - BUG-NEW-02 (P1): staging devuelve HTML en `/sw.js`; debe redesplegarse `d6608d9` antes de la prueba manual.
   - BUG-NEW-03 (P2): gap de cobertura de tests (hash/query en target); debe cerrarse antes de declarar Task 22 DONE.
4. **M2 finding 4 (device-id):** corregido en código (PR #56), pendiente QA live; producción sigue con comportamiento viejo.
5. **DM history contract:** sin decisión Staff; recomendación (a) de BE-AUTH-CLOSE no implementada.
6. **Mobile Phase 2:** LOCKED (`STAFF-APPROVAL: none`); planes #16 (S) → #15 (M) → #14 (M) listos.

## Fixed (committed)

- **BUG-02 (HIGH):** WebSocket reconnect wipes `listeners` Map — fixed in `shared/ws/DirectMessageSocket.ts` (commit `673832a`); regression cubierta por `npm run qa:reconnect`
- **BUG-04 (MEDIUM):** `lastSeen` not updated on incoming DM messages — fixed in `web/src/features/dm/DirectMessagePage.tsx` (commit `673832a`)
- **BUG-06 (LOW):** i18n key mismatch in empty-search subtext — fixed in `web/src/features/conversations/ConversationsPage.tsx` (commit `673832a`)

## Next steps

1. ⏳ Staff mergea PR #58 (hotfix PBKDF2) → Workers Builds despliega `chatti-workers` con PBKDF2; repetir probe BUG-01 con ráfaga concurrente + cuenta legacy.
2. ⏳ DevOps redespliega `d6608d9` en `chatti-web-staging` y verifica `sw-2` + `application/javascript`.
3. ⏳ Staff ejecuta la tabla §6.4 de `docs/QA-PR27-TASK22.md` en Chrome/Firefox; sign-off CTO/Staff → Task 22 DONE.
4. ⏳ Staff decide cuándo promover `dev`→`master` (PR con #52/#56/#57, sin `master` push intermedio).
5. ⏳ FE añade los 6 tests de hash/query (BUG-NEW-03).
6. ⏳ Staff purga las 45 cuentas `bug01qa_`.
7. ⏳ Staff decide el contrato DM history (recomendación (a)).
8. ⏳ Mobile: `STAFF-APPROVAL` para planes #16 → #15 → #14.

## Docs index

| Document | Purpose |
|----------|---------|
| `WEB-ARCHITECTURE.md` | Target architecture, API inventory, interop constraints |
| `WEB-ROADMAP.md` | M0–M4 milestones with status |
| `WEB-TASKS.md` | 24 tasks with ownership and status |
| `WEB-PARITY.md` | 26-feature mobile vs web matrix |
| `WEB-PUSH.md` | Task 22 Web Push: BE/FE contract, payload schema, SW behavior |
| `QA-PR27-TASK22.md` | QA verdict PR #27 (Task 22) — gates, merge sim, pipeline, blockers (incl. §8 Wave 2) |
| `QA-REPORT.md` | QA gate report with bugs |
| `CLOUDFLARE-DEPLOYMENT.md` | Cloudflare deployment config |
| `BACKEND-AUDIT.md` | Deep backend technical audit (separate repo context) |
| `BACKEND-HARDENING-PLAN.md` | 5-phase backend production plan (separate repo context) |
| `QA-BUG01-SOURCE-PARITY.md` | BUG-01 source parity + BE confirmation |
| `QA-BUG01-RETEST.md` | BUG-01 retest procedure |
| `QA-M2-INTEROP.md` | M2 live interop evidence |

## Definition of Done (AGENTS.md)

Nothing is DONE without **QA sign-off + CTO/Staff sign-off**. Tasks/bugs currently marked done in code/CI but awaiting sign-off:

| Item | Sign-off pendiente |
|------|--------------------|
| Task 22 Web Push (#45) | QA manual entrega en navegador real + CTO/Staff (Task 22 QA PASS pending manual delivery) |
| BUG-01 source parity (PR #52/#56) | QA live (probe FAIL de paridad) + CTO/Staff; PR #58 a `master` pendiente |
| device-id (M2 finding 4) | QA live + CTO/Staff |
| DM history contract | Decisión Staff + QA live + CTO/Staff |
| Task 16 / BUG-05 (deep links) | QA + CTO/Staff (implementado en código, no validado) |
| Task 24 (CI) | QA + CTO/Staff (implementado, no validado) |
| Mobile P0 #14/#15/#16 | `STAFF-APPROVAL` + QA device + CTO/Staff (Phase 2 LOCKED) |