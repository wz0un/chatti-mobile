# Chatti Mobile — Current Status

Updated: 2026-11-09 (Wave 2 **desplegada y verificada en producción**: PR #62 → `master` `c5610c9`; BUG-01 post-deploy **PASS** (PBKDF2 live); `sw-2` live; device-id live **PASS**; Task 22 entrega manual **parcial**: notificación real PASS, clic→deep link sin confirmar y caso negativo pendiente; mobile Phase 2 sigue LOCKED).

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
- Tests: `backend/` → `pnpm test` (vitest + `@cloudflare/vitest-plugin`, **29/29** en `dev` @ `4118ae2`)
- CI: `.github/workflows/backend.yml` — **solo tests** en `backend/**`
  (push/PR a dev/master). El job de deploy sigue comentado.
- **Deploy automático: ACTIVO vía Cloudflare Workers Builds** (proyecto conectado a
  `wz0un/chatti-mobile`). Cada push a `master` construye y despliega
  `chatti-workers` y `chatti-web`. La promoción de Wave 2 (PR #62, `master`
  `c5610c9`) se desplegó así; `/health` responde **200** (`version 2.2.0`) y la
  verificación post-despliegue del **2026-11-08** confirma PBKDF2 activo. Los
  parches manuales al Worker (p. ej. el hotfix PBKDF2 del 2026-09-15) son efímeros
  y quedan sobrescritos por el siguiente build de `master`.
- Auth: device-based, no tokens, `userId` as parameter
- Durable Objects: `ChatRoom` (rooms), `DirectMessage` (DMs)
- KV: rooms, users, contacts, conversations
- Password hashing: **PBKDF2-SHA256 (Workers-native) live en producción**, con
  fallback `bcrypt.compare` para hashes legacy (se re-hashea en el siguiente
  login). BUG-01 cerrado post-despliegue (ver `.mece/cells/QA-WAVE-2/POST-DEPLOY.md`).

## Branches

| Branch | Purpose | Key files |
|--------|---------|-----------|
| `master` | Producción (mobile + web + backend); head `c5610c9` (Wave 2 completa) | `App.js`, `src/`, `web/`, `shared/`, `docs/`, `backend/` |
| `dev` | Desarrollo activo; head `4118ae2` (#64). Diff con `master` = solo `pnpm-lock.yaml` | todo lo anterior + Wave 2 |
| `feature/web-implementation` | Histórico: implementación web (ya fusionado a `dev`) | `web/`, `shared/` |
| `hotfix/bug01-pbkdf2-prod` | Histórico: hotfix #58, ya en `master` vía #62; se puede borrar | `backend/src/index.js` |

## What's implemented

### Mobile app (source of truth, untouched)

- Full feature set: auth, rooms, DMs (encrypted), contacts, profile, i18n (en/es/ar/fr)
- Known bugs: 6 discovered (documented in `docs/WEB-ARCHITECTURE.md` §2), not fixed unless explicitly tasked

### Web app (on `dev`/`master`)

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
| Web Push notifications (SW + VAPID + toggle) | ◐ **Desplegado**: producción sirve `sw-2` (verificado 2026-11-08). QA técnica PASS (125/125 tests, harness ampliado). ⏳ Pendiente solo la prueba manual de entrega + sign-off | T22 |
| CI pipeline (lint + typecheck + tests + build) | ◐ Implementado (`.github/workflows/web.yml`, PR #50/#53), pendiente QA/CTO | T24 |

### Cloudflare deployment

- `chatti-web` Worker (producción): construido desde `master` `c5610c9`; sirve **`sw-2`** (`text/javascript`, `skipWaiting` + `clients.claim` + regla query/hash), verificado 2026-11-08.
- `chatti-workers` Worker (producción): `/health` 200 (`version 2.2.0`); PBKDF2 live verificado por discriminador de 72 B.
- `chatti-web-staging` Worker (staging): build `c90f130` (2026-09-14); `/sw.js` sigue devolviendo HTML (543 B, BUG-NEW-02). No bloquea la prueba manual en producción, que ya sirve `sw-2`.
- Config: `web/wrangler.jsonc`, `web/public/_headers`
- Workers Builds CI/CD arreglado (2026-09-19): `web/pnpm-workspace.yaml` roto eliminado en `master` (commit `756780b`); `tsconfig.json` raíz inlineado (commit `f7c896f`). Fixes reintroducidos en `dev` (PRs #40/#41).

## QA status

| Phase | Gate | Result |
|-------|------|--------|
| M0 Foundations | Unit tests + build | ✅ PASS (125/125 web tests en `c5610c9`; build OK) |
| M0 Foundations | Encryption interop | ✅ PASS (byte-identical with mobile) |
| M1 Core chat | Fresh-session DM round-trip | ✅ PASS |
| M1 Core chat | Auth (register/login) | ✅ **PASS post-deploy 2026-11-08**: PBKDF2 live (discriminador 72 B → 401), 10/10 checks, probe 36/36 × 2 rondas sin 5xx/1102. Ver `.mece/cells/QA-WAVE-2/POST-DEPLOY.md`. |
| M1 Core chat | DM reconnect | ✅ FIXED (BUG-02: listener wipe resolved) |
| M1 Core chat | Contacts screen | ✅ DONE (Task 11 implemented + validated) |
| M1 Core chat | Profile controls + conversation delete | ✅ DONE (Task 12 + BUG-03; typecheck/lint/125 tests pass) |
| M1 Core chat | Full QA gate | ✅ **Desbloqueado** — BUG-01 resuelto en producción; gate formal pendiente de re-ejecución QA/CTO. |
| M2 Rooms | Functional QA | ✅ LIVE PASS 2026-09-15: interop web⇄móvil real. ✅ Contacto web→móvil (finding 4): corregido y **verificado live 2026-11-08** (`deviceId` nuevo adoptado, viejo 404). |
| Regression suite | Task 20 (QA regression) | ✅ DONE — `npm run qa:regression` = 92/92 (85 unit + 5 interop + 2 reconnect), reproducible en clone limpio. Ver `docs/QA-REGRESSION.md` |
| Task 22 Web Push — FE+BE | producción `sw-2` | ✅ QA técnica PASS (125/125 tests, harness con hash/query, push headless). ✅ Bloqueos 1 y 2 resueltos (pipeline y VAPID en prod). ✅ `sw-2` desplegado y verificado live. ✅ **Entrega manual PASS** (2026-11-09: notificación real recibida en producción desde B). ⏳ Pendiente: confirmar clic→deep link, caso negativo (permiso denegado) y sign-off CTO/Staff. **No DONE.** |
| Wave 2 — Task 22 (QA) | `master` `c5610c9` | ✅ QA técnica PASS · ⚠️ manual parcial (entrega PASS; clic→deep link y caso negativo pendientes, ver `QA-PR27-TASK22.md` §10) · sign-off pendiente. No DONE. |
| Wave 2 — BUG-01 parity | `master` `c5610c9` | ✅ **QA post-deploy PASS** (2026-11-08). CTO verificado. Pendiente ack del Staff en tablero. |
| Wave 2 — device-id (M2 finding 4) | `master` `c5610c9` | ✅ **PASS live** (2026-11-08): `users/find` y `by-device-id` adoptan el `deviceId` nuevo; el viejo 404. |
| Wave 2 — DM history | `master` `c5610c9` | ⚠️ NOT RUN — sin decisión Staff. No DONE. |

Full report: `docs/QA-REPORT.md` · Regression: `docs/QA-REGRESSION.md` · PR #27: `docs/QA-PR27-TASK22.md` · Post-deploy: `.mece/cells/QA-WAVE-2/POST-DEPLOY.md`

## Open items

1. **Task 22 Web Push — prueba manual (entrega PASS; faltan 2 comprobaciones):** la notificación del SO ya se recibió en producción (`sw-2`) con usuario B → usuario A el 2026-11-09. Queda por confirmar el **clic → deep link** (bug histórico de septiembre) y el **caso negativo** (permiso denegado → toggle bloqueado). Procedimiento y evidencia en `docs/QA-PR27-TASK22.md` §9.6 y §10; veredicto actual `Task 22 QA técnica PASS, manual delivery PASS, click/negative NOT CONFIRMED`.
2. **DM history contract:** sin decisión Staff; recomendación (a) de BE-AUTH-CLOSE (emitir `history` en `join`) no implementada. No duplicar `history` sin decidir el contrato (el móvil no deduplica).
3. **Mobile Phase 2:** LOCKED — no existe `.mece/STAFF-APPROVAL`. Planes listos: #16 (S) → #15 (M) → #14 (M). La validación verbal del Staff no sustituye el artefacto que exige AGENTS.md.
4. **Purga KV (Staff):** quedan las **45 cuentas `bug01qa_*`** del probe pre-despliegue. Las cuentas nuevas del post-deploy (4 manuales + 24 del probe) se borraron best-effort.
5. **Staging:** `chatti-web-staging` sigue sirviendo HTML en `/sw.js` (BUG-NEW-02). Redesplegar `master`/`dev` si se quiere usar staging para la prueba manual.
6. **Cuentas legacy:** siguen autenticándose con `bcrypt.compare` (fallback) hasta su siguiente login; no se probó una cuenta real legacy.
7. **Ramas:** `dev` está 2 commits por delante de `master` (solo `pnpm-lock.yaml`, PR #64). PR abiertos: #65 (docs, este cierre) y #63 (dependabot).

## Fixed (committed)

- **BUG-01 (CRITICAL):** auth 503/1102 por bcrypt en Workers → PBKDF2 nativo; desplegado en `master` y verificado live el 2026-11-08.
- **BUG-NEW-01 (P1):** producción servía `sw-1` → producción sirve `sw-2` (verificado 2026-11-08).
- **BUG-NEW-03 (P2):** cobertura del harness de hash/query → 6 casos añadidos; web 125/125.
- **BUG-02 (HIGH):** WebSocket reconnect wipes `listeners` Map — fixed in `shared/ws/DirectMessageSocket.ts` (commit `673832a`); regression cubierta por `npm run qa:reconnect`
- **BUG-04 (MEDIUM):** `lastSeen` not updated on incoming DM messages — fixed in `web/src/features/dm/DirectMessagePage.tsx` (commit `673832a`)
- **BUG-06 (LOW):** i18n key mismatch in empty-search subtext — fixed in `web/src/features/conversations/ConversationsPage.tsx` (commit `673832a`)

## Next steps

1. ⏳ Confirmar clic→deep link y caso negativo de Task 22 contra producción (`sw-2`) y firmar → Task 22 DONE.
2. ⏳ Staff purga las 45 cuentas `bug01qa_*` en KV de producción.
3. ⏳ Staff decide el contrato DM history (recomendación (a)).
4. ⏳ Staff crea `.mece/STAFF-APPROVAL` para desbloquear mobile Phase 2 (#16 → #15 → #14).
5. ⏳ DevOps redespliega staging (BUG-NEW-02) si se quiere un entorno de pruebas Web Push alternativo.
6. ⏳ Siguiente promoción `dev → master` solo si se quiere incluir la sincronización de lockfile (#64).

## Docs index

| Document | Purpose |
|----------|---------|
| `WEB-ARCHITECTURE.md` | Target architecture, API inventory, interop constraints |
| `WEB-ROADMAP.md` | M0–M4 milestones with status |
| `WEB-TASKS.md` | 24 tasks with ownership and status |
| `WEB-PARITY.md` | 26-feature mobile vs web matrix |
| `WEB-PUSH.md` | Task 22 Web Push: BE/FE contract, payload schema, SW behavior |
| `QA-PR27-TASK22.md` | QA verdict PR #27 (Task 22) — gates, merge sim, pipeline, blockers (§8 Wave 2, §9 post-deploy) |
| `QA-REPORT.md` | QA gate report with bugs |
| `CLOUDFLARE-DEPLOYMENT.md` | Cloudflare deployment config |
| `BACKEND-AUDIT.md` | Deep backend technical audit (separate repo context) |
| `BACKEND-HARDENING-PLAN.md` | 5-phase backend production plan (separate repo context) |
| `QA-BUG01-SOURCE-PARITY.md` | BUG-01 source parity + BE confirmation |
| `QA-BUG01-RETEST.md` | BUG-01 retest procedure |
| `QA-M2-INTEROP.md` | M2 live interop evidence |

## Definition of Done (AGENTS.md)

Nothing is DONE without **QA sign-off + CTO/Staff sign-off**. Estado a 2026-11-08:

| Item | Sign-off pendiente |
|------|--------------------|
| Task 22 Web Push (#45) | ⏳ Entrega manual PASS (2026-11-09). Faltan clic→deep link + caso negativo y sign-off CTO/Staff. `sw-2` ya está live. |
| BUG-01 source parity (PR #52/#56/#58) | ✅ QA post-deploy PASS + CTO (2026-11-08). Pendiente ack del Staff en tablero. |
| device-id (M2 finding 4) | ✅ QA live PASS (2026-11-08). Pendiente ack del Staff en tablero. |
| DM history contract | ⏳ Decisión Staff + QA live + CTO/Staff |
| Task 16 / BUG-05 (deep links) | ⏳ QA + CTO/Staff (implementado en código, no validado) |
| Task 24 (CI) | ⏳ QA + CTO/Staff (implementado, no validado) |
| Mobile P0 #14/#15/#16 | ⏳ `STAFF-APPROVAL` + QA device + CTO/Staff (Phase 2 LOCKED) |
