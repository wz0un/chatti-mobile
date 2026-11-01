# CTO-STATUS-SYNC

Phase C. Read `AGENTS.md` and `.mece/WAVE-2.md` first. Start only after QA-WAVE-2 has reported and Staff confirms. You are the CTO agent: documentation sync and review only, no product code. You own `docs/STATUS.md`, `docs/WEB-TASKS.md`, `docs/WEB-ROADMAP.md`, `docs/WEB-PARITY.md` and `.mece/cells/CTO-STATUS-SYNC/REPORT.md`.

## Objective

1. Collect the "STATUS delta" from every REPORT.md of this wave (FE-WEBPUSH-CLICK, BE-AUTH-CLOSE, DEVOPS-DEPLOY-VERIFY, MOBILE-P0-PLAN, QA-WAVE-2) and apply them to the four documents. Change only what the evidence supports.
2. Reconcile known stale entries, checking each one against the repository before you change it:
   - Task 24 (CI pipeline) in `docs/WEB-TASKS.md` says TODO, but `.github/workflows/web.yml` exists (PRs #50 and #53). Mark it implemented, pending QA and CTO sign-off.
   - Task 16 and BUG-05 (deep-linkable routes, refresh shows a blank page): `web/src/app/App.tsx` defines `room/:roomId` and `dm/:conversationId` and the SPA fallback is configured. Verify and update.
   - `docs/STATUS.md` still contains an old "Backend (separate repo, NOT this one)" block that contradicts the monorepo section. Correct or remove it.
   - The branches table in `docs/STATUS.md` (`feature/web-implementation`, descriptions of `dev` and `master`) may be out of date. Verify.
3. Apply the Definition of Done to every status: nothing is DONE without QA and CTO/Staff sign-offs. List each Task and BUG whose sign-off is still missing.
4. In REPORT.md, give the exact list of Trello changes Staff should make (card, current state, correct state, evidence). Known mismatches: cards with "IN PROGRESS" or "BLOCKED" in the title but marked complete (BUG-01, BUG-03, Task 12), and the "M1 + M2 staging QA gate" card marked complete although its description says it is not closed.
5. List the open Staff decisions: the DM history contract, the `STAFF-APPROVAL` for the mobile P0 fixes, and when to promote `dev` to `master` (PR #52 must be included before any backend deploy from `master`).

## Git

Branch `docs/status-sync-wave-2` from `dev`, pull request into `dev`. Never commit to `master`. Do not modify `.mece/WAVE-2.md`.

## Delivery

`REPORT.md` with the changes made, their evidence, the open decisions, the Trello change list, and session id.
