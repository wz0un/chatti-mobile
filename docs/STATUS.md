# Chatti Mobile — Current Status

Updated: 2026-09-11 (Task 12 and BUG-03 completed; M2 QA incomplete)

## Repository

`chatti-mobile` — Expo SDK 54, React Native 0.81.5, React 19.1.0

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

### Cloudflare deployment (on `dev` branch)
- `chatti-web` Worker: deployed (production)
- `chatti-web-staging` Worker: deployed (staging)
- Config: `web/wrangler.jsonc`, `web/public/_headers`

## QA status

| Phase | Gate | Result |
|-------|------|--------|
| M0 Foundations | Unit tests + build | ✅ PASS (85/85 tests, 300kB JS / 94kB gzip) |
| M0 Foundations | Encryption interop | ✅ PASS (byte-identical with mobile) |
| M1 Core chat | Fresh-session DM round-trip | ✅ PASS |
| M1 Core chat | Auth (register/login) | ✅ RE-CHECK 2026-09-15: smoke 4/4 ×2 — BUG-01 not reproduced; backend stable this session (formal re-open pending Staff) |
| M1 Core chat | DM reconnect | ✅ FIXED (BUG-02: listener wipe resolved) |
| M1 Core chat | Contacts screen | ✅ DONE (Task 11 implemented + validated) |
| M1 Core chat | Profile controls + conversation delete | ✅ DONE (Task 12 + BUG-03; typecheck/lint/85 tests pass) |
| M1 Core chat | Full QA gate | ⚠️ Blocked sin confirmar — BUG-01 no reproducido en sesión 2026-09-15; queda validación Staff/formal |
| M2 Rooms | Functional QA | ⚠️ NOT READY (live room/contact coverage and mobile interop not run) |
| Regression suite | Task 20 (QA regression) | ✅ DONE — `npm run qa:regression` = 92/92 (85 unit + 5 interop + 2 reconnect), reproducible en clone limpio. Ver `docs/QA-REGRESSION.md` |

Full report: `docs/QA-REPORT.md` · Regression: `docs/QA-REGRESSION.md`

## Blockers

1. **BUG-01 (CRITICAL, backend):** No reproducido en la sesión QA 2026-09-15 (smoke 4/4 ×2). Backend-side; sigue siendo el único bloqueo formal documentado hasta re-apertura oficial.

## Fixed (committed)

- **BUG-02 (HIGH):** WebSocket reconnect wipes `listeners` Map — fixed in `shared/ws/DirectMessageSocket.ts` (commit `673832a`); regression cubierta por `npm run qa:reconnect`
- **BUG-04 (MEDIUM):** `lastSeen` not updated on incoming DM messages — fixed in `web/src/features/dm/DirectMessagePage.tsx` (commit `673832a`)
- **BUG-06 (LOW):** i18n key mismatch in empty-search subtext — fixed in `web/src/features/conversations/ConversationsPage.tsx` (commit `673832a`)

## Next steps

1. Confirmar formalmente BUG-01 (backend) y re-aperturar el gate de auth de M1 — Staff/BE
2. Re-run live contacts/rooms and web↔mobile room interoperability QA — QA (M2)
3. Publicar `chatti-web-staging` only after an M2 staging-safe QA verdict; production remains out of scope

## Docs index

| Document | Purpose |
|----------|---------|
| `WEB-ARCHITECTURE.md` | Target architecture, API inventory, interop constraints |
| `WEB-ROADMAP.md` | M0–M4 milestones with status |
| `WEB-TASKS.md` | 24 tasks with ownership and status |
| `WEB-PARITY.md` | 26-feature mobile vs web matrix |
| `QA-REPORT.md` | QA gate report with bugs |
| `CLOUDFLARE-DEPLOYMENT.md` | Cloudflare deployment config |
| `BACKEND-AUDIT.md` | Deep backend technical audit (separate repo context) |
| `BACKEND-HARDENING-PLAN.md` | 5-phase backend production plan (separate repo context) |
