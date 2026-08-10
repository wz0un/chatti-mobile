# Chatti Web — Task Board

Status: Active · Updated: 2026-08-11

Owners: **[FE]** Frontend Agent · **[BE]** Backend Agent · **[QA]** QA Agent

Priority: P0 (blocking) → P1 (high) → P2 (normal) → P3 (later)

Legend: ☐ open · ◐ in progress · ☑ done

---

## Task 1 — Scaffold web app (P0, FE)
☐ Create `web/` with Vite + React 19 + TypeScript + react-router v7.
- App entry, Vite config with `VITE_API_URL` env (default `https://chatti-workers.wz0un.workers.dev`), ESLint/TS strict.
- `npm run dev` / `npm run build` scripts; verify blank shell renders.
- Reference: `chatti-mobile/package.json` (React 19), `app.json` web section.

## Task 2 — Create `shared/` core module (P0, FE)
☐ Create `shared/` with:
- `types.ts` — User, Room, RoomMessage, Conversation, ContactRequest, DecryptedMessage, WS event union.
- `api/contracts.ts` — endpoint path constants + payload/response types (single source of truth, mirror of `src/services/ApiService.js`).
- `i18n/translations.ts` — dictionary extracted verbatim from `src/i18n/index.js` (en/es/ar/fr) + `interpolate` helper (pure function).
- `storage/StorageAdapter.ts` — interface + localStorage impl with mobile key names (`userData`, `deviceId`, `lastSeen_{userId}`, `chatti_language`, `e2e_key_pair_v2`, `e2e_public_key_v2`).

## Task 3 — Port EncryptionService to WebCrypto (P0, FE)
☐ Port `src/services/EncryptionService.js` (DH Group 14, SHA-256, XOR) to `shared/crypto/EncryptionService.ts`:
- `modPow` BigInt identical; key storage via StorageAdapter.
- Replace `expo-crypto digestStringAsync` with `crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))` → hex — **byte-identical** (spec in WEB-ARCHITECTURE §5.2).
- Unit tests with fixed vectors (P, G, known private key → expected public key, known plaintext → expected ciphertext, generated from the mobile implementation).
- QA gate: cross-check ciphertext against mobile's `EncryptionService`.

## Task 4 — Port AuthService (P0, FE)
☐ Port `src/services/AuthService.js` → `shared/auth/`:
- `registerUser` / `loginUser` (same payloads; `expoPushToken: null` on web, `publicKey` from Task 3).
- Session via StorageAdapter (`userData`), `logout`, `getCurrentUser`.
- `deviceId` generation mirroring `device_${ts}_${hash}_${rand}` with `navigator.userAgent` hash.
- QA: register + login against live worker with a throwaway account; verify `fullUsername` format `name#disc`.

## Task 5 — Port REST ApiService (P0, FE)
☐ Port `src/services/ApiService.js` → `shared/api/ApiService.ts` (fetch):
- rooms (list/create/info/messages/post), users (find/by-device-id/public-key), dm (start/conversations/delete), contacts (list/request/requests/accept/reject), auth delete.
- Do NOT implement `listUsers`/`searchUsers` (backend disabled).
- QA: endpoint smoke tests vs live worker (shape assertions).

