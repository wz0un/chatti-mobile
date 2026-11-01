# DEVOPS-DEPLOY-VERIFY

Read-only verification. Read `AGENTS.md` and `.mece/WAVE-2.md` first. Do not deploy, edit sources, change secrets, DNS or bindings, or touch Git state. You may write only `.mece/cells/DEVOPS-DEPLOY-VERIFY/REPORT.md`.

## Objective

1. **What is live.** For `chatti-workers` and `chatti-web`, record the active version or deployment id, the build SHA and the timestamp (use the Cloudflare MCP tools configured in `.opencode.jsonc`, or `wrangler deployments list`). Compare with `master` (6221d4c) and `dev` (e8b72d7).
2. **PR #44 in production.** Confirm whether the live `chatti-workers` contains the PR #44 change (paginated KV fan-out through `listKeysPaginated` in `backend/src/WebPush.js`) and whether the live web bundle contains the "Blocked" badge string (`profile.webPush.statusBlocked`). Give the evidence (build SHA at or after the merge commit, or a string found in the deployed bundle). If it cannot be proven, write "unverified" and say why.
3. **Backend deploy risk.** `master` still contains the bcrypt login path and the PBKDF2 fix exists only on `dev` (PR #52). Record how `chatti-workers` is deployed today (manual API or wrangler, versus a Workers Builds trigger and on which branch) and whether any trigger could deploy the backend from `master` automatically.
4. **CI.** For `.github/workflows/web.yml` and `.github/workflows/backend.yml`, report the latest run result on `dev` and on `master`.
5. **Proposal only, no action.** What a staging environment for `backend/` (separate Durable Object and KV bindings) would need, written as an open question for Staff.

If Wrangler, OAuth or the Cloudflare MCP is unavailable, record the literal blocker and complete what you can from GitHub and public endpoints (`GET /health`, strings in the deployed bundle).

## Delivery

`REPORT.md` with the findings per item and their evidence, residual risks, STATUS delta, and session id.
