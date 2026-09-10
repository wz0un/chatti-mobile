# M1 Read-Only Audit and Publication

## Goal

Run four mutually exclusive reviews of the existing project state. Do not add,
edit, format, generate, or delete product files. The only permitted mutable
Git action is DevOps creating a commit from the already-present working-tree
changes and pushing it to the configured `origin` GitHub remote, after
recording the exact diff and verification status.

## Cells

- `CTO-ARCHITECTURE`: architecture audit only; no commands that mutate files or Git.
- `DEVOPS-CLOUDFLARE-PUBLISH`: inspect Cloudflare deployment readiness and publish
  the existing working-tree changes only; no source edits or deployment.
- `QA-WEB-MOBILE`: perform read-only web and mobile verification; no source edits.
- `BACKEND-PARITY`: audit backend/web/mobile contract parity; no source edits.

## Guardrails

- No new product changes until a later user order.
- No dependency upgrades, lockfile changes, migrations, deployments, secrets,
  or infrastructure changes.
- Do not amend, reset, stash, discard, rebase, force-push, or alter existing commits.
- Reports are the only coordination artifacts each cell may write.
- DevOps may commit and push only the files that were already dirty when the
  wave began: `docs/STATUS.md`, `web/src/app/App.tsx`,
  `web/src/features/rooms/RoomChatPage.tsx`, and
  `web/src/features/rooms/room-chat.css`.

## Publication protocol

1. Capture `git status --short`, `git diff --check`, and a concise diff summary.
2. Run only non-mutating, relevant checks.
3. Commit the existing changes with a descriptive message and push the current
   branch to `origin` without force.
4. If authentication, branch protection, or any other external prerequisite
   blocks the push, do not work around it; record the exact blocker.
