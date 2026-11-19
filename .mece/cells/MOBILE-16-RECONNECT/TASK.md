# MOBILE-16-RECONNECT — GitHub/Trello P0 #16

This is an implementation cell under the Staff approval in `.mece/cells/MOBILE-P0-PLAN/TASK.md`. Read `AGENTS.md`, `.mece/WAVE-3.md`, the approval, and the current GitHub issue before editing. Work only on branch `bugfix/mobile-16-session-reconnect-android-qa`, based on `origin/dev`.

## Objective

Fix mobile room WebSocket reconnection so the same `userId` and session state survive automatic retries, and a user-initiated disconnect cancels any pending retry. Confirm current root cause against `src/services/ChatService.js`; the prior plan may be stale.

## Acceptance criteria

- A reconnect reuses the same `userId` sent by the original `join`.
- A manual `disconnect()` prevents both a pending timer and a later close callback from opening another socket.
- A stale socket callback cannot reconnect after a newer connection has replaced it.
- Existing `connect(roomId, username, workerUrl, userId)` callers remain compatible.
- No change to the wire protocol, other mobile behavior, or web/shared files.
- Add or adapt automated coverage only if the repository already has a suitable mobile-test harness; do not add a new test framework/dependency in this cell. Otherwise provide a precise manual QA procedure and explain the coverage gap.

## Ownership and guardrails

- Source ownership: `src/services/ChatService.js` only.
- Test ownership: an existing test file/harness for `ChatService`, if one exists.
- Cell may write `.mece/cells/MOBILE-16-RECONNECT/REPORT.md` only for its report; Staff owns wave and status docs.
- Do not commit, push, open/merge PRs, edit Trello/GitHub, deploy, or edit app config/dependencies.
- Stop and report a blocker if solving the issue requires changing unrelated callers or scope.

### Staff delivery override (2026-11-18)

At the time of this override (2026-11-18), Staff authorized committing and pushing this issue branch and opening a PR to `dev`, superseding the no-commit/push/PR restriction above for issue #16 only, and instructed the cell not to merge, close #16, change Trello status, or deploy. Staff later merged PR #66 into `dev`; that delivery does not close #16 or authorize a production promotion.

Delivery record (updated 2026-11-19): commits `ea2f5a8`, `fd65b1f`, and `0936f33` were pushed on this branch. [PR #66](https://github.com/wz0un/chatti-mobile/pull/66) was merged into `dev` as `5a0e1ae57377a7fde1945f3252efc3b4391c4184` on 2026-11-18 15:51:47Z. The code and functional QA result were validated by the later CTO audit, but its GitHub review `PRR_kwDOQljQxc8AAAABY0tjdg` returned `REQUEST_CHANGES` for traceability: the earlier CTO approval applies to source/diff only, and a CTO review of QA evidence is still pending. Keep #16 open / IN PROGRESS; do not mark DONE or promote until the reports are corrected and CTO re-reviews the QA evidence. No production deployment or Trello state change was made.

## Required report

Write `REPORT.md` with changed paths, root cause, behavior changed, verification commands and exact results, manual QA steps, residual risks, STATUS delta, and the T3 thread/run IDs. The implementation agent itself must run as a T3 Code-managed thread. Do not launch `opencode run` or any agent directly through the OpenCode CLI. Do not call the issue DONE; QA and Staff sign-offs are separate.
