# Chatti Web — QA Report (QA Gate)

**QA Agent:** Senior QA Engineer & Security Tester
**Date:** 2026-08-11
**Scope:** Tasks 1–10 (P0) · Web functionality · Web ⇄ Mobile compatibility · Mobile regression · Security
**Repo:** `wz0un/chatti-mobile` @ `feature/web-implementation` (`6b4a936`)
**Authoritative docs:** `docs/WEB-ARCHITECTURE.md`, `docs/WEB-TASKS.md`, `docs/WEB-PARITY.md`, `docs/WEB-ROADMAP.md`

---

## QA STATUS: **FAIL**

| Quality gate | Result | Evidence |
|---|---|---|
| Critical bugs | **1** | Backend auth endpoints down/flaky (affects web + mobile) |
| High bugs | **1** | WebSocket reconnect wipes listeners → chat stops receiving |
| Authentication | **FAIL** | Live register/login intermittently 503 (`error code: 1102`); at final check 0/11 succeeded |
| Conversations | PASS | Dedupe/sort/unread parity verified; list endpoint live-verified |
| Messaging | PASS* | *Fails after reconnect (see HIGH bug); otherwise ordered, deduped, unicode-clean |
| WebSocket | PASS* | *Protocol conformance PASS; client reconnect logic buggy (see HIGH bug) |
| Encryption | **PASS** | Byte-level interop proven against the REAL mobile source |
| Mobile regression | PASS | Mobile bundle builds; zero mobile files changed |

---

## 1. Build validation

| Check | Result |
|---|---|
| `npm install` (web/) | OK — 0 vulnerabilities |
| `npm run build` (tsc -b && vite build) | OK — 71 modules, 300 kB JS / 94 kB gzip |
| `npm run typecheck` (strict) | OK |
| `npm run lint` | OK |
| Unit tests (`npm test`) | **83/83 pass** (6 files) |
| Live smoke (`npm run smoke`) | 5/5 pass on a clean run; intermittently blocked by backend 503s |
| `vite preview` (prod bundle) | Serves correctly |
| Mobile `expo export --platform android` | OK — 3.04 MB Hermes bundle |
| Root `npm audit` (mobile) | 31 advisories (2 critical: `shell-quote`, `node-tar` — dev/build tooling via expo, not app runtime) |

---

## 2. Task validation (P0)

| Task | Verdict | Notes |
|---|---|---|
| 1 — Scaffold | **PASS** | Build/dev/preview work; strict TS+ESLint |
| 2 — shared core | **PASS** | Types/contracts/i18n/storage verified; i18n keys 153/154 parity with mobile (`locale` is config, not a key) |
| 3 — Encryption port | **PASS** | Fixed vectors pass AND real-source interop (below) |
| 4 — Auth port | **PARTIAL** | Code correct (unit + smoke PASS); live gate blocked by backend auth instability |
| 5 — ApiService port | **PASS** | All endpoints live-verified with shape assertions |
| 6 — WS clients | **PARTIAL** | Protocol conformance PASS; **reconnect listener-wipe bug** (see BUG-02) |
| 7 — Auth UI | **PARTIAL** | Validation parity by review; live login/register blocked by backend 503s |
| 8 — App shell | **PASS** | Responsive CSS breakpoints correct (320px sidebar / collapsible / bottom nav); a11y basics present |
| 9 — Conversations | **PASS** | Parity logic verified; delete inaccessible except right-click (BUG-03); lastSeen-on-message missing (BUG-04) |
| 10 — DM chat | **PARTIAL** | Encrypted chat works live web⇄web; interop proven; receive path breaks after reconnect (BUG-02) |

---

## 3. Cryptography — web ⇄ mobile interop (CRITICAL QA GATE)

**Result: PASS — byte-level compatibility proven.**

`web/scripts/interop-mobile.test.ts` (new QA artifact) runs the **actual mobile source** `src/services/EncryptionService.js` (expo-crypto/AsyncStorage shimmed with byte-identical semantics) against the web port `shared/crypto/EncryptionService.ts` in one process. **5/5 pass**:

1. Same private key ⇒ identical public key (modPow over RFC 3526 Group 14).
2. Identical shared secrets, both directions (A side and B side) — matches fixed vector `948d939b…`.
3. Mobile-encrypted → web-decrypted round trip (incl. `¡hola! 🔒 مرحبا` multibyte).
4. Web-encrypted → mobile-decrypted round trip (incl. `你好 🌍`).
5. Cross-decryption of each other's ciphertext.

Run: `npx vitest run --config scripts/interop.vitest.config.ts`

Live chain: raw-protocol WS probe confirmed the wire path (join with publicKey, encrypted_message with senderPublicKey, echo to both peers), and the live smoke test decrypted real web⇄web traffic end-to-end (`isEncrypted:false`).

