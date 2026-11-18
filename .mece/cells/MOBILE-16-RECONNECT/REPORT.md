# MOBILE-16-RECONNECT — Implementation report (P0 #16)

- **Issue:** GitHub #16 — `[P0] Preservar userId y estado de sesión durante la reconexión WebSocket`
- **Branch:** `bugfix/mobile-16-session-reconnect-android-qa` (base `origin/dev`; current worktree HEAD is `dd3d72ce83d106a6aca806f7727595553baaef6b`)
- **Cell:** MOBILE-16-RECONNECT (`.mece/cells/MOBILE-16-RECONNECT/TASK.md`)
- **Date:** 2026-11-18
- **Status:** implementation, device QA, and independent CTO technical review are complete for the exact source/APK hashes recorded in §8.4. **NOT committed / not pushed / no PR**; no external issue status was changed. #16 remains OPEN / IN PROGRESS in this worktree and is not represented as closed or promoted.
- **State of tree:** inherited an uncommitted WIP diff in `src/services/ChatService.js` from an interrupted CLI run (CLI runs are now forbidden by `.mece/WAVE-3.md`). The diff was reviewed against the acceptance criteria, kept (not discarded), and completed with one hardening change. A pre-existing uncommitted edit in `.mece/cells/MOBILE-P0-PLAN/TASK.md` (the STAFF-APPROVAL line) and the untracked `.mece/WAVE-3.md` / `.mece/cells/MOBILE-16-RECONNECT/` were already in the tree and were **not** touched.

---

## 1. Objective and confirmed root cause

**Objective:** during an automatic WebSocket retry, keep the same `userId` that was sent in the original `join`, and make a manual `disconnect()` cancel both a pending retry timer and any later socket-close callback that could open another socket. Also ensure a stale socket callback cannot reconnect after a newer connection replaced it.

**Root cause (confirmed against the pre-fix code, `HEAD:src/services/ChatService.js`):**

