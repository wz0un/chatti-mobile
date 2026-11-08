# Chatti Web — Roadmap

Status: **In Progress** · Owner: CTO · Updated: 2026-11-08 (Wave 2 desplegada en producción)

Guiding principles:
1. **Mobile is the source of truth** — it keeps working; nothing in `App.js`/`src/` is rewritten for web delivery.
2. **One backend** — web consumes the same Cloudflare Worker; no API duplication.
3. **One business core** — `shared/` holds contracts, protocol, crypto, auth and i18n used by `web/` (mobile adopts it in Phase 2, QA-gated).
4. **Working increments over big-bang delivery** — each milestone ends with a testable vertical slice.

## Phase 0 — Foundations (M0) ✅ DONE

Goal: repo structure, shared core skeleton, dev tooling, CI checks.

- [x] `web/` scaffold: Vite + React 19 + TypeScript + react-router v7.
- [x] `shared/` module: types, API contracts, WS event types, i18n dictionary extraction.
- [x] Storage adapter (localStorage) with mobile-compatible keys.
- [x] Auth core port (register/login/logout/session/deviceId).
- [x] Encryption core port (WebCrypto SHA-256 + BigInt modPow) — byte-compat spec + unit tests with fixed vectors.
- [x] Environment config: `VITE_API_URL` defaulting to production worker, local override.
- [x] QA gate: 125/125 web unit tests pass (9 files, `c5610c9`); encryption interop verified (byte-identical with mobile).

**Exit criteria:** ✅ Web app boots, logs in/registers against the live backend, persists session, and a unit-tested encryption port.

## Phase 1 — Core chat vertical slice (M1) ✅ UNBLOCKED (BUG-01 resolved in production 2026-11-08)

Goal: the daily-driver path — login → Chats → DM chat → Contacts.

1. [x] Auth screens (login/register tabs, validation parity, error i18n).
2. [x] App shell: sidebar (Chats / Contacts / Rooms / Profile) + conversation pane, responsive.
3. [x] Conversations list (fetch, dedupe/sort parity, search, unread dots, badges, 30s polling).
4. [x] DM socket (encrypted) + message list + composer + typing indicator + last-seen update.
5. [x] Contacts screen (list, add contact, requests accept/reject) — **Task 11 done.**
6. [x] Profile screen (user card, copy device ID, language selector, logout, delete account).

**Exit criteria:** a web user can register/login, add a contact, start an encrypted DM, and exchange messages with a **mobile** user (interop test). QA sign-off.

### M1 blockers (see `docs/QA-REPORT.md`)

| Bug | Severity | Status | Description | Impact |
|-----|----------|--------|-------------|--------|
| BUG-01 | 🔴 CRITICAL | ✅ FIXED en producción (2026-11-08) | Backend auth 503 (`error code: 1102`) por bcrypt en Workers → PBKDF2 nativo; desplegado vía #58/#62 y verificado black-box (discriminador 72 B → 401; probe 36/36 × 2 sin 5xx). Ver `.mece/cells/QA-WAVE-2/POST-DEPLOY.md` | — |
| BUG-02 | 🟠 HIGH | ☑ FIXED | WebSocket reconnect wipes `listeners` Map | DM reconnection breaks silently; messages stop rendering |
| BUG-04 | 🟡 MEDIUM | ☑ FIXED | `lastSeen` not updated on incoming DM messages | Unread markers drift from actual read state |
| BUG-06 | 🟢 LOW | ☑ FIXED | i18n key mismatch in empty-search subtext | Cosmetic, but leaks raw key |

**M1 can pass QA when:** BUG-01 is resolved (backend-side). ✅ Resuelto y desplegado (2026-11-08). All FE fixes are done (BUG-02, BUG-03, BUG-04, BUG-06 + Tasks 11–12); el gate formal de M1 queda pendiente de re-ejecución QA/CTO.

