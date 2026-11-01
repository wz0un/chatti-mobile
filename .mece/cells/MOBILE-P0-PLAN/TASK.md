# MOBILE-P0-PLAN

Analysis only. Read `AGENTS.md` and `.mece/WAVE-2.md` first. The mobile app (`App.js`, `src/`, `index.js`, `app.json`, `eas.json`) is the production source of truth, and AGENTS.md forbids modifying it without explicit Staff approval. In this phase you must not edit any of those files. You may write only `.mece/cells/MOBILE-P0-PLAN/REPORT.md`.

## Objective

Read GitHub issues #14, #15 and #16 (all P0, opened 2026-08-31) and write an implementation plan for each, based on the root cause in the current code:

- **#14**: replace the XOR cipher used for the local chat history with authenticated encryption. Start in `src/services/ChatHistoryService.js` (XOR with a local key and IV).
- **#15**: fix room history persistence and the `saved_history` event. Start in `src/services/ChatService.js` (it emits `saved_history`) and `src/services/ChatHistoryService.js`.
- **#16**: preserve `userId` and session state across a WebSocket reconnection. `docs/QA-M2-INTEROP.md`, finding 3, shows the mobile app joining rooms with an ephemeral `userId` per connection (mobile bug #5, see `docs/WEB-ARCHITECTURE.md` section 2).

For each issue, report: the root cause with file and line evidence; the proposed change and the files it touches; the risk to data already stored on users' devices (#14 needs a migration path for history already encrypted with XOR: say whether it is possible and what would be lost otherwise); the risk to web and mobile interop; the tests required; and the effort (S, M or L).

## Constraints

- The end-to-end encryption of direct messages (Diffie-Hellman plus XOR in `src/services/EncryptionService.js`) is byte-identical with the web client and covered by the interop tests (`qa:interop` in `web/`). #14 concerns the local history storage only. If you think the DM wire format must change, list every web change that would require instead of proposing it silently.
- Any future fix must keep `qa:regression` (92 tests in `web/`) and the interop probes green.

## Phase 2: LOCKED

Implementation may start only after Staff writes a line `STAFF-APPROVAL: <date> <issues> <scope>` under this paragraph. Until then, do nothing beyond phase 1. Once approved: one branch per issue (`bugfix/mobile-<issue>-<name>`) from `dev`, one pull request each into `dev`, documented bugs only, and mobile regression QA plus CTO/Staff sign-off before anything is called DONE.

STAFF-APPROVAL: (none)

## Delivery

`REPORT.md` with the three plans, a recommended order, the open questions for Staff, STATUS delta, and session id.
