# Wave 2: Close Task 22 (Web Push), BUG-01 source parity, and plan mobile P0 hardening

Base: `dev` at e8b72d7a4d7f94f8bdaaad4e0f2b83126f8eee5c (2026-11-01). `master` is at 6221d4c.

Wave 1 (`.mece/WAVE.md`, `.mece/SYNTHESIS.md`) is closed and its cells are retired: do not re-run them. `AGENTS.md` is binding and wins over this file.

## State at the start of the wave (verified against the repo)

- Task 22 Web Push is live in production, but clicking the notification does not navigate to the chat (GitHub #45). `web/public/sw.js` has not changed since 2026-09-19 on either `dev` or `master`.
- BUG-01: production runs a PBKDF2 fix that was applied manually through the Cloudflare API. PR #52 (on `dev` only, not in `master`) restores that fix in `backend/src/index.js` (backend tests 25/25). `master` still contains the bcrypt path.
- M2 live interop (web and a real mobile device) passed on 2026-09-15 (`docs/QA-M2-INTEROP.md`, PR #54 on `dev`). One backend finding is open: `users/find` and `users/by-device-id` disagree, so a contact request fails.
- Web CI exists (`.github/workflows/web.yml`, PRs #50/#53) and backend CI exists (`backend.yml`), but Task 24 in `docs/WEB-TASKS.md` still says TODO.
- Mobile P0 issues #14, #15 and #16 are open. The mobile app is the production source of truth (AGENTS.md, "Alcance de edición").
- The DM WebSocket sends `history` at connection time (before `join`), not on `join`. The contract is unresolved.

## Cells and exclusive ownership

| Cell | Agent | Ownership | Phase |
| --- | --- | --- | --- |
| FE-WEBPUSH-CLICK | FE | `web/public/sw.js`, `shared/notifications/**`, `web/src/lib/webPush*.ts` and new tests under `web/src/lib/`, `docs/WEB-PUSH.md` | A |
| BE-AUTH-CLOSE | BE | `backend/**`, `docs/QA-BUG01-SOURCE-PARITY.md` | A |
| DEVOPS-DEPLOY-VERIFY | DevOps | Read-only; its REPORT.md only | A |
| MOBILE-P0-PLAN | FE (mobile analysis) | Read-only on `src/`; its REPORT.md only | A |
| QA-WAVE-2 | QA | Its REPORT.md and a new section in `docs/QA-PR27-TASK22.md` | B |
| CTO-STATUS-SYNC | CTO | `docs/STATUS.md`, `docs/WEB-TASKS.md`, `docs/WEB-ROADMAP.md`, `docs/WEB-PARITY.md` | C |

In phases A and B, agents do not edit the four status/roadmap documents. Each puts a "STATUS delta" in its REPORT.md and CTO-STATUS-SYNC applies them in phase C.

## Sequencing

1. Phase A (concurrent): FE-WEBPUSH-CLICK, BE-AUTH-CLOSE, DEVOPS-DEPLOY-VERIFY, MOBILE-P0-PLAN.
2. Staff gate: review the FE and BE pull requests and merge them into `dev`.
3. Phase B: QA-WAVE-2 on the merged `dev` SHA that Staff provides.
4. Staff gate: manual delivery test of Task 22 in a real browser, then CTO/Staff sign-off.
5. Phase C: CTO-STATUS-SYNC. Staff opens the `dev` to `master` pull request.

## Guardrails

- No deployments by agents. No secrets, DNS, bindings or Cloudflare configuration changes. DEVOPS-DEPLOY-VERIFY is read-only.
- Do not deploy `backend/` from `master` until PR #52 is promoted there: `master` would bring back bcrypt and BUG-01.
- No dependency or lockfile changes unless a TASK.md says so.
- No edits to the mobile app (`App.js`, `src/`, `index.js`, `app.json`, `eas.json`) without a `STAFF-APPROVAL` line in the cell's TASK.md.
- No M3/M4 work in this wave: Tasks 16 to 19, 21 and 23, dark mode, RTL, and the P1 mobile issues #17 to #20.
- Never commit to `master`; no force pushes; branch from `dev`; conventional commits.
- Nothing is DONE without QA and CTO/Staff sign-offs.
- A blocked cell records its blocker in REPORT.md and does not take another cell's files.
- Every cell writes `REPORT.md`: changed paths, command results with output, residual risks, STATUS delta, session id.
