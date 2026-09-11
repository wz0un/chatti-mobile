# FE-M1-CLOSE report

OpenCode session: `big-pickle` (the session label emitted by the CLI).

## Task 12 — Profile page (web/src/features/profile/ProfilePage.tsx)

- Language selector (en / es / ar / fr) matching `src/screens/ProfileScreen.js` options (flags + endonym labels). Uses the existing `useI18n()` `setLanguage`, which already persists under the `chatti_language` storage key (`web/src/lib/i18n.tsx:33`), so switching is immediate and survives reload. No dark mode, no chat-history toggle (no web storage path exists).
- Delete account: confirmation via `window.confirm(t('profile.deleteMessage'))` (same pattern as `ConversationsPage`), then `ApiService.deleteAccount(user.userId, user.deviceId)` (`shared/api/ApiService.ts:348`), then `await onLogout()`. API failures render inline via `profile.deleteError`; the button is disabled while in flight. No invented tokens — only the real `userId`/`deviceId` are sent. No shared/ changes were needed.
- CSS: language row/select, destructive delete button, and inline error styles added to `profile.css`.

## BUG-03 — Visible conversation delete control

- `ConversationListItem.tsx`: the item is split into a role=button main area and a separate (`🗑`) delete `<button>` (keyboard-focusable, real button, `aria-label`/`title` from `conversations.deleteTitle`) that calls the existing `onDelete` → `deleteConversation` confirmation in `ConversationsPage.tsx`. `onContextMenu` deletion retained.
- `conversations.css`: delete control hidden on desktop and revealed on row `:hover` / `:focus-within`; always visible under `@media (hover: none)` for touch. Existing confirm dialog unchanged.

## Changed paths

- `web/src/features/profile/ProfilePage.tsx`
- `web/src/features/profile/profile.css`
- `web/src/features/conversations/ConversationListItem.tsx`
- `web/src/features/conversations/conversations.css`
- `.mece/cells/FE-M1-CLOSE/REPORT.md`

(`ConversationsPage.tsx` was reviewed but required no edits.)

## Command results (from `web/`)

- `npm run typecheck` — PASS (no output, tsc -b clean)
- `npm run lint` — PASS (eslint clean)
- `npm test` — PASS, 6 test files / 85 tests

## Residual risks

- No component tests were added for ProfilePage or ConversationListItem (web/ has no feature-level test harness; verification relies on typecheck/lint and the existing 85-test suite). QA-M1-M2 should exercise the new UI end-to-end (language switch persistence across reload, delete-account failure path, hover/touch delete visibility per BUG-03).
- `window.confirm` is used (native dialog), matching existing web conventions; visual style of the confirm is browser-owned.
- Arabic selection applies the existing `localeFor('ar')` = `'ar'`; layout direction of the surrounding shell when switching to RTL was not altered (out of scope).
- Account deletion succeeds only if the backend `/api/auth/delete` endpoint is reachable; in staging this depends on the Worker deployment (see residual issues in `.mece/WAVE.md`).
