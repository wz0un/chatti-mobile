# QA-M1-M2

You own read-only quality verification. Do not edit product files, Git state, or docs other than .mece/cells/QA-M1-M2/REPORT.md. Do not commit.

## Phase B delta (current assignment)

The Phase A report is complete for base `a2d5c657c528bf97626bf604b1c0f392d024a178` and found M2 not ready because live authenticated room/contact coverage was unavailable. Do **not** re-run M1/M2. Validate only the uncommitted FE delta:

- Task 12: profile language selector changes immediately and uses the existing i18n persistence path (`chatti_language`); the delete-account button confirms, sends the existing userId/deviceId pair through `ApiService.deleteAccount`, logs out only on success, disables while pending, and renders an API failure.
- BUG-03: conversation delete is visible on touch and on desktop hover/focus, keyboard reachable, has an accessible label, and preserves the existing confirmation via `onDelete`.

Use static inspection plus the existing `typecheck`, `lint`, and `test` outputs where applicable. Do not attempt a real account deletion or make live backend writes. Append a clearly titled **Phase B delta** section to REPORT.md with PASS/FAIL per item, residual risks, and one of: `M1 FE ready` or `M1 blocked on BUG-01`. Preserve the Phase A report and its `M2 not ready` verdict.

Everything below is the original Phase A brief and is already complete; do not execute it again.

Verify the following, which the 2026-08-11 QA report did not cover, and confirm that already-fixed bugs remain fixed:

- M1 contacts: list, add via username#disc, accept/reject, pending badge.
- Profile: logout and copy device ID. Check language and account deletion only if those controls are present in the tested commit; otherwise explicitly note that Task 12 is not yet in the tree.
- BUG-02/04/06: reconnect listeners survive, incoming DMs update lastSeen, and empty search is localized. If present, record FIXED rather than reopening.
- Live auth: if register/login returns 503/1102, record BUG-01 as BLOCKED and continue the rest using an existing session if possible.
- M2 rooms: list and create a room; room chat join, send/receive, typing, presence count, join/leave system messages, and reconnect.
- Web/mobile room interop: run it if a mobile session is available; else record NOT RUN with the reason.

From web/, identify valid scripts in package.json and run non-mutating typecheck, lint, test, and smoke testing only if the backend responds. Write a report with PASS/FAIL for each surface, paths and severity for new bugs, residual risks, session id, and one exact verdict line selected from:

M1 FE ready · M1 blocked on BUG-01 · M2 staging-safe · M2 not ready