**Remaining gap (documented, not a web defect):** the worker never emits `history` on DM join (verified via raw probe again: first join, rejoin, solo, 100s-inactivity). The DM history decrypt path is only unit-tested via FakeWebSocket. Report to BE.

---

## 4. WebSocket protocol conformance (live raw probes)

DM (`/api/dm/probe_dm_*`) and room (`/api/room/3c5uo4n6`) verified:

- ✅ join → `user_joined` to peer with `{userId, username, publicKey}` (+`user_list` in rooms)
- ✅ `encrypted_message` delivered to **both** sender (echo) and recipient, in order
- ✅ 10 rapid messages: ordered, zero loss, zero duplicates
- ✅ 10,000-char message intact; unicode/emoji intact (`مرحبا 👋 héllo wörld 你好 🔐`)
- ✅ `typing {isTyping}` broadcast with `userId`/`username`
- ✅ clean close (1000) and abrupt close (1005/1006) → `user_left` broadcast
- ✅ rejoin after disconnect → `user_joined` to peers
- ⚠️ duplicate message IDs are **not** deduped by the server — delivered twice to both peers. Both clients dedupe by id (web does, correctly). Informational.
- ❌ no `history` event on any join; `history_request` unsupported (BE finding, pre-documented)

---

## 5. Auth testing (live + unit)

| Case | Result | Notes |
|---|---|---|
| Register (valid) | ✅ (when backend up) | Intermittent 503s; final session 0/11 succeeded |
| Login (valid creds, existing user) | ✅ (when backend up) | Returns full user with `fullUsername` |
| Login (unknown user) | ✅ | 401 `Invalid username or password` |
| Login (wrong password) | ⚠️ | Endpoint 503ing; could not complete live (see BUG-01) |
| Session restore | ✅ | Unit + smoke (restore from same storage) |
| Logout | ✅ | Local-only, keeps `deviceId` — parity |
| Invalid username formats | ✅ | Client validation (format `name#disc`, min password 6, max 20) |
| Duplicate registration | ⚠️ | First observed duplicate lookup succeeded with `isNewUser:true` after a 503 first attempt — possible identity collision; could not be reproduced while auth is down. POSSIBLE |
| Expired session | N/A | No tokens/session expiry by design (device-based) |
| Refresh after login | ✅ | `userData` read on boot; route gate works |

**Blocking issue:** auth endpoints are the web app's gate for everything, and they are currently failing ~40–100% of requests. See BUG-01.

---

## 6. Mobile regression

- `git diff HEAD -- src App.js index.js app.json eas.json` → **empty**. No mobile source modified.
- `expo export --platform android` → bundle builds (3.04 MB Hermes).
- Web imports only `shared/` and `web/` — zero coupling to mobile sources at runtime.
- Verdict: **PASS**.

---

## 7. Security

No-auth architecture (documented in WEB-ARCHITECTURE §5.2) — web implementation complies with the contract. Systemic weaknesses are CONFIRMED against the backend and affect both clients:

- **CONFIRMED (systemic/by-design)** — No authentication at all. Live-verified: `GET /api/dm/conversations?userId=X` and `/api/contacts/list?userId=X` return any user's data given their `userId`; `POST /api/dm/start`, `POST /api/dm/delete`, `POST /api/contacts/*` execute as any user; `POST /api/auth/delete` accepts arbitrary `{userId, deviceId}`. Identity spoofing on WS is trivial (join payload trusted). E2E encryption limits plaintext exposure, but conversation metadata and account destruction are exposed. Requires backend change (out of web scope; the web must not invent session logic the backend doesn't support).
- **CONFIRMED (impact: web+mobile)** — POST auth endpoints intermittently crash the worker (error 1102) → 503. See BUG-01.
- **POSSIBLE** — `POST /api/auth/delete` deviceId validation unknown (would not test against real accounts). Assume none until BE confirms.
- **INFORMATIONAL** — CORS `Access-Control-Allow-Origin: *` (no cookies/credentials ⇒ no CSRF vector; any website may call the API — consistent with unauthenticated design). No CSP header on worker responses. Private E2E key stored in `localStorage` under `e2e_key_pair_v2` (mobile parity; web XSS surface is low — no `innerHTML`/`eval`/`dangerouslySetInnerHTML` anywhere, React escaping).
- Web dependency audit: **0 vulnerabilities**.

---

## 8. Bug reports

---

### BUG-01

**ID:** 01
**Severity:** CRITICAL
**Title:** Backend auth endpoints (register/login) intermittently crash with Cloudflare error 1102 → web (and mobile) auth is unreliable
**Environment:** Production worker `https://chatti-workers.wz0un.workers.dev` · `POST /api/auth/register`, `POST /api/auth/login`
**Steps:**
1. `POST /api/auth/register` with a valid payload (any publicKey).
2. Repeat 10–15 times over a few minutes.