## Phase 2 — Rooms (M2) ✅ IMPLEMENTED — live interop PASS; contacto web→móvil verificado 2026-11-08

Goal: room feature parity.

1. [x] Room list (paginated, create-room modal, gradient header) — **Task 13 done.**
2. [x] Room chat: WS join/history/messages/typing/join-leave system messages, presence count — **Task 14 done.**
3. [x] Unread/refresh behavior parity (30s polling + focus refresh).

**Exit criteria:** rooms work web ⇄ web and web ⇄ mobile; QA sign-off. **Estado:** interop live PASS 2026-09-15; el finding 4 (contacto web→móvil) quedó corregido y **verificado live el 2026-11-08** (`deviceId` nuevo adoptado; el viejo devuelve 404). Queda pendiente el gate formal de QA/CTO de M2.

## Phase 3 — Web UX upgrades (M3) 🔲 TODO

Goal: take advantage of desktop/web while preserving parity (no backend changes).

1. Deep-linkable routes + browser history (`/room/:roomId`, `/dm/:conversationId`) — ◐ implementado en código (rutas + SPA fallback), pendiente QA/CTO.
2. Keyboard shortcuts (Enter to send, Ctrl+K search, Esc to close).
3. In-app notification toasts (replaces local push notifications on web).
4. RTL layout for Arabic; accessibility pass (aria-live, focus management, semantic HTML).
5. Real dark mode toggle (mobile toggle is a no-op; web implements it properly).
6. Presence/online improvements where WS events allow (e.g., live badge refresh on `user_joined`).

**Exit criteria:** QA a11y + responsive pass (desktop 1280px, tablet 768px, mobile 375px); Lighthouse ≥ 90 for accessibility.

## Phase 4 — Consolidation & hardening (M4, optional) 🔲 TODO

Goal: remove duplicated business logic while keeping mobile regression-free.

1. Point mobile services at `shared/` (encryption, ApiService, WS protocol, i18n dictionary) — one copy of business logic.
2. QA: full mobile regression suite against production backend.
3. Push notifications: Web Push + Service Worker + Backend endpoint (`POST /api/auth/webpush`), VAPID keys — **desplegado: producción sirve `sw-2` (verificado 2026-11-08); BUG-NEW-01/BUG-NEW-03 cerrados; QA técnica PASS (125/125); pendiente única la prueba manual de entrega en navegador real + sign-off CTO/Staff.**
4. CI: lint + typecheck + tests for `web/` and `shared/` — **implementado (`web.yml`, PR #50/#53) y `backend.yml` (PR #38); pendiente QA/CTO.** E2E smoke tests (Playwright) siguen TODO.

**Exit criteria:** mobile regression green; optional push notifications shipped; no duplicated business logic.

## Milestone summary

| Milestone | Scope | Status | Owner | Depends on |
|-----------|-------|--------|-------|------------|
| M0 | Foundations + shared core | ✅ DONE | Frontend | — |
| M1 | Auth, DMs, Contacts, Profile | ✅ UNBLOCKED (BUG-01 PASS post-deploy 2026-11-08; gate formal pendiente) | Frontend | M0 — done |
| M2 | Rooms | ⚠️ IMPLEMENTED — live interop PASS 2026-09-15; contacto web→móvil **verificado live 2026-11-08**; gate formal pendiente | Frontend + QA | live auth/session + room interop verification |
| M3 | Web UX upgrades | 🔲 TODO (deep links ◐ implementados en código) | Frontend | M2 |
| M4 | Consolidation, push, CI | ◐ push desplegado (`sw-2` live); CI implementado; pendiente prueba manual + sign-off | Frontend + Backend + QA | M3 |

## Risk gates

- Encryption interop (web ⇄ mobile) must pass **before** M1 exit — it is the highest-risk integration. ✅ Already passing.
- Mobile regression checks run after every phase that touches `shared/` (M4) — Phase 1–3 never import mobile files, so regression risk is near zero there.
