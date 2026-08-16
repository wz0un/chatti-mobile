# Chatti Web — Architecture

Status: Approved draft · Owner: CTO · Last updated: 2026-08-11

## 1. Current Architecture (as-is)

```
┌─────────────────────────────────────────────┐        ┌─────────────────────────────┐
│  chatti-mobile (Expo SDK 54, RN 0.81, React 19)│  HTTPS/WSS │  Cloudflare Worker        │
│  ─────────────────────────────────────────── │ ───────▶ │  https://chatti-workers.   │
│  screens/ → navigation/ → services/ → worker │   REST   │  wz0un.workers.dev         │
│  components/ · i18n/ · theme/                │  WS      │  (Durable Objects / KV)    │
└─────────────────────────────────────────────┘        └─────────────────────────────┘
```

- **Framework:** Expo managed workflow, React Native 0.81.5, React 19.1.0, `newArchEnabled`.
- **Navigation:** React Navigation — native-stack (`AppNavigator`) + bottom tabs (`MainTabs`). `TabNavigator.js` is dead code.
- **State/persistence:** AsyncStorage — keys: `userData`, `deviceId`, `lastSeen_{userId}`, `chatti_language`, `e2e_key_pair_v2`, `e2e_public_key_v2`.
- **Services:** `ApiService` (REST), `AuthService` (register/login/session), `ChatService` (room WS), `DirectMessageService` (DM WS + crypto), `EncryptionService` (E2E), `NotificationService`/`GlobalNotificationService` (expo-notifications).
- **Auth model:** device-based, **no tokens**. `deviceId` is generated client-side and sent with registration. Authorization is implicit (endpoints take `userId` as a query/body param). `userId` is the auth handle for all APIs.
- **Backend:** Cloudflare Workers (wrangler) — not in this repo. All endpoints verified live (see §3).

## 2. Mobile Functionality Inventory

| Area | Capabilities |
|------|-------------|
| Auth | register, login (`name#disc`), session restore, logout, delete account, push-token update |
| Rooms | paginated list, create, join via WS, history, typing, presence (totalUsers), system join/leave messages |
| Direct messages | start conversation, conversation list (deduped/sorted), delete, encrypted 1:1 chat, typing, key exchange, last-seen tracking |
| Contacts | list, add by `name#disc`, request lifecycle (send/list/accept/reject), badge counts |
| Users | find by exact username, by device ID, fetch public key (directory search disabled by backend) |
| Profile | user card, device ID copy, language selector, logout/delete, settings toggles (dark mode is a no-op) |
| Notifications | Expo push token registration, local notifications for room/DM messages, test button |
| i18n | en / es / ar / fr, interpolated strings, persisted language |
| UX patterns | 30s polling for conversations/requests, focus refresh, client-side search, unread dot + tab badges |

### Discovered mobile bugs (report only — do not fix unless explicitly tasked)

1. **`DirectMessageService.handleEncryptedMessage`** references `this.participants` (never initialized) → `TypeError` inside the try block → incoming DMs from the other party are re-emitted as `"[Encrypted Message - Could not decrypt]"` even when decryption succeeded. **Web must implement this correctly** (lookup via an initialized `participants` Map or direct emit). Cross-compat impact: a correct web client is *more* functional than mobile, which is acceptable.
2. `RoomListScreen` uses dead i18n keys (`rooms.errorName`, `rooms.empty`, `rooms.createFirst`, `rooms.createTitle`, `rooms.roomNamePlaceholder`) — raw keys leak into the UI.
3. `ConversationsScreen` empty-search subtext wrongly uses `login.errors.registerError`.
4. `UsersListScreen` is not registered in the navigator (dead code; backend also disabled it).
5. `ChatScreen` generates an ephemeral `userId` per connection (`ChatService.generateUserId`) instead of the registered user's ID — room join identity is not the account identity.
6. `ChatMessage` references `colors.systemBackground` / `colors.systemMessage` which do not exist in `theme/colors.js`.

## 3. Backend / API Inventory (verified live)

### REST (base `https://chatti-workers.wz0un.workers.dev`)

