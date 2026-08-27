# Chatti Mobile — Current Status

Updated: 2026-08-27

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
| Contacts screen | ❌ Not started | T11 |
| Profile (language selector, delete) | ❌ Not started | T12 |
| Room list/chat | ❌ Not started | T13-T14 |
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
| M0 Foundations | Unit tests + build | ✅ PASS (83/83 tests, 300kB JS / 94kB gzip) |
| M0 Foundations | Encryption interop | ✅ PASS (byte-identical with mobile) |
| M1 Core chat | Fresh-session DM round-trip | ✅ PASS |
| M1 Core chat | Auth (register/login) | ⚠️ BLOCKED (backend 503) |
| M1 Core chat | DM reconnect | ❌ FAIL (BUG-02: listener wipe) |
| M1 Core chat | Contacts screen | ❌ NOT STARTED |
| M1 Core chat | Full QA gate | ❌ FAIL (1 critical + 1 high + 4 medium/low bugs) |

Full report: `docs/QA-REPORT.md`

## Blockers

1. **BUG-01 (CRITICAL):** Backend auth 503 — registration/login intermittently fail. Backend-side issue. Affects mobile too.
2. **BUG-02 (HIGH):** WebSocket reconnect wipes `listeners` Map — DM messages stop rendering after reconnect. Frontend fix needed.

## Next steps

1. Fix BUG-02 (WebSocket reconnect listener wipe) — FE
2. Implement Task 11 (Contacts screen) — FE
3. Wait for backend auth fix (BUG-01) — BE
4. M1 QA re-run after fixes + Task 11
5. Proceed to M2 (Rooms) after M1 passes

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
