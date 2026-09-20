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
| Login (username#disc + password) | ✅ | ✅ | DONE | LoginPage tabs, mobile-identical validation, error/success banners. Live-verified. |
| Register (username + password) | ✅ | ✅ | DONE | Assigns `fullUsername` + discriminator; 3s auto-login after register (parity). Live-verified. |
| Session persistence | ✅ | ✅ | DONE | localStorage `userData` (same key); session restore on boot with splash. |
| Logout | ✅ | ✅ | DONE | Local only (removes `userData`, keeps `deviceId` — parity). Profile page. |
| Delete account | ✅ | ✅ | DONE | Confirmed profile flow calls `ApiService.deleteAccount(userId, deviceId)`, logs out on success and shows API errors; live delete not executed in QA. |
| Update push token | ✅ | ❌ | DEFERRED | `POST /api/auth/update-push-token`. Expo push is mobile-only; web push needs a backend change. |
| Room list (paginated) | ✅ | ✅ | DONE | Implemented in `RoomsPage.tsx`; live authenticated QA not run. |
| Create room | ✅ | ✅ | DONE | Implemented in `RoomsPage.tsx`; live authenticated QA not run. |
| Private rooms | ⚠️ | ❌ | TODO | `createRoom` sends `isPrivate/password`, but the mobile join flow never sends a password — private rooms are effectively non-functional on mobile. Web should match mobile behavior (public rooms only) unless backend join flow is clarified. |
| Room chat (WebSocket) | ✅ | ✅ | DONE | `/room/:roomId` implements join, message, typing, history, join/leave and presence handlers; live QA not run. |
| Room message history | ✅ | ✅ | DONE | WS `history` and HTTP fallback are implemented; live QA not run. |
| HTTP message fallback | ✅ | ✅ | DONE | Implemented; live QA not run. |
| Room presence (online count) | ✅ | ✅ | DONE | Implemented from room WS events; live QA not run. |
| Room typing indicators | ✅ | ✅ | DONE | Implemented from room WS events; live QA not run. |
| DM: start conversation | ✅ | ✅ | DONE | Live-verified. `conversationId` (e.g. `dm_xxxx_v2`) + `url`. StartConversation uses `findUserByUsername` → publicKey → start (mobile workaround pattern). |
| DM: conversation list | ✅ | ✅ | DONE | Dedupe + sort + recipient normalization ported; 30s polling; unread from `lastSeen_{userId}`. |
| DM: delete conversation | ✅ | ✅ | DONE | Confirm dialog + `POST /api/dm/delete` (deleteConversation port). |
| DM: encrypted chat (WebSocket) | ✅ | ✅ | DONE | `wss://.../api/dm/{conversationId}`. Events: join (with publicKey), encrypted_message, user_joined, user_left. **Worker does NOT send `history` on join** (verified via raw-protocol probe: first join, join-while-peer-connected, solo rejoin, and rejoin after 100s inactivity all receive no history event — mobile `handleHistory` path appears dead in production; report to BE). Live smoke: encrypted round-trip both directions (web ⇄ web) passing. |
| DM: E2E encryption (DH Group 14 + SHA-256 + XOR) | ✅ | ✅ | DONE | WebCrypto port; fixed-vector unit tests; live round-trip decrypts `isEncrypted:false` in both directions. Byte-compatible with mobile (fixed vectors). See ARCHITECTURE §5. |
| DM: fetch recipient public key | ✅ | ✅ | DONE | `GET /api/users/public-key?userId` (no auth). Live-verified in smoke test. |
| DM: last-seen / unread markers | ✅ | ✅ | DONE | Written on DM open, history and incoming message (mobile parity); `Number(timestamp) > Number(lastSeen)` comparison. |
| Contacts list | ✅ | ✅ | DONE | Implemented; live authenticated QA not run. |
| Add contact (by username#disc) | ✅ | ✅ | DONE | Implemented; live authenticated QA not run. |
| Contact requests list | ✅ | ✅ | DONE | Implemented; live authenticated QA not run. |
| Accept contact request | ✅ | ✅ | DONE | Implemented; live authenticated QA not run. |
| Reject contact request | ✅ | ✅ | DONE | Implemented; live authenticated QA not run. |
| User directory search | ⚠️ | ❌ | BLOCKED | Backend disabled: `GET /api/users/list` and `GET /api/users/search` return "User directory is disabled for privacy". Mobile's UsersListScreen is dead code (not registered in the navigator). **Web must not implement it.** |
| Find user by exact username | ✅ | ❌ | TODO | `GET /api/users/find?username=name#1234` (exact match only). |
| User by device ID | ✅ | ❌ | TODO | `GET /api/users/by-device-id?deviceId`. |
| Profile view (user + deviceId) | ✅ | ✅ | DONE | Profile page: user card, deviceId copy, logout (local-only, keeps deviceId — parity). |
| Copy device ID | ✅ | ✅ | DONE | `navigator.clipboard.writeText` + copied-state feedback. |
| Language selector | ⚠️ | ✅ | DONE | Profile selector supports en/es/ar/fr through the existing immediate, persisted i18n path. |
| i18n translation coverage | ✅ | ✅ | DONE | Dictionary extracted verbatim; `interpolate` helper; login/conversations/profile/DM keys verified. |
| Notifications (push) | ✅ | ⚠️ | IN PROGRESS | FE done (Task 22): Service Worker + VAPID subscription + `/api/auth/webpush` contract + Profile toggle. Expo push stays mobile-only; web delivery needs the BE endpoint (separate Worker repo) + `VITE_VAPID_PUBLIC_KEY` + live QA. Spec: `docs/WEB-PUSH.md`. |
| In-app notification toasts | ❌ | ❌ | TODO | Mobile shows local notifications only. Web can add in-app toasts (Web-only enhancement, no backend change). |
| Unread conversations badge (tab) | ✅ | ✅ | DONE | `useSectionBadges` — 30s polling + focus refresh, 99+ cap. |
| Pending requests badge (tab) | ✅ | ✅ | DONE | Same `useSectionBadges` polling. |
| Conversation search | ✅ | ✅ | DONE | Client-side filter on recipient username (useMemo). |
| Pull-to-refresh | ✅ | ❌ | N/A | Web replaces with manual refresh / live updates. |
| Notifications test button | ✅ | ❌ | DEFERRED | Tied to expo-notifications. |
| Dark mode toggle | ⚠️ | ❌ | TODO | Mobile toggle is a no-op (UI stays light). Web: implement as real feature (Web-only enhancement). |

## Summary

- **Web app implements Tasks 1–15 (P0–M2 core)** — Task 12/BUG-03 static QA passed; live contacts/rooms and mobile room interop remain unverified due to BUG-01/no session.
- **Backend support exists for all core features** (verified live). No backend changes are required for parity of core features.
- **Blocked:** user directory (backend disabled — do not implement).
- **Deferred (needs backend change):** push notifications.
- **Critical constraint:** DM encryption must remain byte-compatible with mobile's `EncryptionService` (fixed-vector tests enforce this).
- **Worker finding (report to BE):** the DM WebSocket never emits `history` on join — web and mobile both have the dead handler path; history decrypt is unit-tested via FakeWebSocket instead of live.
