# DEVOPS-DEPLOY-VERIFY — REPORT

**Cell:** DEVOPS-DEPLOY-VERIFY (Wave 2, Phase A) · **Mode:** READ-ONLY (no deploy, no source edits, no secrets, no DNS, no bindings, no Git state changes)
**Agent run:** T3 Code / OpenCode harness, model `opencode/big-pickle` · **Verification date:** 2026-11-02 (UTC)
**Worktree:** `/tmp/opencode/wave2-devops` detached at `origin/dev` = `2a331a760f30bb462e24312584df3103cad7358b` (clean, no commits made)
**Session id:** no `OPCODE_SESSION_ID` / `OPENCODE_SESSION_ID` env var is set in this run (same as previous cells). Run identifier = worktree HEAD `2a331a7` + timestamp `2026-11-02T12:01Z`.

---

## 0. Inputs, and two documentation discrepancies

- `AGENTS.md` read in full.
- `.mece/WAVE-2.md` exists **only on `dev`** (it is not in `master`). Read from the worktree: base `dev` @ `e8b72d7`, `master` @ `6221d4c`.
- `.mece/cells/DEVOPS-DEPLOY-VERIFY/TASK.md` exists **only on `dev`** (added by PR #55, `32f05da`). Read from the worktree.
- **Discrepancy 1:** TASK.md cites `dev` at `e8b72d7`. The real `origin/dev` at the start of this run is `2a331a76` (2 extra commits: `32f05da` docs/mece + merge PR #55). All findings below use the real `origin/dev` = `2a331a7`.
- **Discrepancy 2:** TASK.md cites `master` at `6221d4c` — **this is still the real `origin/master`**, verified.

| Ref | SHA at verification time | Date | Subject |
|---|---|---|---|
| `origin/master` | `6221d4c2cedc7c3ad28629d4da2747cd79ccc46e` | 2026-11-01 19:49:22Z | Merge PR #53 (chore/ci-web-master) |
| `origin/dev` | `2a331a760f30bb462e24312584df3103cad7358b` | 2026-11-01 21:36:42Z | Merge PR #55 (docs/agent-tasks-wave-2) |
| PR #44 merge | `aeab7087973bf82f2a170ebd44aa3470d14e4bdd` | 2026-09-21T10:29:09Z | into `dev`; **is ancestor of both `master` and `dev`** |
| PR #52 merge | `2d3a9e510369449757e31fc24173cf5f4bcb64a0` | 2026-11-01T19:49:03Z | into `dev`; **NOT ancestor of `master`** |

---

## 1. Access / blockers (literal)

Cloudflare-side introspection was **not available** in this session. Literal evidence:

1. **Cloudflare MCP not connected.** `.opencode.jsonc` declares `cloudflare`, `cloudflare-docs`, `cloudflare-builds`, `cloudflare-observability` (all `"type": "remote"`). Calling the MCP resource tool returns:
   ```
   Error: MCP server not found: cloudflare
   ```
   and `list_mcp_resources({})` returns `{"resources": [], "templates": []}`.
2. **Wrangler unauthenticated.** Local wrangler 4.73.0 (npx cache) runs, but:
   ```
   $ wrangler whoami
   ✘ Failed to fetch auth token: 400 Bad Request
   ✘ Not logged in.
   ```
   Cause: `~/.config/.wrangler/config/default.toml` holds an OAuth token with `expiration_time = "2026-03-10T16:59:42.468Z"`; the refresh token is rejected (400). I did **not** re-authenticate (would be a credential/state change outside a read-only cell).
3. **No API token in the environment.** No `CLOUDFLARE_API_TOKEN` / `CF_*` variables are set.
4. Consequence: `wrangler deployments list`, `wrangler versions view`, deployed script content fetch, KV inspection and dashboard reads are **all impossible**. Any statement about the *currently active* version/deployment id is therefore inferred from GitHub + public endpoints, and marked as such.

What **was** usable as evidence: GitHub (PRs, check runs, Actions), the `Workers Builds` check runs that Cloudflare posts back to each commit (they carry Build ID + Version ID + timestamps), and the public production/staging endpoints (`GET /health`, HTML, deployed JS bundles, `sw.js`).

---

## 2. Item 1 — What is live

### 2.1 `chatti-web` (production, static assets)

| Field | Value | Confidence |
|---|---|---|
| Worker | `chatti-web` → https://chatti-web.wz0un.workers.dev | — |
| Deployment / Version ID | `b11c1eca-3533-4278-806a-14ed50bb6510` | **High** (artifact match, see 2.3) |
| Workers Build ID | `570fb386-076c-409c-be2a-d0818c0ae7cb` | High |
| Build SHA | `master` `6221d4c2cedc7c3ad28629d4da2747cd79ccc46e` | High |
| Timestamp | `2026-11-01T19:50:56Z` (build start/end) | High |
| Trigger | Workers Builds — push to `master` (`/production/builds/…`, **no** `Preview URL` in the check-run summary) | High |

Live artifact fingerprints (fetched 2026-11-02 11:56–12:01Z):

- `GET /` → HTTP 200, `etag: "9dae0fbd76422cda6c3c49a2ebffe23e"`, entrypoint `/assets/index-_VDfNBTW.js`.
- `GET /assets/index-_VDfNBTW.js` → HTTP 200, **354,420 bytes**, `sha256 6ead35c848e8ddc9bb8a826de1a765d924e7111679912880e949d8d42f138628`.
- `GET /sw.js` → HTTP 200, 3,701 bytes, `sha256 69205334158f0cbb8b9d8fb5a7a7631e472d2c0c775a123772c1ffc218b207bc` — **byte-identical to `git show origin/master:web/public/sw.js` and `origin/dev:web/public/sw.js`**.

### 2.2 `chatti-workers` (production, API + Durable Objects)

| Field | Value | Confidence |
|---|---|---|
| Worker | `chatti-workers` → https://chatti-workers.wz0un.workers.dev | — |
| **Active version / deployment id** | **UNVERIFIED** (no Cloudflare access). Two candidate versions exist, both built from this repo: | — |
| Candidate A (production branch = `master`) | Version `cf610c96-e714-4b75-8422-2ec524ea5537`, Build `ebf709f0-1f8d-4879-af4f-6994e291de0a`, SHA `master 6221d4c2`, `2026-11-01T19:50:25Z` | **Most likely** |
| Candidate B (if `dev` were the production branch) | Version `bf072200-2c60-442b-b49d-3df87e76d3be`, Build `9c415831-b761-4929-8d09-835cf05cbe97`, SHA `dev 2a331a76`, `2026-11-01T21:37:12Z` | Low |
| Runtime signal | `GET /health` → `{"status":"ok","timestamp":1793620919906,"version":"2.2.0"}` | — |

`version: 2.2.0` is **not discriminative**: `backend/src/index.js:39` (`master`) and `backend/src/index.js:124` (`dev`) both hardcode `'2.2.0'`. It only proves the worker answers.

Why Candidate A is the likely one: see §4 (Workers Builds deploys `master` pushes to production for `chatti-web`; the same project pattern and `docs/STATUS.md` describe `master` as the production branch). Because non-asset Workers get no `Preview URL` in the check-run summary, branch-based routing for `chatti-workers` cannot be proven from GitHub alone — **it must be confirmed in the Cloudflare dashboard**.

### 2.3 Proof that the `chatti-web` production deploy happened after PR #51 (i.e. Workers Builds `master` → production IS active)

This is the strongest piece of evidence collected, and it also proves deploys are automatic:

- `shared/i18n/translations.ts` containing `statusBlocked` **does not exist** in `master` before the sync: `git show 15d5172:shared/i18n/translations.ts | grep -c statusBlocked` → **0**; `a6381f9` (last known prod web deploy, 2026-09-20) → **0**. It appears in `master` only with `1ceb977` (merge of **PR #51**, `2026-11-01T19:36:48Z`) → **4**.
- The **live production bundle** (`/assets/index-_VDfNBTW.js`) contains `statusBlocked:"Blocked"` **and** the `profile.webPush.statusBlocked` key.
- The last three `Workers Builds: chatti-web` builds on `master` are `1ceb977` (`19:39:40Z`), `0135d11` (`19:44:11Z`), `6221d4c` (`19:50:56Z`). No manual web deploy exists in the record.
- ⇒ production `chatti-web` was re-deployed by Workers Builds from `master` **after 2026-11-01T19:36:48Z**. `chatti-web` production version = `b11c1eca…` (last build), and the deployed content matches the current `master`/`dev` web source exactly.

Additional check: the `dev`-branch build (version `81ede70c…`, preview alias `https://dev-chatti-web.wz0un.workers.dev`) serves the **same** entrypoint asset `index-_VDfNBTW.js` — consistent with `git diff origin/master..origin/dev` showing **zero** changes under `web/src/`, `web/public/` and `shared/` (the only web changes on `dev` are `web/package.json` QA scripts plus `web/scripts/*` tests, which do not affect the bundle).

### 2.4 Staging (`chatti-web-staging`) — stale, relevant because AGENTS.md offers it as the QA target

- `GET /` → `etag "9b5d8c2fc36284b5fb20f46f83345767"`, entrypoint `/assets/index-W8mAsD3n.js`, 347,170 bytes, `sha256 85b44f00a3b5937b81bdd102d3adde7c1fb70da513d683b0d40464413bbd332d`.
- `grep -c webPush` on the staging bundle → **0** (production bundle: many). The staging app **predates Task 22 entirely**, let alone PR #44.
- `GET /sw.js` → 543 bytes = the SPA `index.html` fallback (no service worker).
- This matches `.mece/cells/DEVOPS-STAGING-DEPLOY/REPORT.md`: built from `c90f130…` (2026-09-14), deployed 2026-09-14.
- Staging build SHA: `c90f130372d88641d7ce0f63b5baed9ecebb953d` (2026-09-14 23:40 +0200). No `Workers Builds: chatti-web-staging` check runs exist → staging is deployed manually only.
- ⇒ **`chatti-web-staging` is ~7 weeks behind and must not be promoted "as-is"** (it would regress Task 22 + PR #44).

---

## 3. Item 2 — Is PR #44 in production?

PR #44 (`fix(webpush): paginate KV fan-out + blocked badge label`, merged `2026-09-21T10:29:09Z`, merge `aeab708`) changed 9 files, of which two are the runtime ones: `backend/src/WebPush.js` (+20/-4, adds `listKeysPaginated`) and `backend/src/ChatRoom.js` (+7/-3), plus `web/src/features/profile/ProfilePage.tsx` and `shared/i18n/translations.ts`. `aeab708` **is an ancestor of both `master` and `dev`**.

### 3.1 Web badge `profile.webPush.statusBlocked` — **VERIFIED LIVE**

Evidence from the production bundle `https://chatti-web.wz0un.workers.dev/assets/index-_VDfNBTW.js`:

```
o(g==="on"?"profile.webPush.statusEnabled":g==="blocked"?"profile.webPush.statusBlocked":"profile.webPush.statusDisabled")
...statusEnabled:"On",statusDisabled:"Off",statusBlocked:"Blocked",...
...statusBlocked:"Bloqueadas"...   (es)
...statusBlocked:"محظورة"...        (ar)
...statusBlocked:"Bloquées"...      (fr)
```
The `g==="blocked" → statusBlocked` branch is the exact PR #44 fix (`ProfilePage.tsx:189-193` on `master`/`dev`). Staging bundle: 0 occurrences (not live there).

### 3.2 Backend `listKeysPaginated` fan-out — **UNVERIFIED (direct), LIKELY LIVE BY INFERENCE**

- Not directly verifiable: fan-out pagination has **no HTTP-observable surface** (it runs when a Web Push is sent to >1,000 `user:` keys); the deployed script content, version list and KV cannot be read without Cloudflare auth (blocker §1); a behavioural probe would require either >1,000 subscribed users or creating accounts/triggering pushes, i.e. state changes that a read-only cell must not perform.
- Source-level facts that make "likely live" the correct hedge:
  - `master` (`6221d4c`) **does contain** the change: `backend/src/WebPush.js:407 export const listKeysPaginated`, and `backend/src/ChatRoom.js:491 await listKeysPaginated(this.env, 'user:')`.
  - If Candidate A in §2.2 is the active version (`master 6221d4c` via Workers Builds, `19:50:25Z`), the live worker includes PR #44 — **but it also includes the bcrypt auth path** (see §4).
- Verdict: **unverified** for the live worker. What would settle it: dashboard → `chatti-workers` → active version, or `wrangler deployments list && wrangler versions view <id>` with a valid token.

**Net:** PR #44 is proven live on the web side and plausibly live on the backend side, locked together with the BUG-01 regression described next.

---

## 4. Item 3 — Backend deploy risk (CRITICAL FINDING)

### 4.1 How `chatti-workers` is deployed today

**Workers Builds (Cloudflare git integration) is connected to `github.com/wz0un/chatti-mobile` and builds `chatti-workers` on every push, including docs-only pushes.** Evidence: every commit in the last ~20 on `master` (and on `dev`) carries a `Workers Builds: chatti-workers` check run with a Build ID and Version ID, e.g.:

| Commit | Branch | Build started (UTC) | Version ID |
|---|---|---|---|
| `6221d4c` | master | 2026-11-01T19:50:25Z | `cf610c96-e714-4b75-8422-2ec524ea5537` |
| `0135d11` | master | 2026-11-01T19:43:44Z | `070395d5-4863-4e96-adc7-15da67fc6957` |
| `1ceb977` | master | 2026-11-01T19:39:08Z | `dc5c2e3e-3883-463f-ba27-a67d45dffab7` |
| `a5fb4b6` | master | 2026-11-01T19:19:40Z | `4cbb9d74-d1d0-4b78-a9a2-5570d739bc89` |
| `a6381f9` | master | 2026-09-20T17:12:51Z | `1e93cd9e-1444-4347-b3f5-19ab4f7c7d86` |
| `aeab708` (PR #44) | dev | 2026-09-21T10:29:38Z | `da71fdbd-48f2-489d-970b-8b3a1271f76b` |
| `2a331a7` (dev HEAD) | dev | 2026-11-01T21:37:12Z | `bf072200-2c60-442b-b49d-3df87e76d3be` |

Build page URL scheme: `https://dash.cloudflare.com/513628580fa6f627f416bca847d189bb/workers/services/view/chatti-workers/production/builds/<build-id>` — Cloudflare itself labels these **production** builds.

`chatti-web` evidence proves branch-based routing works in this project: `master` builds have **no** `Preview URL`, non-`master` builds do (`dev-chatti-web.wz0un.workers.dev`, `chore-ci-web-master-chatti-web.wz0un.workers.dev`). Plus `docs/STATUS.md:77-82` records `Build de producción 51b03b57 SUCCESS sobre master f7c896f (npx wrangler deploy)`, and `docs/QA-PR27-TASK22.md` §4/§7 records that the backend endpoint `/api/auth/webpush` only went live **after** the Task 22 code reached `master` (PR #27, `a6381f9`). That is direct historical proof that a `master` build changes the production backend.

Also documented (and used in Wave 1, both ephemeral by nature):
- Manual `PUT /accounts/{acct}/workers/scripts/chatti-workers` (Cloudflare API) — `.mece/cells/BE-AUTH-STABILITY/REPORT.md` (2026-09-15), content `sha256 f4244148…`, pre-fix active version `6424b645-…`.
- Manual `wrangler deploy` for the static web workers (`.mece/cells/DEVOPS-STAGING-DEPLOY/REPORT.md`).

**GitHub Actions does NOT deploy.** `.github/workflows/backend.yml` has only a `test` job; the deploy block is commented out ("pendiente DevOps config"). No other workflow exists.

### 4.2 Can something deploy the backend from `master` automatically? **Yes.**

- Any push to `master` triggers a `Workers Builds: chatti-workers` production build that deploys `master`'s `backend/` tree.
- `master` **still has the bcrypt path**: `backend/src/index.js` → `bcrypt.hash(password, 10)` in `registerUser`, `bcrypt.compare(...)` in `loginUser`. PR #52 (`2d3a9e5`, PBKDF2 + legacy fallback) merged to `dev` at `2026-11-01T19:49:03Z` and is **not** in `master`.
- Timeline of the regression:
  1. 2026-09-15 — manual PBKDF2 hotfix deployed via API; QA measured 90/90 auth OK (`docs/QA-BUG01-RETEST.md`).
  2. 2026-09-20T17:12:51Z — `master` push `a6381f9` (PR #27) → Workers Builds deploy of `chatti-workers` (version `1e93cd9e…`) → **bcrypt path restored**, hotfix overwritten.
  3. 2026-11-01T19:50:25Z — `master` push `6221d4c` (PR #53, CI-only) → Workers Builds deploy (version `cf610c96…`) → **bcrypt again**.
  4. PR #51 (`dev`→`master` sync, merged `19:36:48Z`) missed PR #52 because #52 merged to `dev` at `19:49:03Z`, thirteen minutes later. Classic race.
- Consequence: the WAVE-2 premise "production runs a PBKDF2 fix applied manually through the Cloudflare API" is **at best stale since 2026-09-20**, and almost certainly false since `2026-11-01T19:50:25Z`. BUG-01 (503 / `error code: 1102`) is a **live regression risk right now**. The only unverified link is the dashboard's "production branch" setting for `chatti-workers`.
- Secondary risk: `dev` pushes also build `chatti-workers` (versions `da71fdbd…`, `bf072200…`, …). If that project's preview/non-production handling differs from `chatti-web`'s, `dev` builds may be creating versions bound to the **same** `ROOMS_KV` / Durable Object namespaces. Even if they are not routed to production traffic, that must be confirmed in the dashboard.

### 4.3 What Staff should do (proposal, not executed)

1. Open Cloudflare → `chatti-workers` → Deployment history and record the **active version id + deploy timestamp** (settles §2.2 and §3.2).
2. Confirm the Workers Builds production branch for `chatti-workers` and whether non-production branches deploy only preview versions.
3. Promote PR #52 to `master` **through a reviewed PR that is pushed all at once**, and treat any `master` push before that as a BUG-01 deploy.
4. Decide whether backend deploys should be gated (Workers Builds build/deploy command that runs `pnpm test` first, or move to an explicit workflow with manual approval).

---

## 5. Item 4 — CI results

| Workflow | Branch | Commit | Result | Run |
|---|---|---|---|---|
| `web.yml` (typecheck, lint, tests, build) | `dev` | `e8b72d7a` | ✅ success | https://github.com/wz0un/chatti-mobile/actions/runs/41343688274 |
| `web.yml` | `master` | `6221d4c2` | ✅ success | https://github.com/wz0un/chatti-mobile/actions/runs/41343674750 |
| `backend.yml` (backend tests) | `dev` | `2d3a9e51` (PR #52 merge) | ✅ success | https://github.com/wz0un/chatti-mobile/actions/runs/41343646925 |
| `backend.yml` | `master` | `1ceb9771` (PR #51 merge) | ✅ success | https://github.com/wz0un/chatti-mobile/actions/runs/41342618385 |

Notes:
- `backend.yml` has a `paths: backend/**` filter, so `dev` HEAD `2a331a7` (docs/mece only) and `master` HEAD `6221d4c` (CI/web only) **do not have a backend.yml run for their tip commit**. The last real backend run on each branch is the one listed.
- The `Workers Builds: …` checks are **not** part of `web.yml`/`backend.yml`; they are Cloudflare checks (green on every commit inspected).
- Latest non-CI noise: dependabot run `39769853899` failed on 2026-10-22 (`dependabot/npm_and_yarn/...`). Not gating `dev`/`master`.
- Green CI says nothing about production correctness: both `master` and `dev` are green while `master` ships bcrypt.

---

## 6. Item 5 — What a `backend/` staging environment would need (proposal only, open questions for Staff)

Nothing was created or changed. This is a design sketch for Staff to approve.

### 6.1 Minimum resources (all infra = Staff only, per AGENTS.md)

1. **New Worker service** `chatti-workers-staging` (or `[env.staging]` in `backend/wrangler.toml` → name `chatti-workers-staging`), `workers_dev = true` so it gets `chatti-workers-staging.wz0un.workers.dev`.
2. **Separate KV namespace** for `ROOMS_KV` (new namespace id). Reusing the production namespace would let staging QA write/delete real users, contacts and web-push subscriptions.
3. **Separate Durable Object namespaces.** With `wrangler.toml` envs, repeat the `CHAT_ROOMS` / `DIRECT_MESSAGE` bindings plus the `v1`/`v2` migrations (`new_sqlite_classes`) inside the staging env; each class gets its own storage when the script name differs. Risk to check: DO migration tags/class names are per-service, so re-using `ChatRoom`/`DirectMessage` is fine as long as the service name differs.
4. **Separate secrets**: `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` via `wrangler secret put --env staging`. Either a dedicated staging keypair (safer; push subscriptions are endpoint-bound per key) or a deliberate decision to reuse the prod pair.
5. **`ENVIRONMENT = "staging"`** in `[env.staging.vars]` (currently hardcoded `production`), plus a distinct `version` string in `/health` so staging is distinguishable from prod in one request.
6. **Routing**: either keep `chatti-web-staging` pointed at the **staging** backend (requires building web with `VITE_API_URL=https://chatti-workers-staging…` and updating the `_headers` CSP `connect-src`), or accept that staging web writes to the production backend (today's situation — a QA data-pollution risk).
7. **Deploy pipeline**: Workers Builds cannot deploy two services from one repo with per-branch mapping without a second Workers Builds project; the alternatives are (a) second Builds project bound to `dev` deploying `chatti-workers-staging`, or (b) a GitHub Actions job on `dev` running `wrangler deploy --env staging` with an account-scoped token stored as a repo secret (Staff-managed). Both need a smoke test (`GET /health`, register/login round-trip, WS echo) before "success".
8. **Data hygiene**: staging KV will accumulate QA accounts; needs a purge routine or TTL policy.
9. **Observability**: `observability.enabled` + logs like `web/wrangler.jsonc`, separate from prod so 1102/503 noise is attributable.

### 6.2 Open questions for Staff (no action taken)

- Who owns/provisions the staging KV namespace and DO storage (AGENTS.md reserves infra to Staff)?
- Do we want a second Workers Builds project for `dev`, or an explicit `wrangler deploy --env staging` job with approval?
- Separate VAPID keypair per environment, or shared?
- Should `chatti-web-staging` be re-pointed to a staging API (needs a rebuild + CSP change), or stay on production API?
- Budget/quota impact of a second worker + KV + DO storage.
- Is a backend staging environment a prerequisite for promoting PR #52 to `master`, or do we promote first (BUG-01 is live-risk) and build staging after?

---

## 7. Residual risks (ordered)

1. **CRITICAL — BUG-01 regression in production.** Workers Builds deploys `chatti-workers` from `master`, which still uses bcrypt. Last deploy `2026-11-01T19:50:25Z` (version `cf610c96…`). Active version unconfirmed only because Cloudflare access is unavailable.
2. **HIGH — manual hotfixes to `chatti-workers` are ephemeral.** Any `master` push (even docs/CI) redeploys over an API/`wrangler` hotfix. The Sep-15 PBKDF2 fix survived at most until Sep-20.
3. **HIGH — staging web is not a valid pre-production snapshot.** `chatti-web-staging` is a 2026-09-14 build with **no** Task 22 and **no** PR #44; promoting it would regress production. It also talks to the production backend.
4. **MEDIUM — PR #44 backend cannot be proven live** read-only; it is entangled with risk #1 (same deploy).
5. **MEDIUM — `dev` builds of `chatti-workers` exist** (`bf072200…` at `2026-11-01T21:37:12Z`). If the project's preview handling is misconfigured, dev code can reach the production service/bindings. Verify in dashboard.
6. **MEDIUM — `master` is missing PR #52**; the `dev`→`master` PR must not be preceded by any other `master` push that would deploy bcrypt again.
7. **LOW — docs are wrong about the pipeline**: `docs/CLOUDFLARE-DEPLOYMENT.md` §0/§12 and `docs/STATUS.md` "Backend deploy automático: pendiente" describe a world without Workers Builds on `chatti-workers`. STATUS delta below.
8. **LOW — no deploy gate**: `backend.yml` runs tests but is not wired to the deploy, and Workers Builds runs even for docs-only commits.

---

## 8. STATUS delta (for CTO-STATUS-SYNC, phase C — NOT applied here)

Proposed additions/corrections (do not mark any task DONE; QA + CTO/Staff sign-off still pending):

**`docs/STATUS.md`**
- Replace "Backend deploy automático: pendiente de DevOps/Staff — …" with:
  > **Backend deploy automático: ACTIVO vía Cloudflare Workers Builds** (proyecto conectado a `wz0un/chatti-mobile`). Cada push a `master` construye y despliega `chatti-workers` (último: `6221d4c`, build `ebf709f0…`, versión `cf610c96…`, `2026-11-01T19:50:25Z`). GitHub Actions (`backend.yml`) solo ejecuta tests; el job de deploy sigue comentado. Los parches manuales al Worker (p. ej. el hotfix PBKDF2 del 2026-09-15) son efímeros y quedan sobrescritos por el siguiente build de `master`.
- BUG-01 line: add
  > ⚠️ **Riesgo de regresión LIVE:** el deploy de `master` del `2026-11-01T19:50:25Z` (y el del `2026-09-20T17:12:51Z`) reconstruye el Worker desde un `master` que aún usa bcrypt; el fix PBKDF2 (PR #52) sigue solo en `dev`. Versión activa sin confirmar por falta de acceso a Cloudflare (ver `.mece/cells/DEVOPS-DEPLOY-VERIFY/REPORT.md`).
- Deployment section: add `chatti-web` production version `b11c1eca…` built from `master 6221d4c` at `2026-11-01T19:50:56Z`; note `chatti-web-staging` remains a 2026-09-14 build (`c90f130`) without Task 22 / PR #44.
- CI: `web.yml` and `backend.yml` green on both `dev` (`e8b72d7` / `2d3a9e5`) and `master` (`6221d4c` / `1ceb977`).

**`docs/CLOUDFLARE-DEPLOYMENT.md`**
- §0 and §12: remove the "deploy automático del backend pendiente" claim; state Workers Builds is connected for `chatti-workers` with `master` as the production branch (pending dashboard confirmation of the branch mapping).
- §4 staging table: mark backend staging as **still nonexistent** (`chatti-workers-staging` → 404 today) and flag that `chatti-web-staging` points at the **production** backend.

**`docs/QA-PR27-TASK22.md`**
- Record PR #44 outcome as: badge string verified in the live production bundle; backend fan-out **unverified** (read-only cell, no Cloudflare access).

---

## 9. Evidence appendix (reproducible, read-only)

```text
# SHAs
git -C /tmp/opencode/wave2-devops rev-parse HEAD          -> 2a331a760f30bb462e24312584df3103cad7358b (origin/dev)
gh api repos/wz0un/chatti-mobile/branches/master --jq .commit.sha -> 6221d4c2cedc7c3ad28629d4da2747cd79ccc46e
git merge-base --is-ancestor aeab708… origin/master       -> true   (PR #44 in master)
git merge-base --is-ancestor 2d3a9e5… origin/master       -> false  (PR #52 NOT in master)

# Workers Builds (Cloudflare) — check runs per commit
gh api "repos/wz0un/chatti-mobile/commits/<sha>/check-runs"
  6221d4c2: chatti-web  Build 570fb386-076c-409c-be2a-d0818c0ae7cb  Version b11c1eca-3533-4278-806a-14ed50bb6510  2026-11-01T19:50:56Z
            chatti-workers Build ebf709f0-1f8d-4879-af4f-6994e291de0a Version cf610c96-e714-4b75-8422-2ec524ea5537 2026-11-01T19:50:25Z
  2a331a760: chatti-web  Version 81ede70c-abc7-4dab-af0d-1248b8a924b3 + Preview https://dev-chatti-web.wz0un.workers.dev
             chatti-workers Version bf072200-2c60-442b-b49d-3df87e76d3be  2026-11-01T21:37:12Z

# Production endpoints
curl https://chatti-workers.wz0un.workers.dev/health
  -> {"status":"ok","timestamp":1793620919906,"version":"2.2.0"}  (HTTP 200)
curl https://chatti-web.wz0un.workers.dev/
  -> 200, etag "9dae0fbd76422cda6c3c49a2ebffe23e", /assets/index-_VDfNBTW.js
curl https://chatti-web.wz0un.workers.dev/assets/index-_VDfNBTW.js
  -> 200, 354420 B, sha256 6ead35c848e8ddc9bb8a826de1a765d924e7111679912880e949d8d42f138628
grep statusBlocked  -> g==="blocked"?"profile.webPush.statusBlocked"  +  statusBlocked:"Blocked"
curl https://chatti-web.wz0un.workers.dev/sw.js | sha256sum
  -> 69205334158f0cbb8b9d8fb5a7a7631e472d2c0c775a123772c1ffc218b207bc  (== git master web/public/sw.js)
curl https://chatti-web-staging.wz0un.workers.dev/assets/index-W8mAsD3n.js
  -> 200, 347170 B, sha256 85b44f00a3b5937b81bdd102d3adde7c1fb70da513d683b0d40464413bbd332d, grep webPush -> 0
curl https://chatti-web-staging.wz0un.workers.dev/sw.js -> 543 B (SPA fallback, no SW)
curl https://dev-chatti-workers.wz0un.workers.dev/health -> 404 (no staging backend)
curl https://chatti-workers-staging.wz0un.workers.dev/health -> 404 (service does not exist)

# Access blockers (literal)
wrangler whoami -> "Failed to fetch auth token: 400 Bad Request" / "Not logged in."  (OAuth token expired 2026-03-10)
MCP list_mcp_resources({server:"cloudflare"}) -> "Error: MCP server not found: cloudflare"
env | grep -i cloudflare -> (empty)
```

**No deploy, no source edit, no secret, DNS, binding, commit, push or merge was performed. Only this file was written.**