| Method | Path | Purpose | Verified |
|--------|------|---------|----------|
| GET | `/api/rooms?cursor&limit` | List rooms (paginated) | ✅ |
| POST | `/api/room/create` | Create room `{name, owner, isPrivate, password}` | (mobile contract) |
| GET | `/api/room/{id}/info` | Room info | ✅ (shape) |
| GET | `/api/room/{id}/messages?cursor&limit` | Message history | ✅ (shape) |
| POST | `/api/room/{id}/post` | HTTP message fallback `{username, userId, content}` | (mobile contract) |
| POST | `/api/auth/register` | Register `{username, password, deviceId, expoPushToken, publicKey}` | (mobile contract) |
| POST | `/api/auth/login` | Login `{fullUsername, password, expoPushToken, publicKey}` | (mobile contract) |
| POST | `/api/auth/update-push-token` | Update push token | (mobile contract) |
| POST | `/api/auth/delete` | Delete account `{userId, deviceId}` | (mobile contract) |
| GET | `/api/users/find?username=` | Exact user lookup `name#disc` | ✅ |
| GET | `/api/users/by-device-id?deviceId=` | User by device ID | (mobile contract) |
| GET | `/api/users/public-key?userId=` | Fetch E2E public key | ✅ |
| GET | `/api/users/list` | **DISABLED** (privacy) | ✅ disabled |
| GET | `/api/users/search?query=` | **DISABLED** (privacy) | ✅ disabled |
| POST | `/api/dm/start` | Start DM `{userId, recipientId}` → `{conversationId, url}` | (mobile contract) |
| GET | `/api/dm/conversations?userId=` | User's conversations | ✅ |
| POST | `/api/dm/delete` | Delete conversation | (mobile contract) |
| POST | `/api/contacts/request` | Send request `{senderId, recipientDeviceId, senderUsername}` | (mobile contract) |
| GET | `/api/contacts/requests?userId=` | Incoming requests | ✅ |
| POST | `/api/contacts/accept` | Accept `{requestId, userId}` | (mobile contract) |
| POST | `/api/contacts/reject` | Reject `{requestId, userId}` | (mobile contract) |
| GET | `/api/contacts/list?userId=` | Contacts | ✅ |

### WebSocket

| Endpoint | Client → server | Server → client |
|----------|-----------------|-----------------|
| `/api/room/{roomId}` | `join {username,userId}`, `message {id,content}`, `typing {isTyping}` | `history {messages}`, `message {id,username,content,timestamp}`, `user_joined {username,totalUsers}`, `user_left`, `user_list {users,totalUsers}`, `typing` |
| `/api/dm/{conversationId}` | `join {userId,username,publicKey}`, `encrypted_message {id,recipientId,encryptedContent,iv,senderPublicKey}`, `typing {isTyping}` | `history {messages[]}`, `encrypted_message {id,senderId,recipientId,encryptedContent,iv,senderPublicKey,timestamp}`, `user_joined {userId,publicKey}`, `user_left`, `typing`, `key_exchanged {userId,publicKey}` |

Notes:
- HTTP→WS URL transform: `https://` → `wss://` (same host/path).
- No auth handshake on WS — server trusts the join payload.

## 4. React Native Web vs. Separate Web Frontend — Decision

### Option A: Expo Web (react-native-web)
- Pros: reuses screens/components directly.
- Cons: `expo-notifications` (imported at module scope in `NotificationService`, which `ChatService`/`DirectMessageService` import) breaks web builds without mocking; `expo-device`, `AppState`, `Alert`, `KeyboardAvoidingView`, `Dimensions` hacks and `__DEV__` branches add platform cracks; React Navigation on web is inferior for a desktop sidebar layout; no `package.json` web entry today.
- Verdict: viable only as a quick prototype, not production quality.

### Option B: Dedicated web frontend (recommended)
Vite + React 19 + TypeScript, platform-neutral core shared with mobile via a `shared/` module. Rationale:

1. **Production quality on desktop/tablet/mobile browsers** — purpose-built responsive layout (sidebar + conversation pane), keyboard shortcuts, browser history, accessibility.
2. **No fragile RN/expo module mocking** — the mobile codebase's imports (`expo-notifications`, `expo-device`, `AsyncStorage`) cannot be shared verbatim; they are precisely the mobile-only parts we want to exclude.
3. **All business logic is already platform-neutral** — `ApiService` (fetch), WS protocol, encryption math (BigInt), and the i18n dictionary port cleanly.
4. **Mobile stays the source of truth, untouched.**

**Decision: Option B — separate web app in `web/`, shared logic in `shared/`.**

## 5. Target Architecture

```
chatti-mobile/
├── App.js  src/  ...                    # mobile (UNTOUCHED, source of truth)
├── shared/                              # NEW: platform-neutral core (source: mobile services)
│   ├── i18n/translations.ts             #   extracted dictionary (pure data)
│   ├── api/contracts.ts                 #   endpoint constants + payload types (single source of truth)
│   ├── api/ApiService.ts                #   port of mobile ApiService (fetch)
│   ├── crypto/EncryptionService.ts      #   port of mobile encryption (WebCrypto SHA-256, same BigInt math)
│   ├── ws/RoomSocket.ts                 #   port of ChatService (browser WebSocket, no NotificationService)
│   ├── ws/DirectMessageSocket.ts        #   port of DirectMessageService (fixes participants bug)
│   ├── auth/AuthService.ts              #   storage-agnostic auth (storage adapter injected)
│   ├── auth/deviceId.ts                 #   web deviceId generation (userAgent-based hash)
│   ├── storage/StorageAdapter.ts        #   interface + localStorage impl (AsyncStorage-compatible keys)
│   ├── store/                            #   (Phase 2) extracted unread/lastSeen logic
│   └── types.ts                         #   User, Room, Message, Conversation, ContactRequest, WS events
└── web/                                 # NEW: Vite + React 19 + TS
    ├── src/app/  (router, providers)     # react-router v7
    ├── src/layout/ (AppShell, Sidebar, ConversationPane)
    ├── src/features/ (auth, rooms, conversations, contacts, profile)
    ├── src/components/ (MessageBubble, ChatInput, TypingIndicator, Badge, ...)
    ├── src/theme/ (CSS variables from mobile theme/colors.js)
    └── src/lib/ (browser-only: clipboard, notifications, focus mgmt)
```

