# Chatti Mobile — Current Status

Updated: 2026-09-20 (Task 22 a `master`, dev alineado; **secrets VAPID aplicados en producción por DevOps** — único pendiente de la feature: QA e2e)

## Repository

`chatti-mobile` — Expo SDK 57 (upgrade traído a `dev` vía PR #41; en producción desde #22/hotfix), React Native, React 19

## Backend (integrated in this repo)

**Monorepo:** el backend de Cloudflare Workers se migró del repo independiente
`wz0un/chatti` (workers/) a `chatti-mobile/backend/` — chore/monorepo-backend.
El repo `chatti` queda como referencia/archivado (solo `master`, 1 commit;
contenía también un frontend CRA obsoleto y un server Socket.IO deprecado que
NO se migran).

- Worker de producción `chatti-workers` en `https://chatti-workers.wz0un.workers.dev`
- Config: `backend/wrangler.toml` (DOs `ChatRoom`, `DirectMessage`; KV `ROOMS_KV`)
- Tests: `backend/` → `pnpm test` (vitest + `@cloudflare/vitest-plugin`, 20/20)
- CI: `.github/workflows/backend.yml` — **solo tests** en `backend/**`
  (push/PR a dev/master). La verificación "Test Workers backend" pasó
  (PR #40: `allowBuilds` para pnpm ≥11 + `onlyBuiltDependencies` para CF 10.11.1).
  El deploy automático queda pendiente de DevOps/Staff para configurar entornos
  Cloudflare (DOs staging, secretos).
- Auth: device-based, no tokens, `userId` as parameter
- Durable Objects: `ChatRoom` (rooms), `DirectMessage` (DMs)
- KV: rooms, users, contacts, conversations
- Known issues: ver `docs/BACKEND-AUDIT.md` y `docs/QA-BUG01-RETEST.md`

## Branches

| Branch | Purpose | Key files |
|--------|---------|-----------|
| `master` | Producción (app móvil + web + backend monorepo) | `App.js`, `src/`, `web/`, `shared/`, `backend/`, `docs/` |
| `dev` | Desarrollo activo — **alineado con `master`** (sync #41) | Igual que master |
| Ramas de trabajo | `feature/*`, `bugfix/*`, `chore/*`, `docs/*` — se fusionan a `dev` vía PR y se eliminan | — |

## Backend (separate repo, NOT this one)

Cloudflare Worker at `https://chatti-workers.wz0un.workers.dev`
- Auth: device-based, no tokens, `userId` as parameter
- Durable Objects: `ChatRoom` (rooms), `DirectMessage` (DMs)
- KV: rooms, users, contacts, conversations
- Known issues: auth endpoints intermittently return 503 (`error code: 1102`); DM WS never emits `history` on join

## What's implemented

### Mobile app (source of truth, untouched)
- Full feature set: auth, rooms, DMs (encrypted), contacts, profile, i18n (en/es/ar/fr)
- Known bugs: 6 discovered (documented in `docs/WEB-ARCHITECTURE.md` §2), not fixed unless explicitly tasked

### Web app (on `feature/web-implementation` branch)
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
| Deep-linkable routes | ❌ Not started | T16 |
| RTL/a11y | ❌ Not started | T18 |
| Dark mode | ❌ Not started | T19 |
| Web Push notifications (SW + VAPID + toggle) | ✅ FE done · BE done · **MERGEADO a producción (#27)** · secrets VAPID **aplicados (DevOps, 2026-09-20)** — pendiente QA e2e | T22 |

### Cloudflare deployment (en `dev` y `master`, ya alineados)
- `chatti-web` Worker: deployed (production)
- `chatti-web-staging` Worker: deployed (staging)
- Config: `web/wrangler.jsonc`, `web/public/_headers`
- **Pipeline Workers Builds OK (2026-09-20):** causa raíz histórica — `web/pnpm-workspace.yaml`
  roto (sin `packages:`) eliminado en `master` (`756780b`), y `tsconfig.json` raíz inlineado
  (`f7c896f`). Ambos devuelven a `dev` vía sync #41. Además PR #40 reintrodujo el workspace
  **corregido** con `packages: - .` + `onlyBuiltDependencies` (CF pnpm 10.11.1) y `allowBuilds`
  (GH Actions pnpm 11.27): checks "Workers Builds: chatti-web/chatti-workers" y
  "Test Workers backend" **verdes**.

## QA status

| Phase | Gate | Result |
|-------|------|--------|
| M0 Foundations | Unit tests + build | ✅ PASS (85/85 tests, 300kB JS / 94kB gzip) |
| M0 Foundations | Encryption interop | ✅ PASS (byte-identical with mobile) |
| M1 Core chat | Fresh-session DM round-trip | ✅ PASS |
| M1 Core chat | Auth (register/login) | ✅ RE-CHECK 2026-09-15: probe BUG-01 90/90 OK + smoke 4/4×2 — BUG-01 no reproducido (ver `docs/QA-BUG01-RETEST.md`); re-apertura formal del gate pendiente Staff/BE |
| M1 Core chat | DM reconnect | ✅ FIXED (BUG-02: listener wipe resolved) |
| M1 Core chat | Contacts screen | ✅ DONE (Task 11 implemented + validated) |
| M1 Core chat | Profile controls + conversation delete | ✅ DONE (Task 12 + BUG-03; typecheck/lint/85 tests pass) |
| M1 Core chat | Full QA gate | ⚠️ Blocked sin confirmar — BUG-01 no reproducido en sesión 2026-09-15; queda validación Staff/formal |
| M2 Rooms | Functional QA | ⚠️ NOT READY (live room/contact coverage and mobile interop not run) |
| Regression suite | Task 20 (QA regression) | ✅ DONE — `npm run qa:regression` = 92/92 (85 unit + 5 interop + 2 reconnect), reproducible en clone limpio. Ver `docs/QA-REGRESSION.md` |
| Task 22 Web Push — FE | PR #27 (`dev`→`master`) | ✅ **MERGEADO 2026-09-20** (`a6381f9`) tras pipeline verde (#40) y sync dev (#41). QA CODE PASS previo: typecheck/lint/build OK, 109/109 tests, smoke 4/4, interop 5/5, i18n 11/11×4. ⛔ **Función NO operativa end-to-end**: secrets VAPID pendientes (DevOps/Staff). Ver `docs/QA-PR27-TASK22.md` |

Full report: `docs/QA-REPORT.md` · Regression: `docs/QA-REGRESSION.md` · PR #27: `docs/QA-PR27-TASK22.md`

## Blockers

1. **BUG-01 (CRITICAL, backend):** ⚠️ **NOT REPRODUCED en sesión QA 2026-09-15** — probe dedicado 90/90 intentos OK (3 rondas × 10 register+login), smoke 4/4 ×2, cero 503/1102. Veredicto: `docs/QA-BUG01-RETEST.md`. Sigue pendiente re-apertura formal del gate de auth M1 (Staff/BE) y confirmación BE de la causa raíz.
2. **Backend deploy automático:** pendiente de DevOps/Staff — configurar DOs/entornos de staging en Cloudflare antes de habilitar el deploy de `backend/` desde CI.<!-- 2. deleted: Task 22 VAPID secrets — RESUELTO (ver Fixed) -->

## Fixed (committed)

- **Task 22 — secrets VAPID (infra, DevOps 2026-09-20):** par P-256 (RFC 8292)
  generado y fijado en el worker de **producción** `chatti-workers` (versión live
  `1e93cd9e`, deployment `93a64718`, build `23d2103f` sobre master `a6381f9`,
  2026-09-20T17:12Z): `VAPID_SUBJECT=mailto:contact@mohsine.com`,
  `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` (mismo par). Emparejados con
  `VITE_VAPID_PUBLIC_KEY` de `web/.env.production` (`f6097a8`, merge #27).
  `backend/.dev.vars` creado (git-ignored) para `wrangler dev`. Evidencia API:
  bindings `secret_text VAPID_*` en la versión desplegada. Sin cambios de código.
- **BUG-02 (HIGH):** WebSocket reconnect wipes `listeners` Map — fixed in `shared/ws/DirectMessageSocket.ts` (commit `673832a`); regression cubierta por `npm run qa:reconnect`
- **BUG-04 (MEDIUM):** `lastSeen` not updated on incoming DM messages — fixed in `web/src/features/dm/DirectMessagePage.tsx` (commit `673832a`)
- **BUG-06 (LOW):** i18n key mismatch in empty-search subtext — fixed in `web/src/features/conversations/ConversationsPage.tsx` (commit `673832a`)

## Next steps

1. **QA end-to-end Task 22:** navegador → suscripción → mensaje en sala/DM → notificación → click
   deep-link. Evidencia en `docs/QA-PR27-TASK22.md` + actualización de `docs/WEB-PUSH.md` §1.
2. Confirmar formalmente BUG-01 (backend) y re-aperturar el gate de auth de M1 — Staff/BE
3. Re-run live contacts/rooms and web↔mobile room interoperability QA — QA (M2)
4. Publicar `chatti-web-staging` only after an M2 staging-safe QA verdict; production remains out of scope

## Docs index

| Document | Purpose |
|----------|---------|
| `WEB-ARCHITECTURE.md` | Target architecture, API inventory, interop constraints |
| `WEB-ROADMAP.md` | M0–M4 milestones with status |
| `WEB-TASKS.md` | 24 tasks with ownership and status |
| `WEB-PARITY.md` | 26-feature mobile vs web matrix |
| `WEB-PUSH.md` | Task 22 Web Push: BE/FE contract, payload schema, SW behavior |
| `QA-PR27-TASK22.md` | QA verdict PR #27 (Task 22) — gates, merge sim, pipeline, blockers |
| `QA-REPORT.md` | QA gate report with bugs |
| `CLOUDFLARE-DEPLOYMENT.md` | Cloudflare deployment config |
| `BACKEND-AUDIT.md` | Deep backend technical audit (separate repo context) |
| `BACKEND-HARDENING-PLAN.md` | 5-phase backend production plan (separate repo context) |