## Task 6 — Port room + DM WebSocket clients (P0, FE)
☐ Port `src/services/ChatService.js` → `shared/ws/RoomSocket.ts` and `src/services/DirectMessageService.js` → `shared/ws/DirectMessageSocket.ts`:
- Browser WebSocket, URL transform http→ws / https→wss, reconnect policy (max 5, backoff 2s × attempt, no reconnect on code 1000), event emitter API (`on/off/emit`) — same event names as mobile.
- RoomSocket: `join {username, userId}` — use the **registered** `userId` (mobile bug #5 not replicated).
- DirectMessageSocket: `join {userId, username, publicKey}`; `encrypted_message` with `senderPublicKey`; key exchange handling; **fix mobile bug #1** — initialize `participants` Map (or drop the lookup) so incoming DMs from the peer render correctly.
- QA: WS protocol conformance test against live worker with two sessions.

## Task 7 — Auth UI (login/register) (P0, FE)
☐ `web/src/features/auth/`: login/register tabs with mobile-identical validation (format `name#disc`, password ≥ 6, maxLength 20), i18n error/success strings, auto-login after register (3s), session restore on boot, error banner + loading states, theme parity (gradient, orange/green).

## Task 8 — App shell + responsive layout (P0, FE)
☐ `web/src/layout/`: AppShell with sidebar (Chats / Contacts / Rooms sections + Profile footer, badges for unread chats & pending requests) + conversation pane.
- Desktop (≥1024px): fixed 320px sidebar, master-detail.
- Tablet (768–1024px): collapsible sidebar.
- Mobile (<768px): single pane + bottom nav; chat opens full-screen.
- Theme via CSS variables extracted from `src/theme/colors.js`; base styles for a11y (focus rings, contrast).

## Task 9 — Conversations feature (DM list) (P0, FE)
☐ `web/src/features/conversations/`:
- Fetch `GET /api/dm/conversations`; dedupe + sort + recipient normalization (exact parity with `src/screens/ConversationsScreen.js` logic).
- Search filter, unread dots from `lastSeen_{userId}` (port of `lastSeen` logic), 30s polling + refresh.
- Delete conversation (confirm dialog, `POST /api/dm/delete`).
- QA: parity checklist — same ordering, same unread semantics as mobile.

## Task 10 — DM chat (encrypted) (P0, FE)
☐ `web/src/features/dm/`:
- Start conversation flow (`POST /api/dm/start` + `GET /api/users/public-key` — the mobile "fetch full user" workaround pattern from `ContactsScreen`/`UsersListScreen`).
- Message list (dedupe by id, auto-scroll), composer (Enter send / Shift+Enter newline), typing indicator with 2s timeout, last-seen write on open & on message.
- Encrypted status banner, connection warning/error banners (mobile parity).
- **QA gate: web ⇄ mobile encrypted interop test — web user and mobile user exchange messages in both directions.**

---

## Next tasks (Phase 1/2 backlog, owners as tagged)

| # | Task | Owner | Priority |
|---|------|-------|----------|
| 11 | Contacts screen (list + add contact + requests accept/reject) | FE | P1 |
| 12 | Profile screen (user card, copy deviceId, language selector, logout, delete account) | FE | P1 |
| 13 | Room list screen (paginated, create-room modal) | FE | P1 |
| 14 | Room chat screen (history, typing, join/leave system messages, presence) | FE | P1 |
| 15 | Badges + polling for unread chats & pending requests (app shell integration) | FE | P1 |
| 16 | Deep-linkable routes + browser history (`/chat/:roomId`, `/dm/:conversationId`) | FE | P2 |
| 17 | In-app notification toasts for new messages (web replacement for push) | FE | P2 |
| 18 | Arabic RTL layout (`dir="rtl"`) + full a11y pass (aria-live, focus mgmt) | FE | P2 |
| 19 | Real dark mode (CSS variables swap; mobile toggle stays a no-op) | FE | P2 |
| 20 | QA regression suite: parity matrix checklist per release | QA | P1 |
| 21 | QA: Playwright E2E smoke (login → contacts → DM → rooms) | QA | P2 |
| 22 | Web Push notifications: Service Worker + VAPID + backend endpoint | BE + FE | P3 |
| 23 | Consolidate mobile onto `shared/` (remove duplicated logic) | FE + QA | P3 |
| 24 | CI pipeline: lint + typecheck + unit tests for `web/` and `shared/` | FE | P2 |

---

## Agent ground rules

- **FE owns all `web/` and `shared/` code.** No mobile file under `App.js`, `src/`, `index.js`, `app.json`, `eas.json` may be modified without CTO sign-off (documented bug fixes only).
- **BE only acts when web requires a backend change** (currently: none for core parity; Task 22 later). Any backend change must keep mobile working — QA runs mobile regression.
- **QA validates both web functionality and mobile regression**, with the parity matrix in WEB-PARITY.md as the acceptance checklist.
