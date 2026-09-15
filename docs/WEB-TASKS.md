# Chatti Web — Task Board

Status: **Active** · Updated: 2026-09-10

Owners: **[FE]** Frontend Agent · **[BE]** Backend Agent · **[QA]** QA Agent

Priority: P0 (blocking) → P1 (high) → P2 (normal) → P3 (later)

Legend: ☐ open · ◐ in progress · ☑ done · ⚠️ blocked

---

## QA gate status

| Phase | Status | Notes |
|-------|--------|-------|
| M0 Foundations | ✅ PASS | 85/85 unit tests, encryption interop verified, build succeeds |
| M1 Core chat | ⚠️ BLOCKED | BUG-01 (backend auth 503) only — all FE work done (BUG-02/03/04/06 fixed, Tasks 11–12 done) |
| Full QA report | — | See `docs/QA-REPORT.md` |

---

## P0 tasks (M0 — DONE)

## Task 1 — Scaffold web app (P0, FE) ☑
☑ `web/` scaffolded: Vite + React 19 + TypeScript + react-router v7.
- `VITE_API_URL` defaulting to `https://chatti-workers.wz0un.workers.dev`, strict ESLint.
- `npm run dev` / `npm run build` scripts; build produces 300kB JS / 94kB gzip.

## Task 2 — Create `shared/` core module (P0, FE) ☑
☑ `shared/` created with:
- `types.ts` — User, Room, RoomMessage, Conversation, ContactRequest, DecryptedMessage, WS event union.
- `api/contracts.ts` — endpoint path constants + payload/response types (single source of truth).
- `i18n/translations.ts` — dictionary extracted verbatim (en/es/ar/fr) + `interpolate` helper.
- `storage/StorageAdapter.ts` — interface + localStorage impl with mobile-compatible keys.

## Task 3 — Port EncryptionService to WebCrypto (P0, FE) ☑
☑ `shared/crypto/EncryptionService.ts`:
- `modPow` BigInt identical; key storage via StorageAdapter.
- WebCrypto SHA-256 (`crypto.subtle.digest`) — **byte-identical** with mobile (fixed-vector tests).
- QA gate: ✅ cross-checked against mobile implementation.

## Task 4 — Port AuthService (P0, FE) ☑
☑ `shared/auth/`:
- `registerUser` / `loginUser` (same payloads; `expoPushToken: null` on web, `publicKey` from Task 3).
- Session via StorageAdapter (`userData`), `logout`, `getCurrentUser`.
- `deviceId` generation: `device_${ts}_${hash}_${rand}` with `navigator.userAgent` hash.
- QA gate: ✅ register + login against live worker verified.

## Task 5 — Port REST ApiService (P0, FE) ☑
☑ `shared/api/ApiService.ts` (fetch):
- rooms, users, dm, contacts, auth delete — all endpoints covered.
- Do NOT implement `listUsers`/`searchUsers` (backend disabled).
- QA gate: ✅ endpoint smoke tests vs live worker.