**Expected:** Consistent `200` + user object.

**Actual:** Mixed results over the session: `200` (≈40%), `503` with body `error code: 1102` (rest). GET endpoints never failed. At final check (3 runs, 11 requests): **0 succeeded**. Pattern consistent with worker CPU-limit/uncaught-exception on the bcrypt hash path. The web UI surfaces the failure as a raw `HTTP error! status: 503` with no retry.

**Evidence:** 60+ probe requests (see QA session log); `npm run smoke` flapped 0/4 → 4/4 → 0/4 across runs. `curl` register/login batches recorded above.

**Affected files (backend):** Cloudflare Worker auth handlers (not in this repo).
**Affected files (web):** `web/src/features/auth/LoginPage.tsx` (no retry/backoff on 503), `shared/api/ApiService.ts`.
**Suggested fix (BE):** investigate 1102 (likely bcrypt CPU-limit on Workers — move hashing to a KV-cached/precomputed path or lower cost factor; add try/catch → JSON 500). Web: add one retry with backoff on 5xx, and show the backend error message instead of the raw HTTP text.

**Classification:** CONFIRMED (impact on web functionality). Root cause in backend; blocks the Authentication QA gate.

---

### BUG-02

**ID:** 02
**Severity:** HIGH
**Title:** DM WebSocket reconnect wipes all event listeners → chat permanently stops receiving messages after a network interruption
**Environment:** Web app, any browser; also affects mobile (parity defect)
**Steps:**
1. Open a DM as user A.
2. Register the page's event handlers (they are attached once in the socket `useEffect`).
3. Force a reconnect (network blip / worker restart → close code 1006).
4. Have peer B send a message.

**Expected:** Message appears in A's chat after reconnection.

**Actual:** Message is **never rendered**. `DirectMessageSocket.connect()` begins with `disconnect()`, and `disconnect()` calls `clear()` which wipes every listener (`shared/ws/EventEmitter.ts`). The page never re-registers them, so `message/typing/history/error/connected` handlers are gone for the lifetime of the socket. Outgoing messages still send; incoming ones are lost until a full page reload. Reproduced deterministically in `web/scripts/reconnect-probe.test.ts` (new QA artifact): `onMessage` called 0 times post-reconnect; pre-reconnect it is called 1 time.

**Evidence:** `shared/ws/DirectMessageSocket.ts:80` (`this.disconnect()` first line of `connect`), `:173-181` (`disconnect()` → `clear()`); `web/src/features/dm/DirectMessagePage.tsx:70-137` (listeners registered once). The existing unit test `stops after max reconnect attempts…` documents the wiped-listener behavior as "mobile parity".

**Affected files:** `shared/ws/DirectMessageSocket.ts`, `web/src/features/dm/DirectMessagePage.tsx` (and `src/services/DirectMessageService.js` on mobile).
**Suggested fix:** only wipe listeners on explicit `disconnect()` (user leaving the conversation), not on reconnect; e.g. split `disconnect()` (connection teardown) from listener clearing, or re-register listeners from the page on the `connected` event. RoomSocket does not have this bug (its `connect()` does not call `disconnect()`).

**Classification:** CONFIRMED.

---

### BUG-03

**ID:** 03
**Severity:** MEDIUM
**Title:** Delete conversation is only reachable via right-click — inaccessible on touch devices and for keyboard users
**Environment:** Web app, mobile browser / tablet / keyboard-only
**Steps:**
1. Open Conversations list.
2. Try to delete a conversation without a mouse right-click.

**Expected:** A visible/accessible delete action (mobile uses long-press; Task 9 claims "Delete conversation (confirm dialog)" DONE).

**Actual:** The only delete trigger is `onContextMenu` (`web/src/features/conversations/ConversationListItem.tsx:102-105`). No button, no touch long-press, no keyboard path. The confirm dialog exists but can never be reached on touch devices or by keyboard.

**Affected files:** `web/src/features/conversations/ConversationListItem.tsx`, `web/src/features/conversations/ConversationsPage.tsx`.
**Suggested fix:** add an explicit delete button (visible on hover / always on touch), plus a keyboard-triggerable action (e.g. Delete key or a menu).

**Classification:** CONFIRMED.

---

### BUG-04

**ID:** 04
**Severity:** MEDIUM
**Title:** lastSeen not written on incoming messages/history — unread dot can show messages the user already read
**Environment:** Web app
**Steps:**
1. Open a DM (lastSeen written on open — parity OK).
2. Stay in the conversation; peer sends a message.
3. Return to the Conversations list without reopening the chat.

