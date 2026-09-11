# FE-M1-CLOSE

You own this cell exclusively. Work only on the web application.

## Objective

1. Complete Task 12 in web/src/features/profile/ProfilePage.tsx.
   - Add an en / es / ar / fr language selector that switches the UI immediately and persists with the existing web i18n storage key chatti_language. Match src/screens/ProfileScreen.js language options.
   - Do not implement dark mode. Do not port the mobile chat-history toggle unless a web storage path already exists; otherwise omit it.
   - Add delete account: show a confirmation dialog, call existing ApiService.deleteAccount(userId, deviceId), then invoke the supplied onLogout. Show API failures in the UI and do not invent tokens.
2. Fix BUG-03. Conversation deletion is currently only exposed through onContextMenu. Add a visible delete control (hover on desktop, always on touch) and a keyboard-reachable route, retaining the existing confirmation.

## Exclusive scope

You may change only web/src/features/profile/**, web/src/features/conversations/ConversationListItem.tsx, web/src/features/conversations/ConversationsPage.tsx, and CSS already used by those files. shared/ is permitted only if a required delete-account or i18n persistence helper is genuinely missing; it should not be. Do not touch mobile, wrangler, docs, dependencies, or lockfiles. Do not begin Tasks 16–19.

## Verification and delivery

From web/, run npm run typecheck, npm run lint, and npm test. Write .mece/cells/FE-M1-CLOSE/REPORT.md with changed paths, command results, residual risks, and session id. Do not commit.
