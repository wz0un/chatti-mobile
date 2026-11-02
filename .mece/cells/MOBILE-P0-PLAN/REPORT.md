# MOBILE-P0-PLAN — Implementation plan (analysis only)

Branch base: `origin/dev` @ `2a331a7` (worktree `/tmp/opencode/wave2-mobile`). Phase 2 LOCKED (`STAFF-APPROVAL: none`). No mobile source edits performed.

## #14 — Replace XOR local history cipher with authenticated encryption

- Root cause: `src/services/ChatHistoryService.js` `_encryptString`/`_decryptString` (lines ~78-160) use XOR with a SHA256-derived key material + IV; no integrity/MAC, malleable, key stored in AsyncStorage as plaintext hex. `_getLocalKey` (lines 52-76) stores key under `chat_history_local_key_<userId>`.
- Proposed change: use authenticated encryption (AES-256-GCM via `expo-crypto`/WebCrypto or `react-native-quick-crypto`) with random 12-byte nonce + 16-byte tag; key stored in OS keystore (Expo SecureStore / Keychain/Keystore) instead of AsyncStorage. Payload format `{ v, nonce, ct, tag }`.
- Files: `ChatHistoryService.js` (cipher + key storage), possibly `package.json` (native crypto dep), `app.json` (SecureStore config). DM wire format unchanged (local at-rest only).
- Migration risk: existing XOR blobs (`{iv,data}`) detectable by shape; on read, attempt new format first, fall back to XOR decrypt once and re-encrypt to new format, then delete legacy. If migration not implemented, old history becomes unreadable → loss of stored DM history (acceptable if user opts in; must warn). No message server-side recovery.
- Interop risk: none for wire format (local only). Risk: native module availability across Expo Go vs dev build; must keep `qa:regression`/interop green (they don't touch mobile).
- Tests: unit tests for encrypt/decrypt roundtrip, tamper detection (GCM auth fail), migration from XOR fixture, missing-key fallback, history toggle.
- Effort: M.

## #15 — Room history persistence and `saved_history` event

- Root cause: `ChatService.connect` calls `_loadSavedRoomHistory` only when `userId` provided (line ~33); reconnect path calls `this.connect(roomId, username, workerUrl)` without userId → falls back to `generateUserId()` and skips history load. `saved_history` emitted after async load; listeners registration timing? Also `appendRoomMessages` called per message but `saveRoomMessages` only on disconnect; concurrent appends could race. Room messages stored plaintext.
- Proposed change: persist `userId` (see #16) so reconnect keeps identity; call `_loadSavedRoomHistory` regardless using stored userId; emit `saved_history` with dedup by id; make append atomic/queued; handle history-disabled gracefully; maybe emit even when empty? Keep contract.
- Files: `ChatService.js` (connect/reconnect, saved_history), `ChatHistoryService.js` (room append/load atomicity).
- Migration risk: none (plaintext room history).
- Interop risk: `saved_history` is mobile-local event; no wire change. Web rooms are ephemeral (no REST history) so no parity expectation beyond live messages.
- Tests: reconnect preserves messageIds; saved_history emitted once; dedup on duplicate message ids; history disabled → no emit.
- Effort: M (depends on #16).

## #16 — Preserve userId and session across WebSocket reconnect

- Root cause: `ChatService.connect(roomId, username, workerUrl, userId = null)` (line ~24) sets `this.userId = userId || this.generateUserId()` (ephemeral). Reconnect in `onclose` (line ~95) calls `this.connect(roomId, username, workerUrl)` dropping userId → new ephemeral id each reconnect (confirmed in QA-M2-INTEROP finding 3). Also no cancellation of reconnect after manual `disconnect()` (disconnect sets ws=null but pending setTimeout may still fire; `reconnectAttempts` reset? disconnect doesn't set a flag).
- Proposed change: store userId in instance and reuse on reconnect; add `this._manualDisconnect` flag set in `disconnect()`, reset on connect; reconnect callback checks flag; pass userId through reconnect call; persist userId to AsyncStorage/SecureStore for app restarts? Scope: at least within session.
- Files: `ChatService.js`.
- Migration risk: none.
- Interop risk: web RoomSocket uses registered user id; mobile sending stable userId improves presence/identity. No wire format change. Backend may need to handle same userId rejoin (already does).
- Tests: reconnect keeps userId; manual disconnect cancels reconnect; max attempts; rejoin emits connected.
- Effort: S.

## Recommended order

1. #16 (S) — prerequisite for #15 identity/history.
2. #15 (M) — depends on #16.
3. #14 (M) — independent but touches same service; do after #15 to avoid conflicts, or parallel branch with careful merge. Crypto migration needs QA device testing.

## Open questions for Staff

1. Approved crypto library for React Native/Expo (SecureStore availability in Expo Go vs dev client)?
2. Migration policy for legacy XOR history: auto-migrate silently or prompt user / wipe?
3. Should room history be encrypted at rest too (currently plaintext by design)?
4. Stable userId persistence across app restarts vs session only?
5. Any change to DM wire format? (No, proposed local-only.)

## STATUS delta

- Phase 2 remains LOCKED. No code changed. Three P0 issues remain OPEN. Plans documented in this report; awaiting `STAFF-APPROVAL`.

## Session id

MOBILE-P0-PLAN / worktree `/tmp/opencode/wave2-mobile` (detached @ 2a331a7).
