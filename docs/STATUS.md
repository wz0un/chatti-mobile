# Chatti Mobile — Current Status

Updated: 2026-09-20 (Task 22 BE implemented en monorepo — endpoints VAPID/WebPush + tests)

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
- Tests: `backend/` → `pnpm test` (vitest + `@cloudflare/vitest-plugin`, 20/20)
- CI: `.github/workflows/backend.yml` — **solo tests** en `backend/**`
  (push/PR a dev/master). El deploy automático queda pendiente de DevOps/Staff
  para configurar entornos Cloudflare (DOs staging, secretos).
- Auth: device-based, no tokens, `userId` as parameter
- Durable Objects: `ChatRoom` (rooms), `DirectMessage` (DMs)
- KV: rooms, users, contacts, conversations
- Known issues: ver `docs/BACKEND-AUDIT.md` y `docs/QA-BUG01-RETEST.md`

## Branches

| Branch | Purpose | Key files |
|--------|---------|-----------|
| `master` | Production mobile app + web scaffold | `App.js`, `src/`, `web/`, `shared/`, `docs/` |
| `dev` | master + Cloudflare deployment config | `.opencode.jsonc`, `web/wrangler.jsonc`, `web/public/_headers`, `docs/CLOUDFLARE-DEPLOYMENT.md` |
| `feature/web-implementation` | Full web app implementation (13 commits) | All `web/` and `shared/` code |

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
| Web Push notifications (SW + VAPID + toggle) | ✅ FE done · BE done (endpoints + hooks + crypto VAPID/aes128gcm) — pendiente secrets VAPID + QA e2e | T22 |

### Cloudflare deployment (on `dev` branch)
- `chatti-web` Worker: deployed (production)
- `chatti-web-staging` Worker: deployed (staging)
- Config: `web/wrangler.jsonc`, `web/public/_headers`
- **DevOps (2026-09-19): Workers Builds CI/CD arreglado.** Causa raíz del fallo sistémico
  (todos los builds fallaban en ~2 s, incluidos los de `master`):
  1. `web/pnpm-workspace.yaml` roto — eliminado en `master` (commit `756780b`).
  2. `tsconfig.json` raíz extendía `expo/tsconfig.base` (no resoluble en el build de CF) —
     inlineado en `master` (commit `f7c896f`).
  Build de producción `51b03b57` **SUCCESS** sobre `master` `f7c896f`
  (`npx wrangler deploy`, 2026-09-19 21:03). **Pendiente reintroducir ambos fixes en `dev`**.

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
| Task 22 Web Push — FE | PR #27 (`dev`→`master`) | ✅ QA CODE PASS — typecheck/lint/build OK, 109/109 tests, smoke 4/4, interop 5/5, i18n 11/11×4; merge simulado en CI: build+109 tests OK y SDK 57 conservado. ⛔ **Función NO operativa end-to-end**: backend `POST /api/auth/webpush` + VAPID pendientes. **Merge pendiente de aprobación Staff una vez el pipeline quede verde.** Ver `docs/QA-PR27-TASK22.md` |

Full report: `docs/QA-REPORT.md` · Regression: `docs/QA-REGRESSION.md` · PR #27: `docs/QA-PR27-TASK22.md`

## Blockers

1. **BUG-01 (CRITICAL, backend):** ⚠️ **NOT REPRODUCED en sesión QA 2026-09-15** — probe dedicado 90/90 intentos OK (3 rondas × 10 register+login), smoke 4/4 ×2, cero 503/1102. Veredicto: `docs/QA-BUG01-RETEST.md`. Sigue pendiente re-apertura formal del gate de auth M1 (Staff/BE) y confirmación BE de la causa raíz.
2. **Backend deploy automático:** pendiente de DevOps/Staff — configurar DOs/entornos de staging en Cloudflare antes de habilitar el deploy de `backend/` desde CI.
2. **Task 22 (backend web) — ahora implementado en `backend/`:** `POST /api/auth/webpush` (register/remove, KV `user:<userId>:webpush:<deviceId>`), `POST /api/auth/update-push-token` (contrato móvil pendiente) y hooks de envío room/DM con VAPID + aes128gcm (`backend/src/WebPush.js`, RFC 8291 byte-a-byte, tests 20/20). **Pendiente de infra (Staff):** generar keypair VAPID y fijar secrets `VAPID_SUBJECT`/`VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` + publicar `VITE_VAPID_PUBLIC_KEY` en el build web. Sin secrets el worker degrada (registra pero no envía). Contract en `docs/WEB-PUSH.md`.

## Fixed (committed)

- **BUG-02 (HIGH):** WebSocket reconnect wipes `listeners` Map — fixed in `shared/ws/DirectMessageSocket.ts` (commit `673832a`); regression cubierta por `npm run qa:reconnect`
- **BUG-04 (MEDIUM):** `lastSeen` not updated on incoming DM messages — fixed in `web/src/features/dm/DirectMessagePage.tsx` (commit `673832a`)
- **BUG-06 (LOW):** i18n key mismatch in empty-search subtext — fixed in `web/src/features/conversations/ConversationsPage.tsx` (commit `673832a`)

## Next steps

1. **PR #27 (`dev`→`master`):** merge pendiente de Staff. Pipeline de producción ya verde (DevOps); merge simulado QA OK. Tras el merge, `chatti-web` se desplegará con el código de Task 22 (web push) sin tocar la app móvil (SDK 57 conservado).
2. **Sync CI fixes `master`→`dev`:** traer a `dev` el tsconfig inline + eliminación de `web/pnpm-workspace.yaml` para que `dev` también buildee en CF (evitar divergencia).
3. Confirmar formalmente BUG-01 (backend) y re-aperturar el gate de auth de M1 — Staff/BE
4. Re-run live contacts/rooms and web↔mobile room interoperability QA — QA (M2)
5. Publicar `chatti-web-staging` only after an M2 staging-safe QA verdict; production remains out of scope

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