### 5.1 Sharing strategy (two-phase)

- **Phase 1 (Web v1):** implement `shared/` as a faithful port of mobile logic (validated by QA against the mobile implementation + live API). `web/` imports only `shared/`. Mobile keeps its own copies untouched.
- **Phase 2 (consolidation, optional):** point mobile imports at `shared/` (`import { ApiService } from '../../shared/...'`) and delete duplicates. QA regression gates this step; it is NOT required for web delivery.

### 5.2 Critical interop constraints

1. **Encryption must be byte-identical to mobile.** Mobile: RFC 3526 Group 14 (2048-bit), private key = 32 random bytes, public = `g^a mod p` (hex), shared secret = `other^a mod p` → **SHA-256 over the decimal-agnostic hex string** (`Crypto.digestStringAsync` = SHA-256 of UTF-8 bytes of `secretBigInt.toString(16)`), then per-message key = SHA-256(`sharedSecret + ivBase64`) used as a repeating XOR keystream over the UTF-8 bytes of the plaintext, base64-encoded. WebCrypto equivalent: `crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))` → hex. Same inputs ⇒ same ciphertext ⇒ cross-device interop. A QA interoperability test (web ⇄ mobile) is mandatory.
2. **Same storage keys** (`userData`, `deviceId`, `lastSeen_{userId}`, `chatti_language`, `e2e_key_pair_v2`) so a user can switch device types without losing state or keys.
3. **deviceId generation:** mirror `device_${ts}_${hash}_${rand}` using `navigator.userAgent` for the hash component.
4. **`expoPushToken`:** send `null` (or omit) from web for now — backend accepts it for login/register (mobile already tolerates mock tokens).
5. **Auth/WS:** same unauthenticated contract as mobile. Server trusts `userId`; do not add client-side session logic that the backend does not support.

### 5.3 Web UX design

```
Desktop (≥1024px)                              Mobile browser (<768px)
┌──────────┬──────────────────────────────┐    ┌──────────┐
│ Sidebar  │ Conversation pane            │    │  Top bar │
│ (320px)  │  header: name · presence     │    ├──────────┤
│ Chats    │  messages (scroll, grouped)  │    │ messages │
│ Contacts │  typing indicator            │    ├──────────┤
│ Rooms    │  input (Enter=send,          │    │  input   │
│ Profile  │  Shift+Enter=newline)        │    └──────────┘
└──────────┴──────────────────────────────┘    (bottom nav)
```

- Sidebar with three collapsible sections (Chats / Contacts / Rooms) + Profile at bottom; badges for unread chats and pending requests (30s polling parity, upgraded to instant refresh on WS events where possible).
- Deep-linkable routes (`/chat/:roomId`, `/dm/:conversationId`) with browser history — desktop/tablet UX upgrade, no backend change.
- Keyboard shortcuts: `Enter` send, `Ctrl+K` search, `Esc` close composer state.
- Arabic RTL support: `dir` attribute driven by the i18n language (ar).
- Accessibility: semantic HTML, focus management, `aria-live` for new messages/typing, contrast-aware palette from mobile theme.

## 6. Data Models (single source of truth in `shared/types.ts`)

```ts
interface User { userId: string; username: string; discriminator: string;
  fullUsername: string; deviceId: string; publicKey: string; createdAt: string; }
interface Room { id: string; name: string; owner: string; isPrivate: boolean; createdAt: string; }
interface RoomMessage { id: string; username: string; content: string; timestamp: string; isSystem?: boolean; }
interface Conversation { conversationId: string; id?: string; participants?: string[];
  recipient?: User; recipientId?: string; lastMessage?: {content: string; timestamp: string} | string;
  lastMessageTime?: string; createdAt: string; }
interface DecryptedMessage { id: string; senderId: string; recipientId: string; content: string; timestamp: string; }
interface ContactRequest { requestId: string; senderId: string; senderUsername: string; createdAt: string; }
type WsEvent = { type: 'history'|'message'|'user_joined'|'user_left'|'user_list'|'typing'|'key_exchanged'|'encrypted_message', ... };
```

## 7. Non-Goals / Deferred

- Push notifications (requires backend change + Service Worker; tracked separately).
- User directory search (backend disabled).
- Private rooms with password join (mobile does not implement the join side).
- Native file/image upload (not present in mobile; requires backend change).
- Rewriting or extracting mobile code (Phase 2, QA-gated).

## 8. Roles & Ownership

- **Frontend Agent** — owns `web/` and `shared/` implementation, Web UX, responsive design, a11y.
- **Backend Agent** — owns Cloudflare Worker changes; only touched when web requires it (currently: none for core parity; push notifications later).
- **QA Agent** — owns validation: feature parity vs mobile, WebSocket protocol conformance, **web ⇄ mobile encryption interop**, mobile regression after any shared extraction.
