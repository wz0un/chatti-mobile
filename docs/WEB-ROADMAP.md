# Chatti Web — Roadmap

Status: Approved · Owner: CTO · Updated: 2026-08-11

Guiding principles:
1. **Mobile is the source of truth** — it keeps working; nothing in `App.js`/`src/` is rewritten for web delivery.
2. **One backend** — web consumes the same Cloudflare Worker; no API duplication.
3. **One business core** — `shared/` holds contracts, protocol, crypto, auth and i18n used by `web/` (mobile adopts it in Phase 2, QA-gated).
4. **Working increments over big-bang delivery** — each milestone ends with a testable vertical slice.

## Phase 0 — Foundations (M0)

Goal: repo structure, shared core skeleton, dev tooling, CI checks.

- [ ] `web/` scaffold: Vite + React 19 + TypeScript + react-router v7.
- [ ] `shared/` module: types, API contracts, WS event types, i18n dictionary extraction.
- [ ] Storage adapter (localStorage) with mobile-compatible keys.
- [ ] Auth core port (register/login/logout/session/deviceId).
- [ ] Encryption core port (WebCrypto SHA-256 + BigInt modPow) — byte-compat spec + unit tests with fixed vectors.
- [ ] Environment config: `VITE_API_URL` defaulting to production worker, local override.
- [ ] QA gate: shared-core unit tests pass; API smoke tests vs live worker.

**Exit criteria:** web app boots, logs in/registers against the live backend, persists session, and a unit-tested encryption port.

## Phase 1 — Core chat vertical slice (M1)

Goal: the daily-driver path — login → Chats → DM chat → Contacts.

1. Auth screens (login/register tabs, validation parity, error i18n).
2. App shell: sidebar (Chats / Contacts / Rooms / Profile) + conversation pane, responsive.
3. Conversations list (fetch, dedupe/sort parity, search, unread dots, badges, 30s polling).
4. DM socket (encrypted) + message list + composer + typing indicator + last-seen update.
5. Contacts screen (list, add contact, requests accept/reject) — needed to start DMs with new people.
6. Profile screen (user card, copy device ID, language selector, logout, delete account).

**Exit criteria:** a web user can register/login, add a contact, start an encrypted DM, and exchange messages with a **mobile** user (interop test). QA sign-off.

## Phase 2 — Rooms (M2)

Goal: room feature parity.

1. Room list (paginated, create-room modal, gradient header).
2. Room chat: WS join/history/messages/typing/join-leave system messages, presence count.
3. Unread/refresh behavior parity (30s polling + focus refresh).

**Exit criteria:** rooms work web ⇄ web and web ⇄ mobile; QA sign-off.

## Phase 3 — Web UX upgrades (M3)

Goal: take advantage of desktop/web while preserving parity (no backend changes).

1. Deep-linkable routes + browser history (`/chat/:roomId`, `/dm/:conversationId`).
2. Keyboard shortcuts (Enter to send, Ctrl+K search, Esc to close).
3. In-app notification toasts (replaces local push notifications on web).
4. RTL layout for Arabic; accessibility pass (aria-live, focus management, semantic HTML).
5. Real dark mode toggle (mobile toggle is a no-op; web implements it properly).
6. Presence/online improvements where WS events allow (e.g., live badge refresh on `user_joined`).

**Exit criteria:** QA a11y + responsive pass (desktop 1280px, tablet 768px, mobile 375px); Lighthouse ≥ 90 for accessibility.

## Phase 4 — Consolidation & hardening (M4, optional)

Goal: remove duplicated business logic while keeping mobile regression-free.

1. Point mobile services at `shared/` (encryption, ApiService, WS protocol, i18n dictionary) — one copy of business logic.
2. QA: full mobile regression suite against production backend.
3. Push notifications research: Web Push + Service Worker + Backend Agent endpoint (`/api/auth/update-push-token` variant or new `/api/auth/webpush`), VAPID keys.
4. CI: lint + typecheck + tests for `web/` and `shared/`; E2E smoke tests (Playwright) for core flows.

**Exit criteria:** mobile regression green; optional push notifications shipped; no duplicated business logic.

## Milestone summary

| Milestone | Scope | Owner | Depends on |
|-----------|-------|-------|------------|
| M0 | Foundations + shared core | Frontend | — |
| M1 | Auth, DMs, Contacts, Profile | Frontend | M0 |
| M2 | Rooms | Frontend | M1 |
| M3 | Web UX upgrades | Frontend | M2 |
| M4 | Consolidation, push, CI | Frontend + Backend + QA | M3 |

## Risk gates

- Encryption interop (web ⇄ mobile) must pass **before** M1 exit — it is the highest-risk integration.
- Mobile regression checks run after every phase that touches `shared/` (M4) — Phase 1–3 never import mobile files, so regression risk is near zero there.