## Task 6 — Port room + DM WebSocket clients (P0, FE) ☑
☑ `shared/ws/RoomSocket.ts` + `shared/ws/DirectMessageSocket.ts`:
- Browser WebSocket, http→ws/wss transform, reconnect (max 5, backoff 2s × attempt, no reconnect on code 1000), event emitter API.
- RoomSocket: `join {username, userId}` — uses registered `userId` (mobile bug #5 not replicated).
- DirectMessageSocket: `join {userId, username, publicKey}`; `encrypted_message` handling; **fixes mobile bug #1** — initialized `participants` Map.
- ☑ **BUG-02:** reconnect wipes `listeners` Map — **FIXED** (only `disconnect()` clears listeners).

## Task 7 — Auth UI (login/register) (P0, FE) ☑
☑ `web/src/features/auth/`:
- Login/register tabs, mobile-identical validation (`name#disc` format, password ≥ 6, maxLength 20).
- i18n error/success strings, auto-login after register (3s), session restore on boot.
- Error banner + loading states, theme parity (gradient, orange/green).
- ⚠️ **BUG-01:** registration/login intermittently fail with 503 (backend issue, not our code).

## Task 8 — App shell + responsive layout (P0, FE) ☑
☑ `web/src/layout/`:
- AppShell with sidebar (Chats / Contacts / Rooms / Profile footer, badges) + conversation pane.
- Desktop (≥1024px): fixed 320px sidebar, master-detail.
- Tablet (768–1024px): collapsible sidebar.
- Mobile (<768px): single pane + bottom nav; chat opens full-screen.
- Theme via CSS variables; base styles for a11y (focus rings, contrast).

## Task 9 — Conversations feature (DM list) (P0, FE) ☑
☑ `web/src/features/conversations/`:
- `GET /api/dm/conversations`; dedupe + sort + recipient normalization (parity with `ConversationsScreen.js`).
- Search filter, unread dots from `lastSeen_{userId}`, 30s polling + refresh.
- Delete conversation (confirm dialog, `POST /api/dm/delete`).
- QA gate: ✅ parity checklist passed (same ordering, same unread semantics as mobile).

## Task 10 — DM chat (encrypted) (P0, FE) ☑
☑ `web/src/features/dm/`:
- Start conversation flow (`POST /api/dm/start` + `GET /api/users/public-key`).
- Message list (dedupe by id, auto-scroll), composer (Enter send / Shift+Enter newline), typing indicator (2s timeout), last-seen write.
- Encrypted status banner, connection warning/error banners.
- QA gate: ✅ fresh-session encrypted round-trip both directions passing.

---

## P1 tasks (M1 — IN PROGRESS)

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 11 | Contacts screen (list + add contact + requests accept/reject) | FE | ☑ DONE | Implemented + validated (typecheck/lint/85 tests pass) |
| 12 | Profile screen (language selector, delete account) | FE | ☑ DONE | en/es/ar/fr selector persists via `chatti_language`; confirmed delete-account flow with in-UI errors; static QA passed |

## P1 tasks (M2 — TODO)

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 13 | Room list screen (paginated, create-room modal) | FE | ☑ DONE | `RoomsPage.tsx` (255 lines) + `rooms.css` (387 lines); typecheck/lint/85 tests pass |
| 14 | Room chat screen (history, typing, join/leave, presence) | FE | ☑ DONE | `RoomChatPage.tsx` and `/room/:roomId` implemented; live QA remains blocked/not run |
| 15 | Badges + polling for unread chats & pending requests | FE | ☑ DONE | `useSectionBadges` — 30s polling + focus refresh, 99+ cap |
| 20 | QA regression suite: parity matrix checklist per release | QA | ☑ DONE | `npm run qa:regression` (92 tests: 85 unit + 5 interop + 2 reconnect) + `npm run smoke`; docs en `docs/QA-REGRESSION.md`. Interop ahora reproducible (shims en-repo) |

## P2 tasks (M3 — TODO)

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 16 | Deep-linkable routes + browser history | FE | ☐ TODO | BUG-05: BrowserRouter refresh = blank page |
| 17 | In-app notification toasts (web replacement for push) | FE | ☐ TODO | |
| 18 | Arabic RTL layout + full a11y pass | FE | ☐ TODO | BUG-07: contrast issues found in QA |
| 19 | Real dark mode (CSS variables swap) | FE | ☐ TODO | |
| 21 | QA: Playwright E2E smoke | QA | ☐ TODO | |
| 24 | CI pipeline: lint + typecheck + unit tests | FE | ☐ TODO | |

## P3 tasks (M4 — TODO)

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 22 | Web Push notifications: Service Worker + VAPID + backend endpoint | BE + FE | ☐ TODO | Requires backend change |
| 23 | Consolidate mobile onto `shared/` (remove duplicated logic) | FE + QA | ☐ TODO | QA-gated, optional for web delivery |

---

## Known bugs (see `docs/QA-REPORT.md` for full details)

| ID | Severity | Task | Description | Owner | Status |
|----|----------|------|-------------|-------|--------|
| BUG-01 | 🔴 CRITICAL | 7 | Backend auth 503 (`error code: 1102`) — registration/login intermittently fail | BE | ☐ BLOCKED (backend) |
| BUG-02 | 🟠 HIGH | 6 | WebSocket reconnect wipes `listeners` Map — DM reconnect silently breaks | FE | ☑ FIXED |
| BUG-03 | 🟡 MEDIUM | 9 | Conversation delete was context-menu-only | FE | ☑ FIXED (visible touch/hover control + keyboard route) |
| BUG-04 | 🟡 MEDIUM | 10 | `lastSeen` not updated on incoming messages in DM chat | FE | ☑ FIXED |
| BUG-05 | 🟡 MEDIUM | 16 | No deep-linkable routes — SPA refresh = blank page | FE | ☐ TODO (M3) |
| BUG-06 | 🟢 LOW | 9 | i18n key mismatch in empty-search subtext | FE | ☑ FIXED |
| BUG-07 | 🟢 LOW | 18 | Insufficient color contrast on DM composer placeholder | FE | ☐ TODO (M3) |

---

## Agent ground rules

- **FE owns all `web/` and `shared/` code.** No mobile file under `App.js`, `src/`, `index.js`, `app.json`, `eas.json` may be modified without CTO sign-off (documented bug fixes only).
- **BE only acts when web requires a backend change** (currently: BUG-01 backend fix; Task 22 later). Any backend change must keep mobile working — QA runs mobile regression.
- **QA validates both web functionality and mobile regression**, with the parity matrix in WEB-PARITY.md as the acceptance checklist.
