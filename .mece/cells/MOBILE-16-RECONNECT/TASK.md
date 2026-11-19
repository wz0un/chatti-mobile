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

Delivery record (updated 2026-11-19): commits `ea2f5a8`, `fd65b1f`, and `0936f33` were pushed on this branch. [PR #66](https://github.com/wz0un/chatti-mobile/pull/66) was merged into `dev` as `5a0e1ae57377a7fde1945f3252efc3b4391c4184` on 2026-11-18 15:51:47Z. GitHub review `PRR_kwDOQljQxc8AAAABY0tjdg` returned `REQUEST_CHANGES` for traceability. The original CTO T3 run ordinal 1 approved source/diff only. The follow-up CTO T3 thread `mcp:ec582871-66d1-4ee5-acbc-d00f796d8189`, run ordinal 3, approved the corrected historical QA evidence and report snapshots `7400fdd0c1ad968daaa8111d11e7ef1a13b661d023d532a58c6f749dd58676aa` (QA) and `49069d92a3f933558de43bc087c4ff1dc304c9cb5bcdd108990574da04b90bff` (implementation), for the exact source/diff/APK hashes recorded in those reports. QA thread `mcp:81055c85-c0d9-4e23-a9f4-6aad77d9d16f` run 10 and implementation thread `mcp:65578db3-49db-4e7d-9dc9-94c8f84fc7f4` run 4 added chronological notes; CTO run ordinal 4 **APPROVED** those addenda after verifying the final report hashes `ab27c7050a8e612218bdc040f6bb7ee53a4042e1da0bfa6306e7a8b58bed68a1` and `4f71d6b9cd42b52235c66336affe9371644aa0bb71d9ed597cf18df8f6a63396`. Raw QA logs are unavailable; the historical review did not re-execute QA or freshly rehash the APK. The corrected reports and Staff traceability are in [PR #68](https://github.com/wz0un/chatti-mobile/pull/68), which remains open pending review. Keep #16 open / IN PROGRESS; do not mark DONE or promote. No production deployment or Trello state change was made.

## Required report

Write `REPORT.md` with changed paths, root cause, behavior changed, verification commands and exact results, manual QA steps, residual risks, STATUS delta, and the T3 thread/run IDs. The implementation agent itself must run as a T3 Code-managed thread. Do not launch `opencode run` or any agent directly through the OpenCode CLI. Do not call the issue DONE; QA and Staff sign-offs are separate.
