# Chatti Web — Feature Parity Matrix

**Source of truth:** `chatti-mobile` (Expo / React Native app). Backend: Cloudflare Worker at `https://chatti-workers.wz0un.workers.dev` (verified live on 2026-08-11).

Legend:
- ✅ = implemented and working
- ⚠️ = partially implemented / limited (explained in Notes)
- ❌ = not implemented
- Status: `DONE` / `TODO` / `BLOCKED` / `NOT-APPLICABLE` / `DEFERRED`

## Feature Matrix

| Feature | Mobile | Web | Status | Notes |
|---------|--------|-----|--------|-------|
| Login (username#disc + password) | ✅ | ❌ | TODO | `POST /api/auth/login`. Backend verified working. |
| Register (username + password) | ✅ | ❌ | TODO | `POST /api/auth/register`. Assigns `fullUsername` + discriminator. |
| Session persistence | ✅ | ❌ | TODO | Mobile: AsyncStorage `userData`. Web: localStorage. |
| Logout | ✅ | ❌ | TODO | Local only (removes `userData`). No server session. |
| Delete account | ✅ | ❌ | TODO | `POST /api/auth/delete` with userId + deviceId. |
| Update push token | ✅ | ❌ | DEFERRED | `POST /api/auth/update-push-token`. Expo push is mobile-only; web push needs a backend change. |
| Room list (paginated) | ✅ | ❌ | TODO | `GET /api/rooms?cursor&limit`. Live: returns empty list (no rooms exist yet). |
| Create room | ✅ | ❌ | TODO | `POST /api/room/create`. Mobile navigates into the new room after creation. |
| Private rooms | ⚠️ | ❌ | TODO | `createRoom` sends `isPrivate/password`, but the mobile join flow never sends a password — private rooms are effectively non-functional on mobile. Web should match mobile behavior (public rooms only) unless backend join flow is clarified. |
| Room chat (WebSocket) | ✅ | ❌ | TODO | `wss://.../api/room/{roomId}`. Events: join, message, typing, history, user_joined, user_left, user_list. |
| Room message history | ✅ | ❌ | TODO | Via WS `history` event + HTTP fallback `GET /api/room/{id}/messages`. |
| HTTP message fallback | ✅ | ❌ | TODO | `POST /api/room/{roomId}/post`. |
| Room presence (online count) | ✅ | ❌ | TODO | `user_joined/user_left` carry `totalUsers`. No global presence API. |
| Room typing indicators | ✅ | ❌ | TODO | `typing` event with `{ isTyping }`. |
| DM: start conversation | ✅ | ❌ | TODO | `POST /api/dm/start {userId, recipientId}` returns `conversationId` + `url`. |
| DM: conversation list | ✅ | ❌ | TODO | `GET /api/dm/conversations?userId`. Live: returns `{conversations, total}`. |
| DM: delete conversation | ✅ | ❌ | TODO | `POST /api/dm/delete`. |
| DM: encrypted chat (WebSocket) | ✅ | ❌ | TODO | `wss://.../api/dm/{conversationId}`. Events: join (with publicKey), encrypted_message, typing, history, user_joined, user_left, key_exchanged. |
| DM: E2E encryption (DH Group 14 + SHA-256 + XOR) | ✅ | ❌ | TODO | **Web must be byte-compatible with mobile** for cross-device decryption. See ARCHITECTURE §5. |
| DM: fetch recipient public key | ✅ | ❌ | TODO | `GET /api/users/public-key?userId`. Live: `{success:false}` for unknown user, correct shape otherwise. |
| DM: last-seen / unread markers | ✅ | ❌ | TODO | Local-only (`lastSeen_{userId}` in storage). Logic must be ported identically. |
| Contacts list | ✅ | ❌ | TODO | `GET /api/contacts/list?userId`. Live: returns `{contacts, total}`. |
| Add contact (by username#disc) | ✅ | ❌ | TODO | `POST /api/contacts/request {senderId, recipientDeviceId, senderUsername}` after `GET /api/users/find`. |
| Contact requests list | ✅ | ❌ | TODO | `GET /api/contacts/requests?userId`. |
| Accept contact request | ✅ | ❌ | TODO | `POST /api/contacts/accept {requestId, userId}`. |
| Reject contact request | ✅ | ❌ | TODO | `POST /api/contacts/reject {requestId, userId}`. |
| User directory search | ⚠️ | ❌ | BLOCKED | Backend disabled: `GET /api/users/list` and `GET /api/users/search` return "User directory is disabled for privacy". Mobile's UsersListScreen is dead code (not registered in the navigator). **Web must not implement it.** |
| Find user by exact username | ✅ | ❌ | TODO | `GET /api/users/find?username=name#1234` (exact match only). |
| User by device ID | ✅ | ❌ | TODO | `GET /api/users/by-device-id?deviceId`. |
| Profile view (user + deviceId) | ✅ | ❌ | TODO | Uses `AuthService.getCurrentUser()` + `getDeviceId()`. |
| Copy device ID | ✅ | ❌ | TODO | Mobile: expo-clipboard → web: `navigator.clipboard`. |
| Language selector | ✅ | ❌ | TODO | 4 languages: en, es, ar, fr. Persisted in storage. |
| i18n translation coverage | ✅ | ❌ | TODO | ~900-line dictionary, pure data — directly reusable. |
| Notifications (push) | ✅ | ❌ | DEFERRED | Expo push requires native; web needs Web Push + Service Worker + backend endpoint (Backend Agent change). |
| In-app notification toasts | ❌ | ❌ | TODO | Mobile shows local notifications only. Web can add in-app toasts (Web-only enhancement, no backend change). |
| Unread conversations badge (tab) | ✅ | ❌ | TODO | 30s polling + focus refresh. |
| Pending requests badge (tab) | ✅ | ❌ | TODO | 30s polling. |
| Conversation search | ✅ | ❌ | TODO | Client-side filter on recipient username. |
| Pull-to-refresh | ✅ | ❌ | N/A | Web replaces with manual refresh / live updates. |
| Notifications test button | ✅ | ❌ | DEFERRED | Tied to expo-notifications. |
| Dark mode toggle | ⚠️ | ❌ | TODO | Mobile toggle is a no-op (UI stays light). Web: implement as real feature (Web-only enhancement). |

## Summary

- **Web app does not exist yet** — every Web cell is ❌/TODO.
- **Backend support exists for all core features** (verified live). No backend changes are required for parity of core features.
- **Blocked:** user directory (backend disabled — do not implement).
- **Deferred (needs backend change):** push notifications.
- **Critical constraint:** DM encryption must remain byte-compatible with mobile's `EncryptionService`.
