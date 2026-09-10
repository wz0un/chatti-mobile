# DevOps — Cloudflare Readiness and GitHub Publication

Own Cloudflare deployment-readiness inspection and publication of the existing
working-tree change set. Do not change source, configuration, dependencies,
or cloud resources, and do not deploy.

First inspect Cloudflare configuration, deployment scripts, current Git branch,
and the exact dirty diff. Run non-mutating validation appropriate to the
existing project only. Then commit and push exactly these pre-existing dirty
files, if their diff passes checks:

- `docs/STATUS.md`
- `web/src/app/App.tsx`
- `web/src/features/rooms/RoomChatPage.tsx`
- `web/src/features/rooms/room-chat.css`

Use a descriptive conventional commit and normal non-force push to `origin`.
Do not include `.mece` files in the commit. If blocked by credentials,
protection, conflicts, or a failing validation, do not alter/revert anything
or bypass the blocker; report it exactly. Write only this cell's `REPORT.md`
with readiness findings, commands/results, commit SHA and remote branch/URL if
published, or the exact blocker and session id.
