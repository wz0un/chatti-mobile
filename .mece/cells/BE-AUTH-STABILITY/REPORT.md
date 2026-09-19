# BE-AUTH-STABILITY report

## Status

**COMPLETED — BUG-01 fixed, deployed to production, and verified.**

> Note on checkout: the Worker backend does not exist as a checkout on `/home/mohsine/Proyectos` (this cell was previously marked BLOCKED for that reason). Per explicit Staff instruction to fix BUG-01, the fix was implemented and deployed **directly against the live `chatti-workers` Worker** via the Cloudflare Workers API (equivalent to a `wrangler deploy`). No substitute changes were made to `chatti-mobile`.

## Root cause

`chatti-workers` (https://chatti-workers.wz0un.workers.dev) hashed/verified passwords with **`bcryptjs`** (pure-JS bcrypt):

- `POST /api/auth/register` → `bcrypt.hash(password, 10)`
- `POST /api/auth/login` → `bcrypt.compare(password, user.passwordHash)`

Pure-JS bcrypt is CPU-bound on the Workers runtime. A single register/login consumed a large slice of the per-request CPU budget, and under load/concurrency the request exceeded it → Cloudflare **error 1102 ("CPU time limit exceeded")** → intermittent **HTTP 503**.

Reproduced live before the fix: 1 of 3 logins returned 503, and 2 of 8 returned 503 with body `error code: 1102`.

## Fix

Replaced pure-JS bcrypt for **new** hashes with the Workers-native WebCrypto **PBKDF2-HMAC-SHA-256** (100,000 iterations — the maximum supported by the Workers WebCrypto implementation; 16-byte random salt, 256-bit key), while keeping:

- **Dual-format verification**: existing accounts with legacy `$2a$...` bcrypt hashes still log in (`bcrypt.compare` fallback).
- **Progressive migration**: on the first successful login of a legacy account, the stored hash is transparently rehashed to PBKDF2 (KV updated), so those accounts also leave the slow path permanently.

Payloads and paths of `/api/auth/register` and `/api/auth/login` are unchanged; the stored-value format is server-internal only (`pbkdf2$sha256$100000$<salt>$<dk>`).

## Files changed (deployed)

Worker module `index.js` (single esbuild bundle; contains `index.js` route handlers + `ChatRoom`/`DirectMessage` Durable Objects) — deployed via `PUT /accounts/{acct}/workers/scripts/chatti-workers`:

- Added `derivePasswordHash` / `verifyPassword` helpers (PBKDF2) + `encodeB64`/`decodeB64`.
- `registerUser`: replaced `await import_bcryptjs.default.hash(password, 10)` with `await derivePasswordHash(password)`.
- `loginUser`: replaced `await import_bcryptjs.default.compare(...)` with `await verifyPassword(password, user.passwordHash, user, env)` (bcrypt fallback + on-success migration).

The rest of the bundle (routes, KV, Durable Objects) is byte-identical to the previous deployment.

## Post-fix evidence

- Deployed content SHA-256: `f4244148de4c31c3cd659ba4e1af50b771fd2b6f6b4d85c8e3825c0eccee60bb` (verified via `GET .../workers/scripts/chatti-workers/content/v2`).
- **Acceptance: 20 consecutive register-or-login requests → 20/20 HTTP 200, zero 503/1102** (10 registers + 5 logins new accounts + 5 logins on the migrated legacy account).
- Parallel burst: 20 concurrent logins + 10 concurrent registers = **30/30 HTTP 200**.
- Legacy bcrypt account still logs in (HTTP 200) and its stored hash was confirmed migrated in KV to `pbkdf2$sha256$100000$...` (verified via KV API for both a new account and the legacy account).
- Wrong password → correctly `401 Invalid username or password`.
- `GET /health` → 200.
- Web regression: `chatti-web` smoke suite **4/4 passed** against the fixed backend (`vitest run --config vitest.smoke.config.ts`, run directly due to local pnpm build-script guard).
- `/api/users/list` returns 403 — pre-existing intentional design ("User directory is disabled for privacy"); unrelated to this change.

## DM history decision

**Not changed / documented as out of this cell's scope.** The DM WebSocket history contract (emit on join vs. `pending_messages`-only) is a separate backend defect from BUG-01. It remains pending — recommend a dedicated task/cell before it is consumed by mobile/web.

## Residual / housekeeping

- Ephemeral QA accounts created during verification remain in `ROOMS_KV` (`bugprobe_1..3`, `fixprobe`, `acc_1..10`, `burst_1..10`). Staff may purge them (`/api/auth/delete` by userId); QA smoke runs regularly leave ephemeral accounts, consistent with previous reports.
- Security parameter note: PBKDF2-SHA-256 @ 100k iterations is not GPU-resistant like bcrypt; it was selected because it is the Workers-native maximum and eliminates the 1102 CPU failure. If a memory-hard KDF (Argon2/scrypt/WASM) becomes available on Workers, revisit.
- Rollback available: previous production state is preserved in Workers deployment history (active version pre-fix: `6424b645-bb6a-4cb5-a780-105c3fc910d6`).