**Expected (mobile parity, WEB-PARITY.md "written on DM open, history and incoming message"):** the message is marked seen.

**Actual:** `DirectMessagePage.tsx` writes lastSeen only on open (`:50-67`); the `message` and `history` handlers (`:100-115`) don't. The unread dot and the badge count (`useSectionBadges`) still flag the conversation as unread.

**Affected files:** `web/src/features/dm/DirectMessagePage.tsx`.
**Suggested fix:** write lastSeen inside the `message` (and `history`) handlers, as mobile does.

**Classification:** CONFIRMED (parity deviation).

---

### BUG-05

**ID:** 05
**Severity:** LOW
**Title:** Wrong i18n key in empty-search subtext (mobile bug #3 replicated)
**Environment:** Web app, Conversations list with a search query that matches nothing
**Steps:**
1. Type a query with no matches.

**Expected:** A meaningful "no results" hint.

**Actual:** Subtext renders `t('login.errors.registerError')` — a register-error string ("Registration error" in en, etc.), nonsense in the search context. `web/src/features/conversations/ConversationsPage.tsx:215`. Faithful port of the mobile bug, but it's a bug either way.

**Classification:** CONFIRMED.

---

### BUG-06

**ID:** 06
**Severity:** LOW
**Title:** Direct open/reload of `/dm/:conversationId` without router state leaves `recipientId` empty → cannot send messages
**Environment:** Web app, fresh tab / some refresh paths
**Steps:**
1. Copy a DM URL, open in a new tab (no router state).

**Expected:** Chat works (or a clear "recipient unknown" state).

**Actual:** `location.state` is `{}` → `recipientId = ''` → REST key fetch for `''` fails → `sendMessage` emits "Recipient not available for encryption" forever. Incoming messages still decrypt (senderPublicKey is in the envelope). Deep linking is a P2 task, but the route exists today and is reachable via refresh.

**Affected files:** `web/src/features/dm/DirectMessagePage.tsx`, `web/src/app/App.tsx`.
**Suggested fix:** resolve the recipient from `GET /api/dm/conversations` by conversationId when state is missing (Task 16 groundwork).

**Classification:** CONFIRMED (edge path).

---

### BUG-07

**ID:** 07
**Severity:** LOW
**Title:** Contrast failures (WCAG AA) in several text elements
**Environment:** Web app, all pages
**Details:**
- `--color-text-tertiary: #999999` ≈ 2.8:1 on white — used for subtitles, footers, timestamps, tab-inactive, hints (`global.css:25`).
- `.msg__time--own: rgba(255,255,255,0.7)` on `#ff6b35` ≈ 3.1:1 at 10px (`directMessage.css:165-167`).
- `--color-placeholder: #a0a0a0` ≈ 2.3:1.

**Suggested fix:** darken tertiary text to ≥ #757575 (4.5:1); use solid white or darker tint for own-message timestamps.

**Classification:** CONFIRMED (a11y).

---

### INFORMATIONAL — not bugs in the web app

- Typing indicator persists if the peer vanishes without sending `typing:false` (mobile parity).
- `html lang="en"` not switched for `ar` (RTL — Task 18 deferred, documented).
- No `aria-live` on message lists (Task 18 deferred).
- Duplicate message IDs delivered twice by the server — web dedupes correctly.
- Root (mobile) `npm audit`: 2 critical dev-tooling advisories (`shell-quote`, `node-tar` via expo CLI) — no runtime app code.

---

## 9. Recommendations

1. **FE (blocking):** fix BUG-02 (reconnect listener wipe) — it breaks the messaging QA gate under the exact failure modes the roadmap cares about (network interruption, server restart). Reproduce with `npx vitest run --config scripts/reconnect.vitest.config.ts`.
2. **BE (blocking):** fix the auth 503/1102 crashes. Until then the Authentication gate cannot pass for web **or** mobile.
3. **FE:** BUG-03 (visible delete action), BUG-04 (lastSeen on message), BUG-05 (i18n key), BUG-06 (state-less deep link), BUG-07 (contrast).
4. **BE (security, systemic):** the no-auth/`userId`-as-handle model allows account impersonation/deletion and metadata disclosure. A token or device challenge is a platform change — recommend a dedicated BE task; do not band-aid in the web client.
5. Keep the new QA artifacts (`web/scripts/interop-mobile.test.ts`, `reconnect-probe.test.ts` + configs) as regression suite seeds for Task 20/21.

## 10. NEXT ACTION

Route this report to the Frontend Agent (BUG-02 → 07) and Backend Agent (BUG-01 + no-auth systemic + missing DM `history`). After fixes: re-run `npm test`, `npm run smoke`, `npm run typecheck/lint/build`, the interop suite, and repeat the live WS probe; then re-open the Authentication gate for a re-release of the QA verdict.