1. **New `userId` on every retry.** `connect()` assigned unconditionally:

   ```js
   // HEAD:src/services/ChatService.js:36
   this.userId = userId || this.generateUserId();
   ```

   and the retry called `connect()` again **without** `userId`:

   ```js
   // HEAD:src/services/ChatService.js:104
   setTimeout(() => this.connect(roomId, username, workerUrl), 2000 * this.reconnectAttempts);
   ```

   Therefore `userId` was falsy on every retry and `generateUserId()` produced a brand-new identity; the next `join` announced a different `userId` (this is the mobile bug #5 already observed in `docs/QA-M2-INTEROP.md`, finding 3).

2. **Retry timer untracked.** The `setTimeout` handle at `HEAD:...:104` was never stored, so nothing could cancel it. `disconnect()` (`HEAD:...:190-201`) only closed `this.ws` and nulled it; the old socket's `onclose` handler was still registered at `HEAD:...:95` and would run the retry branch for any non-`1000` close code, opening a socket after the user had left the room.

3. **No ownership of socket callbacks.** Every `connect()` reassigned `this.ws` and attached handlers to the new object, but the previous socket's handlers still referenced the shared instance state (`this.reconnectAttempts`, `this.connect`, `this.ws`). A close event from a replaced socket could therefore schedule a retry and clobber a newer, healthy connection.

4. **Not a wire-protocol bug.** `backend/src/ChatRoom.js:172-194` (`handleJoin`) already accepts `{ username, userId }` and broadcasts `user_joined` with the client-provided `userId`; the protocol needs no change.

---

## 2. Changed paths and behavior

> **Current-source note:** §§2.1–2.4 were written for the initial candidate. The follow-up in §8 corrected F1–F4; use §8.1 and §8.4 as the current source behavior, QA evidence, and sign-off record. In particular, the initial identity expression below is superseded by the stricter manual-connect behavior in §8.1.

**Product code changed:** [`src/services/ChatService.js`](/home/mohsine/Proyectos/chatti-mobile/src/services/ChatService.js) only
(`git diff --name-only -- src/` → `src/services/ChatService.js`).

**Report written:** [`.mece/cells/MOBILE-16-RECONNECT/REPORT.md`](/home/mohsine/Proyectos/chatti-mobile/.mece/cells/MOBILE-16-RECONNECT/REPORT.md).
No other path was modified by this cell. `git diff --stat` for the tree reports **68 insertions / 18 deletions** (86 changed lines): 84 changed lines in `src/services/ChatService.js` (80 inherited from the interrupted run plus 4 added by this review — retry-timer generation guard and its comment) and 2 changed lines in the pre-existing Staff edit to `.mece/cells/MOBILE-P0-PLAN/TASK.md` (+1/−1), which is not part of this cell.

### 2.1 `userId` stability (criterion 1)

- Constructor stores `workerUrl`, `reconnectTimer`, `intentionalDisconnect`, `_socketGeneration`, `_autoReconnect` (`ChatService.js:15,22-25`).
- `connect()` now resolves identity as (`ChatService.js:52`):

  ```js
  // Initial candidate; superseded by the F2 correction in §8.1.
  this.userId = userId || this.userId || this.generateUserId();
  ```

  An explicit `userId` always wins; an omitted one reuses the current identity; only a brand-new instance with no identity generates one. `ChatHistoryService.setUserId()` / `_loadSavedRoomHistory()` still run only for an explicit `userId` on a *non*-automatic connect (`:55`), which reproduces the pre-fix initial-connect behavior and avoids reloading/duplicating saved history on each retry.
- The retry now re-invokes the connect path with the preserved identity (`:139`):

  ```js
  this.connect(this.roomId, this.username, this.workerUrl, this.userId);
  ```

  `_autoReconnect` is consumed and reset at the top of `connect()` (`:39-40`), so only the timer path skips the history re-init.

### 2.2 Manual disconnect cancels retries and close callbacks (criterion 2)

`disconnect()` in the initial candidate (`ChatService.js:229-254` at that stage):

- sets `intentionalDisconnect = true` **before** anything else,
- clears and nulls `this.reconnectTimer`,
- takes the socket reference, nulls `this.ws`, and calls `ws.close()` inside `try/catch` (a close on a `CONNECTING` socket can throw in some RN versions),
- keeps the pre-existing history save and cache/listener reset.

The current implementation first calls `_invalidateSocket()` to cancel the timer, bump the generation, null `this.ws`, and close the prior socket best-effort; see §8.1.

`onclose` returns early when `intentionalDisconnect` is set (`:129`), and the timer callback re-checks the flag (`:137`). `onopen` also checks the flag (`:77`), so a socket that finishes opening after the user left cannot send a `join`.

### 2.3 Stale sockets cannot resurrect (criterion 3)

- Each `connect()` bumps `_socketGeneration` and captures the value in the handlers it installs (`:67`).
- `onopen`, `onmessage`, `onerror` and `onclose` all return early when their generation is no longer current (`:77,91,114,121`).
- `onclose` also nulls `this.ws` only if it still points at its own socket (`:122-124`), so it cannot erase a newer connection.
- The retry timer is bound to the generation that scheduled it (`:134-138`), so even a timer task that already left the timer queue cannot reconnect over a newer connection.

### 2.4 Caller compatibility (criterion 4)

Signature is unchanged: `connect(roomId, username, workerUrl = 'ws://localhost:8788', userId = null)` (`ChatService.js:38`). The only in-repo caller is [`src/screens/ChatScreen.js:73`](/home/mohsine/Proyectos/chatti-mobile/src/screens/ChatScreen.js:73), which calls `connect(roomId, username, WORKER_URL)` (3 args, no `userId`); it keeps working, and its generated `userId` now survives retries. `disconnect()`, `sendMessage`, `sendTypingIndicator`, `isConnected`, `on/off/emit` are untouched.

### 2.5 No protocol / no unrelated behavior changes (criterion 5)

The outbound `join` envelope is byte-identical in shape (`{ type: 'join', username, userId }`, `:82-85`). No edits under `web/`, `shared/`, `App.js`, `index.js`, `app.json`, `eas.json`, `package.json`, `docs/`, `.mece/WAVE-3.md` or any `TASK.md`. Retry policy (`maxReconnectAttempts = 5`, `2000 * attempt` delay, clean-code-1000 suppression) is unchanged, as is history saving/loading behavior on initial connect.

---

## 3. Verification: exact commands and results

All commands were run from `/home/mohsine/Proyectos/chatti-mobile` unless stated otherwise.

### 3.1 Syntax check

```console
$ node --check src/services/ChatService.js && echo "node --check: OK"
node --check: OK
```

### 3.2 Diff stat / scope

```console
$ git status --short
 M .mece/cells/MOBILE-P0-PLAN/TASK.md
 M src/services/ChatService.js
?? .mece/WAVE-3.md
?? .mece/cells/MOBILE-16-RECONNECT/

$ git diff --stat
 .mece/cells/MOBILE-P0-PLAN/TASK.md |  2 +-
 src/services/ChatService.js        | 84 ++++++++++++++++++++++++++++++--------
 2 files changed, 68 insertions(+), 18 deletions(-)

$ git diff --name-only -- src/
src/services/ChatService.js
```

> The `.mece/cells/MOBILE-P0-PLAN/TASK.md` change (STAFF-APPROVAL line) and the untracked `.mece` files pre-date this cell and were not edited here. Outside `src/`, this cell only added `REPORT.md`.

### 3.3 Disposable harness (outside the repo)

No mobile test harness exists in this repository (`package.json` has no test script and no Jest/mobile runner; the only `*.test.js` files belong to `backend/`). Per criterion 6 no framework or dependency was added. Instead a throwaway Node harness was built **only under `/tmp/opencode`**, with stubs for `WebSocket`, `NotificationService`, and `ChatHistoryService` (including a fake AsyncStorage-like store):

```console
$ mkdir -p /tmp/opencode/mobile16-harness && cd /home/mohsine/Proyectos/chatti-mobile \
  && sed -e "s#from './NotificationService';#from './NotificationService.stub.mjs';#" \
           -e "s#from './ChatHistoryService';#from './ChatHistoryService.stub.mjs';#" \
           src/services/ChatService.js > /tmp/opencode/mobile16-harness/ChatService.under-test.mjs

$ grep -n "^import" /tmp/opencode/mobile16-harness/ChatService.under-test.mjs
6:import NotificationService from './NotificationService.stub.mjs';
7:import ChatHistoryService from './ChatHistoryService.stub.mjs';
```

The harness (`/tmp/opencode/mobile16-harness/run.mjs`) installs a fake clock (`setTimeout`/`clearTimeout` interception, since the product uses bare timers) and a fake `WebSocket` class exposing `open()/message()/fail(code)`, then runs 27 assertions covering criteria 1–4 plus history-behavior preservation.

Result against the fixed file:

```console
$ cd /tmp/opencode/mobile16-harness && node run.mjs; echo "EXIT=$?"
[PASS] a1: initial join carries explicit userId — {"type":"join","username":"alice","userId":"user_fixed_1"}
[PASS] a2: unexpected close opened exactly one new socket — sockets=2
[PASS] a3: reconnect join reuses original userId — {"type":"join","username":"alice","userId":"user_fixed_1"}
[PASS] a4: reconnect join keeps username and wire envelope — {"type":"join","username":"alice","userId":"user_fixed_1"}
[PASS] a5: generated userId has expected shape — user_1794999236927_7t9jr9xko
[PASS] a6: generated userId survives reconnect — before=user_1794999236927_7t9jr9xko after=user_1794999236927_7t9jr9xko
[PASS] b1: retry timer is pending after unexpected close — timers=1
[PASS] b2: disconnect() cleared the pending retry timer — timers=0
[PASS] b3: no socket opened after disconnect + timer window — sockets=1
[PASS] b4: late close callback scheduled no timer — timers=0
[PASS] b5: late close callback opened no socket — sockets=1
[PASS] b6: explicit connect() after disconnect works
[PASS] c1: stale close scheduled no retry timer — timers=0
[PASS] c2: stale close opened no third socket — sockets=2
[PASS] c3: stale onopen sent no join — sent=[]
[PASS] c4: stale open/close pair opened no socket — sockets=2
[PASS] c5: live socket still joins with its userId
[PASS] d1: required-arity of connect() is 2 (roomId, username) — length=2
[PASS] d2: http workerUrl is mapped to ws — ws://worker.test/api/room/room1
[PASS] d3: 2-arg call uses default workerUrl — ws://localhost:8788/api/room/room2
[PASS] d4: explicit null userId generates one
[PASS] d5: disconnect() still exists and is callable
[PASS] e1: saved history loaded once on initial connect — loads=["room1"]
[PASS] e2: saved_history emitted once — events=1
[PASS] e3: auto-reconnect does not reload/duplicate history — loads=["room1"]
[PASS] e4: auto-reconnect did not re-emit saved_history — events=1
[PASS] e5: fake AsyncStorage stub is wired

RESULT: ALL CHECKS PASSED
EXIT=0
```

Negative control — the same harness against the pre-fix file (`git show HEAD:src/services/ChatService.js`, imported with the same stubs) must fail, proving the checks are not vacuous:

```console
$ cd /tmp/opencode/mobile16-harness/baseline && node run.mjs; echo "EXIT=$?"
[PASS] a1: initial join carries explicit userId — {"type":"join","username":"alice","userId":"user_fixed_1"}
[PASS] a2: unexpected close opened exactly one new socket — sockets=2
[FAIL] a3: reconnect join reuses original userId — {"type":"join","username":"alice","userId":"user_1794999243102_fvbdg883p"}
[FAIL] a4: reconnect join keeps username and wire envelope — {"type":"join","username":"alice","userId":"user_1794999243102_fvbdg883p"}
[PASS] a5: generated userId has expected shape — user_1794999243102_mptfk2pq4
[FAIL] a6: generated userId survives reconnect — before=user_1794999243102_mptfk2pq4 after=user_1794999243102_02i6tonad
[PASS] b1: retry timer is pending after unexpected close — timers=1
[FAIL] b2: disconnect() cleared the pending retry timer — timers=1
[FAIL] b3: no socket opened after disconnect + timer window — sockets=2
[FAIL] b4: late close callback scheduled no timer — timers=1
[FAIL] b5: late close callback opened no socket — sockets=2
WebSocket not connected, state: 0
[FAIL] b6: explicit connect() after disconnect works
[FAIL] c1: stale close scheduled no retry timer — timers=1
[FAIL] c2: stale close opened no third socket — sockets=3
WebSocket not connected, state: 0
[PASS] c3: stale onopen sent no join — sent=[]
[FAIL] c4: stale open/close pair opened no socket — sockets=3
WebSocket not connected, state: 0
[FAIL] c5: live socket still joins with its userId
[PASS] d1: required-arity of connect() is 2 (roomId, username) — length=2
[PASS] d2: http workerUrl is mapped to ws — ws://worker.test/api/room/room1
[PASS] d3: 2-arg call uses default workerUrl — ws://localhost:8788/api/room/room2
[PASS] d4: explicit null userId generates one
[PASS] d5: disconnect() still exists and is callable
[PASS] e1: saved history loaded once on initial connect — loads=["room1"]
[PASS] e2: saved_history emitted once — events=1
[PASS] e3: auto-reconnect does not reload/duplicate history — loads=["room1"]
[PASS] e4: auto-reconnect did not re-emit saved_history — events=1
[PASS] e5: fake AsyncStorage stub is wired

RESULT: 12 CHECK(S) FAILED
EXIT=1
```

**Re-ejecución en esta sesión (2026-11-18, autorizada por Staff):** se inspeccionó el repo en busca de harness/pruebas existentes específicas de `ChatService`/#16 (`package.json` sin script de test; `*.test.js` solo en `backend/`; `web/scripts/reconnect-probe.test.ts`/`reconnect.vitest.config.ts` inspeccionados pero son probe de `shared/ws/DirectMessageSocket` web, no aplicables a `src/services/ChatService.js` móvil). Se encontró y reutilizó el harness ya existente en `/tmp/opencode/mobile16-harness/` (sin añadir framework/dependencias). Entorno: `node v26.12.0`, `npm 12.2.1` (repo declara `engines.node >=22.23.4 <23`). Se regeneraron los artefactos bajo prueba desde el estado actual y desde `HEAD`:

```console
$ node --version && npm --version
v26.12.0
12.2.1

$ sed -e "s#from './NotificationService';#from './NotificationService.stub.mjs';#" \
      -e "s#from './ChatHistoryService';#from './ChatHistoryService.stub.mjs';#" \
      src/services/ChatService.js > /tmp/opencode/mobile16-harness/ChatService.under-test.mjs
$ sed -e "s#from './NotificationService';#from './NotificationService.stub.mjs';#" \
      -e "s#from './ChatHistoryService';#from './ChatHistoryService.stub.mjs';#" \
      <(git show HEAD:src/services/ChatService.js) > /tmp/opencode/mobile16-harness/baseline/ChatService.under-test.mjs
$ grep -n "^import" /tmp/opencode/mobile16-harness/ChatService.under-test.mjs
6:import NotificationService from './NotificationService.stub.mjs';
7:import ChatHistoryService from './ChatHistoryService.stub.mjs';
$ grep -n "^import" /tmp/opencode/mobile16-harness/baseline/ChatService.under-test.mjs
6:import NotificationService from './NotificationService.stub.mjs';
7:import ChatHistoryService from './ChatHistoryService.stub.mjs';
```

Resultado exacto (archivo actual):

```console
$ cd /tmp/opencode/mobile16-harness && node run.mjs; echo "EXIT=$?"
[PASS] a1: initial join carries explicit userId — {"type":"join","username":"alice","userId":"user_fixed_1"}
[PASS] a2: unexpected close opened exactly one new socket — sockets=2
[PASS] a3: reconnect join reuses original userId — {"type":"join","username":"alice","userId":"user_fixed_1"}
[PASS] a4: reconnect join keeps username and wire envelope — {"type":"join","username":"alice","userId":"user_fixed_1"}
[PASS] a5: generated userId has expected shape — user_1794999648179_erosqwyi4
[PASS] a6: generated userId survives reconnect — before=user_1794999648179_erosqwyi4 after=user_1794999648179_erosqwyi4
[PASS] b1: retry timer is pending after unexpected close — timers=1
[PASS] b2: disconnect() cleared the pending retry timer — timers=0
[PASS] b3: no socket opened after disconnect + timer window — sockets=1
[PASS] b4: late close callback scheduled no timer — timers=0
[PASS] b5: late close callback opened no socket — sockets=1
[PASS] b6: explicit connect() after disconnect works
[PASS] c1: stale close scheduled no retry timer — timers=0
[PASS] c2: stale close opened no third socket — sockets=2
[PASS] c3: stale onopen sent no join — sent=[]
[PASS] c4: stale open/close pair opened no socket — sockets=2
[PASS] c5: live socket still joins with its userId
[PASS] d1: required-arity of connect() is 2 (roomId, username) — length=2
[PASS] d2: http workerUrl is mapped to ws — ws://worker.test/api/room/room1
[PASS] d3: 2-arg call uses default workerUrl — ws://localhost:8788/api/room/room2
[PASS] d4: explicit null userId generates one
[PASS] d5: disconnect() still exists and is callable
[PASS] e1: saved history loaded once on initial connect — loads=["room1"]
[PASS] e2: saved_history emitted once — events=1
[PASS] e3: auto-reconnect does not reload/duplicate history — loads=["room1"]
[PASS] e4: auto-reconnect did not re-emit saved_history — events=1
[PASS] e5: fake AsyncStorage stub is wired

RESULT: ALL CHECKS PASSED
EXIT=0
```

Control negativo exacto (HEAD pre-fix, mismo harness):

```console
$ cd /tmp/opencode/mobile16-harness/baseline && node run.mjs; echo "EXIT=$?"
[PASS] a1: initial join carries explicit userId — {"type":"join","username":"alice","userId":"user_fixed_1"}
[PASS] a2: unexpected close opened exactly one new socket — sockets=2
[FAIL] a3: reconnect join reuses original userId — {"type":"join","username":"alice","userId":"user_1794999648187_0ista82fb"}
[FAIL] a4: reconnect join keeps username and wire envelope — {"type":"join","username":"alice","userId":"user_1794999648187_0ista82fb"}
[PASS] a5: generated userId has expected shape — user_1794999648187_hj6x7nr2h
[FAIL] a6: generated userId survives reconnect — before=user_1794999648187_hj6x7nr2h after=user_1794999648187_dy7cpewrt
[PASS] b1: retry timer is pending after unexpected close — timers=1
[FAIL] b2: disconnect() cleared the pending retry timer — timers=1
[FAIL] b3: no socket opened after disconnect + timer window — sockets=2
[FAIL] b4: late close callback scheduled no timer — timers=1
[FAIL] b5: late close callback opened no socket — sockets=2
WebSocket not connected, state: 0
[FAIL] b6: explicit connect() after disconnect works
[FAIL] c1: stale close scheduled no retry timer — timers=1
[FAIL] c2: stale close opened no third socket — sockets=3
WebSocket not connected, state: 0
[PASS] c3: stale onopen sent no join — sent=[]
[FAIL] c4: stale open/close pair opened no socket — sockets=3
WebSocket not connected, state: 0
[FAIL] c5: live socket still joins with its userId
[PASS] d1: required-arity of connect() is 2 (roomId, username) — length=2
[PASS] d2: http workerUrl is mapped to ws — ws://worker.test/api/room/room1
[PASS] d3: 2-arg call uses default workerUrl — ws://localhost:8788/api/room/room2
[PASS] d4: explicit null userId generates one
[PASS] d5: disconnect() still exists and is callable
[PASS] e1: saved history loaded once on initial connect — loads=["room1"]
[PASS] e2: saved_history emitted once — events=1
[PASS] e3: auto-reconnect does not reload/duplicate history — loads=["room1"]
[PASS] e4: auto-reconnect did not re-emit saved_history — events=1
[PASS] e5: fake AsyncStorage stub is wired

RESULT: 12 CHECK(S) FAILED
EXIT=1
```

Mapping of harness scenarios to the acceptance criteria:

| Criterion | Harness checks |
|---|---|
| 1 — reconnect reuses original `userId` | a1–a6 |
| 2 — manual disconnect cancels timer + later close callback | b1–b6 |
| 3 — stale socket cannot reconnect after a newer connection | c1–c5 |
| 4 — `connect(roomId, username, workerUrl, userId)` compatibility | a1, d1–d5, plus 3-arg a5/a6 |
| 5 — no wire/behavior change | a4 (exact join envelope), e1–e4 (history behavior unchanged) |
| 6 — coverage | no repo harness → manual QA below (harness is disposable evidence only) |

**Limitations of the harness:** Node 26 (repo engines declare `>=22.23.4 <23`), not React Native. It exercises `ChatService` logic with a simulated RN-style WebSocket, so it does not prove device timing, `close()`-while-`CONNECTING` error codes, or app lifecycle behavior; those are what the manual QA below must confirm.

### 3.4 Full product diff (exact)

```diff
@@ constructor @@
+        this.workerUrl = null;
         this.listeners = new Map();
         this.reconnectAttempts = 0;
         this.maxReconnectAttempts = 5;
         this.notificationService = new NotificationService();
         this.messageCache = []; // Track messages for saving
         this.messageIds = new Set();
+        this.reconnectTimer = null;
+        this.intentionalDisconnect = false;
+        this._socketGeneration = 0;
+        this._autoReconnect = false;

@@ connect(roomId, username, workerUrl = 'ws://localhost:8788', userId = null) @@
+        const autoReconnect = this._autoReconnect === true;
+        this._autoReconnect = false;
+
+        if (this.reconnectTimer) {
+            clearTimeout(this.reconnectTimer);
+            this.reconnectTimer = null;
+        }
+        this.intentionalDisconnect = false;
+
         this.roomId = roomId;
         this.username = username;
-        this.userId = userId || this.generateUserId();
+        this.workerUrl = workerUrl;
+        // Preserve the existing userId across automatic retries when omitted.
+        this.userId = userId || this.userId || this.generateUserId();

-        // Initialize chat history for rooms
-        if (userId) {
+        // Initialize chat history for rooms (preserve initial-connect behavior).
+        if (userId && !autoReconnect) {
             ChatHistoryService.setUserId(userId);
             this._loadSavedRoomHistory(roomId);
         }

-        const wsUrl = workerUrl.replace('http://', 'ws://').replace('https://', 'wss://');
-        const url = `${wsUrl}/api/room/${roomId}`;
+        const wsUrl = this.workerUrl.replace('http://', 'ws://').replace('https://', 'wss://');
+        const url = `${wsUrl}/api/room/${this.roomId}`;

-        // Create WebSocket connection (React Native has WebSocket globally)
-        this.ws = new WebSocket(url);
+        // Replace any existing socket; stale callbacks are ignored by generation.
+        const generation = ++this._socketGeneration;
+        const ws = new WebSocket(url);
+        this.ws = ws;

-        this.ws.onopen = () => {
-            console.log('✅ Connected to chat room:', roomId);
+        ws.onopen = () => {
+            if (generation !== this._socketGeneration || this.intentionalDisconnect) return;
+            console.log('✅ Connected to chat room:', this.roomId);
             this.reconnectAttempts = 0;
             ...
-            this.emit('connected', { roomId, username });
+            this.emit('connected', { roomId: this.roomId, username: this.username });
         };

-        this.ws.onmessage = (event) => {
+        ws.onmessage = (event) => {
+            if (generation !== this._socketGeneration) return;

-        this.ws.onerror = (error) => {
+        ws.onerror = (error) => {
+            if (generation !== this._socketGeneration) return;

-        this.ws.onclose = (event) => {
+        ws.onclose = (event) => {
+            if (generation !== this._socketGeneration) return;
+            if (this.ws === ws) {
+                this.ws = null;
+            }
             console.log('🔌 Disconnected from chat room. Code:', event.code, 'Reason:', event.reason);
             console.log('Was clean close:', event.wasClean);
             this.emit('disconnected', { code: event.code, reason: event.reason });

+            if (this.intentionalDisconnect) return;
+
             if (this.reconnectAttempts < this.maxReconnectAttempts && event.code !== 1000) {
                 this.reconnectAttempts++;
                 console.log(`Reconnecting... (attempt ${this.reconnectAttempts})`);
-                setTimeout(() => this.connect(roomId, username, workerUrl), 2000 * this.reconnectAttempts);
+                const delay = 2000 * this.reconnectAttempts;
+                // Tie the retry to this socket generation so a newer connection,
+                // or a manual disconnect, can never be overridden by this timer.
+                const retryGeneration = generation;
+                this.reconnectTimer = setTimeout(() => {
+                    this.reconnectTimer = null;
+                    if (this.intentionalDisconnect) return;
+                    if (retryGeneration !== this._socketGeneration) return;
+                    this._autoReconnect = true;
+                    this.connect(this.roomId, this.username, this.workerUrl, this.userId);
+                }, delay);
             } else if (event.code !== 1000) {
                 console.error('Max reconnection attempts reached');
                 this.emit('error', { message: 'Could not connect to chat server' });
             }
         };

@@ disconnect() @@
+        this.intentionalDisconnect = true;
+        if (this.reconnectTimer) {
+            clearTimeout(this.reconnectTimer);
+            this.reconnectTimer = null;
+        }
+
         if (this.roomId && this.messageCache.length > 0) {
             ChatHistoryService.saveRoomMessages(this.roomId, this.messageCache);
         }
-        if (this.ws) {
-            this.ws.close();
-            this.ws = null;
+
+        const ws = this.ws;
+        this.ws = null;
+        if (ws) {
+            try {
+                ws.close();
+            } catch (error) {
+                console.error('Error closing WebSocket:', error);
+            }
         }
+
         this.messageCache = [];
         this.messageIds = new Set();
         this.listeners.clear();
```

The authoritative full diff is obtained with `git diff src/services/ChatService.js` (untracked/committed state: nothing committed for this cell).

---

## 4. Manual QA procedure and coverage gap

### 4.1 Coverage gap

The repository has **no mobile test harness**: `package.json` exposes only Expo scripts (`dev`, `start`, `android`, `ios`, `web`), with no `test` script, no Jest/Vitest/Detox configuration on the mobile side, and no `__tests__`/`*.test.js` outside `backend/`. Criterion 6 forbids adding a framework/dependency here, so automated coverage for `ChatService` is out of reach in this cell. The `/tmp/opencode` harness above is disposable evidence, not repo coverage. **Real functional validation must therefore come from QA on a mobile runtime**, with screenshots/logs as evidence.

### 4.2 Manual QA procedure (mobile)

**Prerequisites**

- Device/emulator with a dev build (`npx expo run:android|ios` or a dev-client build), Metro logs visible (`npx expo start`, or `adb logcat`).
- Backend room worker reachable from the device; either `wrangler dev` with `wrangler tail` or the staging worker with logs available.
- A second client (web room in a browser) to independently observe `user_joined` payloads.
- Record: date, device + OS version, build/commit SHA of this branch, worker URL.

**QA-1 — retry keeps `userId` (criterion 1)**

1. Open the app, enter room `<room>`; send one message.
2. Capture `userId A`: in Metro logs find `📨 Received: user_joined` (the worker broadcasts it to the sender too, `backend/src/ChatRoom.js:185-191`), or read the matching `user_joined` line in the web client.
3. Disable networking for 8–10 s (airplane mode / Wi-Fi off). Expect `🔌 Disconnected ... Code: 1006` then `Reconnecting... (attempt 1)`.
4. Restore networking. Expect a new `user_joined` for the same username.
5. **Expected:** the new `user_joined.userId` equals `userId A`. No second identity for that username in the web client.
6. Repeat twice. **Expected:** `userId` still `A`; attempt counter resets to 0 after each successful open.

**QA-2 — manual disconnect cancels the retry timer (criterion 2)**

1. In the room, disable networking so `Reconnecting... (attempt 1)` appears (a timer is now pending, 2 s).
2. Immediately leave the room (back navigation → `ChatScreen` cleanup calls `disconnect()`).
3. Wait 30 s with logs visible and `wrangler tail` open.
4. **Expected:** no further `Reconnecting...` log, no new `join`/`user_joined` for that username, no new WebSocket connection in the worker tail. Re-enable networking afterwards and confirm still nothing reconnects.

**QA-3 — late close event after manual disconnect (criterion 2, callback path)**

1. Enter the room, then leave it (clean `disconnect()`), and immediately switch networking off/on for ~10 s.
2. **Expected:** no `Reconnecting...` log and no new `user_joined`; the app must not silently rejoin a room the user left.

**QA-4 — newer connection wins over an old socket (criterion 3)**

1. Enter room `<room>`, leave, and re-enter the same room quickly (within ~2 s), twice.
2. **Expected:** exactly one `join` per entry, only one live `user_joined` for the current entry, no `Reconnecting...` storm, and no duplicate messages in the room list.
3. While connected, toggle airplane mode briefly so the old socket is replaced by a retry; after recovery, send a message and confirm it appears once (no duplicate sends/joins).

**QA-5 — regression of normal behavior (criterion 5)**

1. Fresh entry: join succeeds, `connected` indicator turns online, messages send/receive, typing indicator still works, leaving the room shows offline and does not reconnect.
2. With history enabled in Settings, enter a room with saved messages: `saved_history` loads once; after an automatic reconnect the list is not duplicated/re-ordered.

**Evidence to capture**

- Screenshots/video of the app state for QA-1..QA-5.
- Raw log excerpts (Metro/`adb logcat` and `wrangler tail`) with timestamps showing `userId` before/after reconnect, and the absence of retry lines after disconnect.
- Web client `user_joined` payloads for cross-check.
- Confirmation of device model, OS, worker URL and the branch commit SHA tested.

**Exit criteria for QA:** all five procedures show the expected result with the evidence above, and no new console error is introduced that was not present on `dev`.

---

## 5. Residual risks and compatibility

- **`userId` is still per screen mount, not per install.** `ChatScreen` creates a new `ChatService` on mount (`src/screens/ChatScreen.js:70`), so leaving and re-entering a room intentionally generates a new identity. Issue #16 and WAVE-3 scope this cell to automatic socket retries; persisting a stable identity across mounts would change session semantics and belongs with #15/#14 follow-up work. The room is `ephemeral: true` server-side (`docs/QA-M2-INTEROP.md`, finding 5), so no stored room history is affected.
- **No automated regression protection.** Because no mobile harness exists, a future refactor could regress this fix without CI detection. Recommend a follow-up decision by Staff on a minimal mobile unit-test harness (out of scope here).
- **Retry attempts are still only reset on a successful `open`.** Unchanged from before; after 5 consecutive failed retries a manual re-entry requires remounting the screen. This matches pre-fix behavior and was deliberately not altered.
- **`new WebSocket(url)` is still created after the generation bump.** If the constructor throws (malformed `workerUrl`), the exception propagates as before, but the previous socket's callbacks become inert. All in-repo callers pass a constant worker URL; risk is low and the pre-existing throw behavior is unchanged.
- **RN close codes vary.** The fix covers both a pending timer and a later close callback, whichever code the platform reports (including `1006` for a close while `CONNECTING`). Device-specific timing is exactly what QA-2/QA-3 must confirm; the Node harness cannot.
- **Compatibility:** the public method surface is unchanged (`connect` arity `2` required params, same 4-parameter shape, same defaults), the `join`/`message`/`typing` wire messages are unchanged, and no `web/` or `shared/` file was touched, so web↔mobile interop is unaffected. No new dependency, config, secret or deploy.
- **Out-of-scope drift was not introduced:** only `src/services/ChatService.js` changed in product code; the report is the only `.mece` write.

---

## 6. STATUS delta

```text
STATUS delta — MOBILE-16-RECONNECT (#16)
- Código candidato en `bugfix/mobile-16-session-reconnect-android-qa` desde `origin/dev`; fuente SHA-256 `ddbc8af979ce94491d80297e5d0024dbda98c9307f1406bc93d0b22d58b4c457`; sin commit, push ni PR.
- Causa raíz corregida: identidad efímera por retry, timer no cancelable, callbacks stale y socket anterior no cerrado; F1–F4 descritos en §8.
- Harness local: 27/27 original y 19/19 F1–F4 PASS; controles negativos 12 FAIL y 14 FAIL. `node --check` y `git diff --check` OK.
- QA funcional §15: a–d PASS para el APK QA SHA-256 `2868e8cbaeb4b89288d1dc2577509f6044d5a69a0e32f89087c577cd29907c74`, que contiene exactamente el fuente anterior; QA sign-off otorgado.
- CTO technical sign-off: APPROVED para el mismo SHA de fuente/diff, hilo T3 `mcp:ec582871-66d1-4ee5-acbc-d00f796d8189` (run `run:thread:mcp%3Aec582871-66d1-4ee5-acbc-d00f796d8189:ordinal:1`).
- El issue y la tarjeta siguen OPEN / IN PROGRESS en trackers externos (sin cambios en esta sesión). No se marca DONE ni se promueve; no hay commit/push/PR por el límite de esta sesión.
- Sin cambios en `web/`, `shared/`, protocolo, config ni dependencias. Riesgo residual: `userId` es estable durante el retry, pero no entre montajes de pantalla.
```

---

## 7. Session IDs

T3 child implementation thread/run: `thread:delegated-task:command%3Amcp%3Aeda45101-62c4-4d20-b44c-5ff722e20356%3Adelegate-task%3A7069fd6a-57e5-44b7-9231-6b9ef23b9a8f` / `run:thread:thread%3Adelegated-task%3Acommand%253Amcp%253Aeda45101-62c4-4d20-b44c-5ff722e20356%253Adelegate-task%253A7069fd6a-57e5-44b7-9231-6b9ef23b9a8f:ordinal:1`, provider `opencode`, model `opencode/big-pickle`.

**Conductor record** (added by the CTO thread `be8f1c39-a630-47b3-8a56-e4175b416db1` after independent review):

- T3 child thread: `thread:delegated-task:command%3Amcp%3Aeda45101-62c4-4d20-b44c-5ff722e20356%3Adelegate-task%3A7069fd6a-57e5-44b7-9231-6b9ef23b9a8f`
- T3 child run: `run:thread:thread%3Adelegated-task%3Acommand%253Amcp%253Aeda45101-62c4-4d20-b44c-5ff722e20356%253Adelegate-task%253A7069fd6a-57e5-44b7-9231-6b9ef23b9a8f:ordinal:1`
- Provider/model: `opencode` / `opencode/big-pickle`
- Origin of the inherited WIP diff: OpenCode CLI session `ses_e11bdbcd0ffekzVv3vTToHfraI`, run before the T3-only rule of 2026-11-18. It is recorded for traceability only; no further CLI run was used or resumed after the rule.

This implementation ran as a T3 Code-managed child thread (no `opencode run` or other agent CLI was used). No commit, push, PR, GitHub/Trello update or deploy was performed by this cell.

---

## 8. Seguimiento CTO — corrección de F1–F4 (2026-11-18)

**Contexto:** la revisión CTO independiente ([thread `mcp:aecb5ad1-f6ca-4769-870d-142e8b9ae7be`](https://app.t3.codes/threads/39965b4d-5f2a-4a0f-96a4-e78e93c02ef4/mcp:aecb5ad1-f6ca-4769-870d-142e8b9ae7be), runs `ordinal:1` y la actualización posterior a QA §14) emitió **CTO NOT APPROVED** con **F1 obligatorio** y **F2–F4** recomendados. F5 (`_loadSavedRoomHistory` asíncrono sin guarda) es pre-existente y queda explícitamente **fuera de alcance** (seguimiento #15). Esta sección documenta únicamente la corrección de F1–F4; no cambia la QA funcional ni el sign-off.

**Ejecución T3 (este seguimiento):** thread `mcp:65578db3-49db-4e7d-9dc9-94c8f84fc7f4` ([T3 thread](https://app.t3.codes/threads/39965b4d-5f2a-4a0f-96a4-e78e93c02ef4/mcp:65578db3-49db-4e7d-9dc9-94c8f84fc7f4)), run `run:thread:mcp%3A65578db3-49db-4e7d-9dc9-94c8f84fc7f4:ordinal:1`, provider `opencode`, modelo `opencode/big-pickle`. Sin CLI de OpenCode, sin commit/push/PR, sin deploy, sin dispositivo/APK.

### 8.1 Cambios y decisiones

Las descripciones de §2.1 y §2.2 y el riesgo del constructor de §5 quedan **superadas por esta sección** en lo relativo a F1–F4; el resto de §2–§5 sigue vigente.

Fichero de producto modificado: [`src/services/ChatService.js`](/home/mohsine/.codex/worktrees/89b3/chatti-mobile/src/services/ChatService.js). Informe: este `REPORT.md`. No se tocaron QA REPORT, `WAVE-3.md`, `TASK.md` ni ningún otro fichero en este seguimiento.

- **F1 — socket anterior abierto al reemplazarlo (corregido).** Nuevo helper privado `_invalidateSocket()` (`ChatService.js:232-254`): cancela el timer de retry, **incrementa `_socketGeneration` antes de cerrar**, pone `this.ws = null`, y hace `previous.close()` en `try/catch`. `connect()` lo invoca antes de crear el socket nuevo (`ChatService.js:63-70`), y `disconnect()` también (`ChatService.js:259-263`), por lo que ya no puede quedar un socket huérfano: el anterior se cierra best-effort y un `disconnect()` posterior también lo alcanza.
- **F2 — identidad heredada por un `connect()` manual (corregido).** La resolución pasa a `this.userId = userId || (autoReconnect ? this.userId : null) || this.generateUserId()` (`ChatService.js:46-49`). Un `userId` explícito siempre gana; solo el retry automático puede reutilizar la identidad previa; un `connect()` manual nuevo sin `userId` genera una identidad nueva. El retry además sigue pasándola explícitamente (`ChatService.js:141`), por lo que el criterio 1 de #16 se mantiene.
- **F3 — `disconnect()` no invalidaba la generación (corregido).** `disconnect()` marca `intentionalDisconnect`, llama a `_invalidateSocket()` (bump de generación + cancelación del timer + close best-effort) y solo después guarda historial/limpia cache y listeners. Un `open` o `close` tardío, o un `close()` que lance (caso `CONNECTING` en RN), ya no puede enviar `join` ni programar un retry; el flag queda como defensa adicional, no como única fuente de verdad.
- **F4 — constructor de `WebSocket` que lanza (corregido).** `this.ws` se anula y el socket anterior se cierra **antes** de `new WebSocket(url)`. Si el constructor lanza, la excepción se propaga igual que antes, pero `this.ws` queda `null` y `send()` no puede escribir por el socket viejo.
- **Sin cambios:** firma/aridad de `connect()` (2 requeridos, 4 parámetros, mismos defaults), envelope `join`, protocolo, política de retry (`maxReconnectAttempts`, `2000 * attempt`, supresión de código 1000), carga/guardado de historial, listeners y salida manual. Callers intactos (`ChatScreen` sigue llamando con 3 argumentos).

### 8.2 Verificación ejecutada

Comandos desde `/home/mohsine/.codex/worktrees/89b3/chatti-mobile` y `/tmp/opencode/mobile16-harness` (harness desechable, sin dependencias nuevas):

```console
$ node --check src/services/ChatService.js && echo "node --check: OK"
node --check: OK

$ git diff --check && echo "git diff --check: OK"
git diff --check: OK

$ cd /tmp/opencode/mobile16-harness && node run.mjs; echo "EXIT=$?"
...
RESULT: ALL CHECKS PASSED
EXIT=0
# 27/27 PASS (harness original, sin cambios en sus 27 assertions). Log: qa-session3-current.log

$ cd /tmp/opencode/mobile16-harness/baseline && node run.mjs; echo "EXIT=$?"
RESULT: 12 CHECK(S) FAILED
EXIT=1
# control negativo sobre HEAD pre-fix: 15 PASS / 12 FAIL. Log: qa-session3-baseline.log

$ cd /tmp/opencode/mobile16-harness && node run-cto-f1-f4.mjs; echo "EXIT=$?"
RESULT: ALL CHECKS PASSED
EXIT=0
# 19/19 PASS (F1–F4). Log: qa-session3-f1f4-current.log

$ cd /tmp/opencode/mobile16-harness && TARGET=baseline node run-cto-f1-f4.mjs; echo "EXIT=$?"
RESULT: 14 CHECK(S) FAILED
EXIT=1
# control negativo HEAD pre-fix: 5 PASS / 14 FAIL. Log: qa-session3-f1f4-baseline.log

$ cd /tmp/opencode/qa-mobile16 && node overlap-harness.mjs
{
  "socketsCreated": 2,
  "firstStateAtSecondConnect": 3,
  "firstCloseCalls": 1,
  "firstReadyState": 3,
  "secondReadyState": 1,
  "firstSent": ["join"],
  "secondSent": ["join"],
  "retryTimersAfterStaleClose": 0
}
# Antes del seguimiento: firstStateAtSecondConnect=1 (OPEN), firstCloseCalls=0.
# Ahora: CLOSED (3) y closeCalls=1. Log: overlap-harness-after-f1.out
```

Cobertura de los nuevos checks (19): F1 `f1a/f1b/f1b2/f1c/f1d` (cierre del anterior, un solo socket vivo, sin retry tardío, `disconnect()` cierra todos los sockets de la instancia); F2 `f2a/f2b/f2c` (manual sin `userId` genera identidad nueva; retry conserva la original; tras `disconnect()` no se hereda); F3 `f3a/f3b/f3c/f3c2/f3d/f3e/f3f/f3g` (`disconnect()` en `CONNECTING`, open/close tardíos, bump de generación, `close()` que lanza, y que no escape ni permita join/retry); F4 `f4a/f4b/f4c` (constructor que lanza: excepción se propaga, `this.ws=null`, anterior cerrado y `send()` no lo usa).

**Artefacto verificado:**

- Rama `bugfix/mobile-16-session-reconnect-android-qa`, HEAD `dd3d72ce83d106a6aca806f7727595553baaef6b` = `origin/dev` (0 commits sobre `origin/dev`; `origin/dev` es ancestro).
- Ficheros cambiados por el seguimiento: `src/services/ChatService.js` y este informe. `git diff --stat` del árbol: `.mece/cells/MOBILE-P0-PLAN/TASK.md` (edición Staff pre-existente, no tocada) y `src/services/ChatService.js`; 88 inserciones / 19 borrados en total.
- `SHA-256(src/services/ChatService.js)` = `ddbc8af979ce94491d80297e5d0024dbda98c9307f1406bc93d0b22d58b4c457`.
- `SHA-256(git diff -- src/services/ChatService.js)` = `4d1df4f339f60f11ed8dc3d43dd578c0fc01814840127a711ff2a23c7a716986`.
- Sin commit, push, PR, GitHub/Trello, deploy, ajustes de Android, instalación de APK ni cambios de worker.

### 8.3 Limitaciones y riesgos restantes

> **Snapshot histórico al terminar la implementación, antes de la nueva QA y revisión CTO.** Las dos entradas de sign-off de abajo fueron resueltas posteriormente; véase §8.4.

- **El harness no es QA funcional.** Node 26 + `WebSocket` simulado; no mide timing real de React Native, códigos de `close()` durante `CONNECTING` ni lifecycle Android. Que la generación invalide callbacks está probado; que el sistema operativo libere el recurso cuando `close()` lanza en `CONNECTING` **no** puede probarse aquí (queda como limitación conocida y el callback ya es inerte).
- **En ese snapshot, el QA sign-off de §14 no cubría este diff.** §15 ahora otorga QA sign-off sobre el APK exacto `2868e8cbaeb4b89288d1dc2577509f6044d5a69a0e32f89087c577cd29907c74` y fuente/diff exactos.
- **En ese snapshot, CTO estaba pendiente.** La revisión CTO posterior de T3 `mcp:ec582871-66d1-4ee5-acbc-d00f796d8189` emitió `APPROVED`; detalles en §8.4.
- **F5 fuera de alcance:** la carga asíncrona de historial sin guarda de generación/sala sigue igual; pertenece a #15. La identidad sigue siendo por montaje de pantalla, no por instalación. `reconnectAttempts` solo se resetea en `open`, como antes.
- **Estado del snapshot §8.3:** IN PROGRESS antes de §15 y del review CTO. El estado vigente, con ambos sign-offs, se registra a continuación.

### 8.4 Sign-offs vigentes para el artefacto exacto

- **Fuente:** `src/services/ChatService.js`, SHA-256 `ddbc8af979ce94491d80297e5d0024dbda98c9307f1406bc93d0b22d58b4c457`.
- **Diff de código:** SHA-256 `4d1df4f339f60f11ed8dc3d43dd578c0fc01814840127a711ff2a23c7a716986`.
- **APK QA instalado en user 999:** SHA-256 `2868e8cbaeb4b89288d1dc2577509f6044d5a69a0e32f89087c577cd29907c74`; coincide con el paquete instalado y contiene el fuente indicado.
- **QA sign-off:** otorgado para criterios a–d en `.mece/cells/QA-MOBILE-16-RECONNECT/REPORT.md` §15, T3 thread `mcp:81055c85-c0d9-4e23-a9f4-6aad77d9d16f`. Criterios a–d PASS; limitación de c documentada.
- **CTO technical sign-off:** **APPROVED** para los SHA exactos anteriores, revisión read-only T3 thread `mcp:ec582871-66d1-4ee5-acbc-d00f796d8189`, run `run:thread:mcp%3Aec582871-66d1-4ee5-acbc-d00f796d8189:ordinal:1`. Findings no bloqueantes A2–A7 y observación de trazabilidad A1 están en el hilo T3.
- **Estado al cerrar esta revisión (antes de entrega):** QA y CTO sign-offs cumplidos para el artefacto actual; no había commit/push/PR todavía. Staff autorizó después la entrega de esta rama; ver el addendum §8.5. #16 permanece OPEN / IN PROGRESS y no se declara DONE ni promovido.

### 8.5 Entrega Staff — 2026-11-18

- Commit `ea2f5a8ec6e1c432e1e230bb42a9d7b858c70588` (`fix(mobile): stabilize room reconnect lifecycle (#16)`) en `bugfix/mobile-16-session-reconnect-android-qa`, basado directamente en `dev` `dd3d72ce83d106a6aca806f7727595553baaef6b`; rama publicada en `origin`.
- [PR #66](https://github.com/wz0un/chatti-mobile/pull/66) abierto hacia `dev`, no mergeado. GitHub muestra un commit ahead, sin workflow runs/status checks ni review submissions al momento de esta comprobación.
- QA y CTO sign-offs siguen aplicando al fuente SHA `ddbc8af979ce94491d80297e5d0024dbda98c9307f1406bc93d0b22d58b4c457`, diff SHA `4d1df4f339f60f11ed8dc3d43dd578c0fc01814840127a711ff2a23c7a716986` y APK QA SHA `2868e8cbaeb4b89288d1dc2577509f6044d5a69a0e32f89087c577cd29907c74`.
- No se cerró #16, no se modificó Trello, no se desplegó y no se cambió `master`.
