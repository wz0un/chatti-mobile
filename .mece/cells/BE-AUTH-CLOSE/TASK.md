# BE-AUTH-CLOSE

You own `backend/` exclusively. Read `AGENTS.md` and `.mece/WAVE-2.md` first. The Worker source now lives in this repository (`backend/`), so the blocker of the retired BE-AUTH-STABILITY cell (no Worker checkout) no longer applies. Do not deploy: only Staff deploys.

## Context

Production `chatti-workers` runs a PBKDF2 fix for BUG-01 that was applied manually through the Cloudflare API (see `.mece/cells/BE-AUTH-STABILITY/REPORT.md`). PR #52 restores it in `backend/src/index.js` on `dev` (see `docs/QA-BUG01-SOURCE-PARITY.md`, backend tests 25/25). Read both documents first.

## Objective, in priority order

1. **BUG-01 source parity, BE confirmation.** Compare the code from PR #52 with the deployed behaviour described in the BE-AUTH-STABILITY report: hash format `pbkdf2$sha256$100000$<salt>$<dk>`, legacy bcrypt verification, and migration on the first successful login across `user:username:*`, `user:id:*` and `user:device:*`. Run `pnpm test` in `backend/` and report the result. Add tests only for gaps you can name, for example a malformed stored hash or two concurrent first logins of a legacy account. Append a "BE confirmation" section to `docs/QA-BUG01-SOURCE-PARITY.md` with the root cause (pure-JS bcrypt CPU use, Workers error 1102, HTTP 503) and with what is still unverified (no real production hash has ever been read).
2. **`users/find` versus `users/by-device-id`.** `docs/QA-M2-INTEROP.md`, finding 4: `GET /api/users/find?username=mohsine#0001` returns a `deviceId` for which `GET /api/users/by-device-id` returns 404, and `POST /api/contacts/request` then fails with "Recipient user not found". Find the root cause in `backend/src/index.js` (QA's hypothesis, unconfirmed: a stale `deviceId` in the user row after a re-login with a new device). Fix it with tests, without changing the request or response shapes that mobile and web use.
3. **DM history contract.** In `backend/src/DirectMessage.js`, `handleWebSocket` sends `history` at connection time from `this.recentMessages` (only when it is not empty), and `handleJoin` sends none, while clients expect it on join. Choose and document: (a) emit `history` after `join`, or (b) keep `pending_messages` only and remove the dead client expectation. Put your recommendation and evidence in REPORT.md. Implement it only if it is backward compatible with the mobile app; Staff decides before merge.

## Exclusive scope

`backend/**` and `docs/QA-BUG01-SOURCE-PARITY.md`. Do not touch `web/`, `shared/`, the mobile app, `wrangler.toml` bindings, secrets or dependencies (`bcryptjs` stays for legacy verification). No JWT, CORS lockdown or other backend-hardening work.

## Git

Branch `bugfix/be-auth-close` from `dev`, one commit per item, one pull request into `dev`. Never commit to `master`. Do not deploy. Nothing is DONE without QA and CTO/Staff sign-offs.

## Delivery

Write `.mece/cells/BE-AUTH-CLOSE/REPORT.md` with: status per item, files changed, test output, risks to mobile compatibility, what QA must verify live, STATUS delta, pull request link, and session id.
