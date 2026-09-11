# QA-M1-M2-DELTA

Read-only QA verification for the uncommitted FE delta. Do not edit product files, docs, Git state, or the Phase A report. You may write only `.mece/cells/QA-M1-M2-DELTA/REPORT.md`. Do not commit.

Validate with static inspection plus the current independent command evidence (`npm run typecheck`, `npm run lint`, and `npm test`, all passing at 85 tests):

1. Task 12: `ProfilePage` offers en/es/ar/fr, calls the existing `setLanguage` persistence path, immediately reflects i18n state, confirms delete-account, calls `ApiService.deleteAccount(user.userId, user.deviceId)`, logs out only after success, disables during request, and renders API failure.
2. BUG-03: delete conversation has a real keyboard-focusable button with accessible label, appears on desktop hover/focus and touch, and calls existing `onDelete` to preserve confirmation. Do not run a destructive deletion.

Write a concise report with PASS/FAIL for each item, precise evidence paths, residual risks, OpenCode session id, and final verdict `M1 blocked on BUG-01`. State that Phase A's M2 verdict remains `M2 not ready` and is not re-evaluated.
