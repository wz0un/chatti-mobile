# CTO-WEB-STABILITY

You own this cell exclusively. Work only on the web application and its tests.

## Objective

Fix the confirmed M1 web regressions:

1. In `shared/ws/DirectMessageSocket.ts`, reconnecting must close the prior
   socket without clearing registered event listeners. Keep full listener
   cleanup available for final destruction/logout if that lifecycle exists.
2. In `web/src/features/dm/DirectMessagePage.tsx`, persist `lastSeen` when an
   incoming encrypted direct message is displayed, using the established
   outgoing-message pattern.
3. In `web/src/features/conversations/ConversationsPage.tsx`, replace the
   incorrect empty-search subtext i18n key with the semantically correct
   existing translation key (or add one if none exists, across supported
   locales).

## Constraints

- Do not modify mobile code, backend/Worker code, dependency versions, or
  unrelated formatting.
- Add or update focused regression tests for the reconnect listener behavior.
- Run the relevant web typecheck, lint, and focused/full tests that are
  available.

## Completion

Write `.mece/cells/CTO-WEB-STABILITY/REPORT.md` containing:

- changed paths and a concise explanation
- verification commands and results
- blockers or residual risks
- the OpenCode session id
