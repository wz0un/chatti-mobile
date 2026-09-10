# CTO-WEB-STABILITY — Completion Report

**Session ID:** CTO-WEB-STABILITY-2026-09-10
**Date:** 2026-09-10
**Status:** COMPLETE

---

## Summary

Fixed 3 confirmed M1 web regressions (BUG-02, BUG-04, BUG-06) plus 1 additional reconnect-counter bug discovered during testing. Added regression tests. All verifications pass.

---

## Bugs Fixed

### BUG-02 (HIGH) — Listeners wiped on reconnect
- **File:** `shared/ws/DirectMessageSocket.ts`
- **Root cause:** `connect()` called `disconnect()` which cleared all event listeners, so after any reconnect the UI lost all event handlers (message, typing, connected, etc.)
- **Fix:** `connect()` now closes the prior socket directly (`this.ws.onclose = null; this.ws.close(); this.ws = null`) without touching the listener Map. Only intentional teardown via `disconnect()` clears listeners.
- **Additionally:** Removed `this.reconnectAttempts = 0` from the top of `connect()` — it was resetting the reconnect counter on every reconnect call, making the max-attempts safety net unreachable. The counter now only resets on successful open (`onopen` handler, line 122).

### BUG-04 (MEDIUM) — lastSeen not updated
- **File:** `web/src/features/dm/DirectMessagePage.tsx`
- **Root cause:** `lastSeen` was never written when receiving messages or history, so conversation list never showed correct timestamps.
- **Fix:** Added `lastSeen` persistence in two handlers:
  - `socket.on('message')` — writes `lastSeen[recipientId] = Date.now()` for incoming messages (only when `data.senderId !== user.userId`)
  - `socket.on('history')` — writes `lastSeen[recipientId] = Date.now()` when history has messages

### BUG-06 (LOW) — i18n key mismatch
- **File:** `web/src/features/conversations/ConversationsPage.tsx:215`
- **Root cause:** Used `login.errors.registerError` (login-namespace key) for the empty-search subtext.
- **Fix:** Replaced with `usersList.emptySearch` — an existing key present in all 4 locales (en/es/ar/fr).

---

## Regression Tests Added

### `shared/ws/DirectMessageSocket.test.ts`

1. **`BUG-02 regression: listeners survive reconnect after abnormal close`** (new test)
   - Registers `onMessage`, `onTyping`, `onConnected` listeners before reconnect
   - Triggers abnormal close + reconnect + incoming events
   - Asserts all listeners fire after reconnect
   - Asserts `disconnect()` still clears listeners (intentional teardown)

2. **`stops after max reconnect attempts and emits error to listeners`** (updated test)
   - Previously expected `onError` NOT to be called (pre-BUG-02 behavior)
   - Now expects `errorSpy` to be called with `'Max DM reconnection attempts reached'` and `onError` to be called with `{ message: 'Could not connect to encrypted chat server' }`

---

## Verification Results

| Check | Result |
|-------|--------|
| `npm run typecheck` (web/) | PASS — zero errors |
| `npm run lint` (web/) | PASS — zero errors |
| `npm test` (web/, vitest) | PASS — 6 files, **85/85 tests** |

---

## Files Changed (4 files, +129/-10)

| File | Change |
|------|--------|
| `shared/ws/DirectMessageSocket.ts` | BUG-02 fix: connect() no longer calls disconnect(); reconnect counter accumulates properly |
| `shared/ws/DirectMessageSocket.test.ts` | BUG-02 regression test + updated reconnect-limit test |
| `web/src/features/dm/DirectMessagePage.tsx` | BUG-04 fix: lastSeen persistence on incoming messages + history |
| `web/src/features/conversations/ConversationsPage.tsx` | BUG-06 fix: i18n key corrected to `usersList.emptySearch` |

---

## Blockers / Residual Risks

| Issue | Severity | Status |
|-------|----------|--------|
| BUG-01: Backend auth 503 (`error code: 1102`) | CRITICAL | Out of scope — backend-side, affects mobile too |
| DM WS `history` event never emitted by worker | MEDIUM | Backend behavior, documented, not a web defect |
| Git push blocked (no GitHub credentials) | LOW | Needs `gh auth login` or SSH key |
| Task 11 (Contacts screen) — placeholder only | MEDIUM | Not started, required for M1 QA gate |
