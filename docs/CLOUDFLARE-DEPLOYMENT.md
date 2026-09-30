# Chatti Web — Cloudflare Deployment

Status: **DEPLOYED (staging + production) 2026-08-11** · Owner: DevOps / Cloudflare · Updated: 2026-09-19
Target app: `web/` (Vite + React 19 + TypeScript SPA) of `chatti-mobile`. Backend: `backend/`.

## 0. Monorepo layout

Desde `chore/monorepo-backend` (PR a `dev`, 2026-09-19) el backend de Cloudflare
Workers vive en **`backend/`** del mismo repo (antes: repo independiente
`wz0un/chatti`, carpeta `workers/`). El repo `chatti` queda archivado como
referencia.

| Código | Ruta | Deploy |
|--------|------|--------|
| Frontend (SPA) | `web/` (`web/wrangler.jsonc`) | Workers `chatti-web` (prod) / `chatti-web-staging` |
| Backend (Workers API + DOs) | `backend/` (`backend/wrangler.toml`) | Worker `chatti-workers` (prod); staging pendiente DevOps |
| Contratos compartidos | `shared/` | tips/contratos usados por web, móvil y backend |

CI: `.github/workflows/backend.yml` ejecuta **solo tests** (`backend/**`).
Deploy automático del backend pendiente de que DevOps/Staff configuren los
entornos (DOs de staging, secretos). Referencia: `docs/STATUS.md`, `backend/README.md`.

## 1. Architecture

```
Browser (user)
   │  https://chatti-web.wz0un.workers.dev          (SPA, Workers Static Assets)
   ▼
Cloudflare Worker `chatti-web`  (static assets, SPA fallback)
   │  REST  https://chatti-workers.wz0un.workers.dev/api/*
   │  WS    wss://chatti-workers.wz0un.workers.dev/api/room/{id} | /api/dm/{id}
   ▼
Cloudflare Worker `chatti-workers`  (backend, Durable Objects + KV — UNCHANGED)
```

- **Frontend:** one Worker serving static assets only (no custom fetch handler).
  SPA fallback via `not_found_handling: "single-page-application"`.
- **Backend:** existing `chatti-workers` worker is NOT modified, moved, or proxied.
  The browser talks to it directly (cross-origin, CORS `*` already verified live).
- **WebSocket:** direct `wss://` connection from browser to backend (DOs). No proxy.

## 2. Cloudflare account

- **Name:** wz0un
- **ID:** managed privately outside the repository
- **workers.dev subdomain:** `wz0un` (enabled) → URLs are `{worker}.wz0un.workers.dev`
- **Zone:** `mohsine.com` (active, account zone). No chatti subdomains exist in DNS.
- **Auth:** Cloudflare OAuth/API credentials are managed outside the repository. Scopes include workers/pages
  write and zone **read-only**; DNS record creation is therefore not available with the deployment credential.

## 3. Cloudflare resources

| Resource | Name | Status |
|----------|------|--------|
| Worker (assets) PROD | `chatti-web` | **DEPLOYED 2026-08-11** (was empty Hello-World stub) — live at chatti-web.wz0un.workers.dev |
| Worker (assets) STAGING | `chatti-web-staging` | **DEPLOYED 2026-08-11** — live at chatti-web-staging.wz0un.workers.dev |
| Worker (backend) | `chatti-workers` | PRODUCTION backend — source now at `backend/` (monorepo); no deploy automático aún |
| Worker (legacy) | `chat-ti` | Legacy CRA app (Workers assets) — unrelated, do not touch |
| Worker (legacy) | `ai-chatti-llm` | Old prototype (quick editor) — do not touch |
| Pages projects | `weather-app`, `mohsine`, `ai-chat-assistant`, `wz0un` | Unrelated projects — do not touch |

## 4. Staging vs Production

| | STAGING | PRODUCTION |
|--|---------|------------|
| Worker | `chatti-web-staging` | `chatti-web` |
| URL | `https://chatti-web-staging.wz0un.workers.dev` | `https://chatti-web.wz0un.workers.dev` |
| Backend | same `chatti-workers` (there is no staging backend) | `chatti-workers` |
| Promotion | staging → production = same build, re-deploy to prod worker | — |

## 5. Deployment method

`wrangler deploy` (CLI, OAuth token). Config: `web/wrangler.jsonc`:

```jsonc
{
  "name": "chatti-web",
  "compatibility_date": "2025-09-27",
  "assets": {
    "directory": "./dist",
    "not_found_handling": "single-page-application",
    "binding": "ASSETS"
  },
  "observability": { "enabled": true }
}
```

Commands (run from `web/`):

```bash
npm run build
npx wrangler deploy -c wrangler.jsonc            # production
npx wrangler deploy -c wrangler.jsonc --name chatti-web-staging   # staging
```

## 6. Build

- Command: `npm run build` → `tsc -b && vite build` (strict TS + Vite 7).
- Node: ≥ 20.19 (verified with Node v26).
- Output directory: `web/dist/` → `index.html` + `assets/*.js|css` + `_headers`.
- Source maps: NOT generated in production (Vite default) — good for security.
- No CI/CD yet — manual deploy until validated (see §12).

## 7. Environment variables

**Only one variable, PUBLIC only:**

| Variable | Value | Exposure |
|----------|-------|----------|
| `VITE_API_URL` | `https://chatti-workers.wz0un.workers.dev` (default; build-time inlined) | PUBLIC (browser) |

- `VITE_` prefix = public by design. **No secrets exist or may be added to the web
  app** (no API keys, no tokens, no credentials — auth is deviceId-based, no tokens).
- Staging/production use the same default value; no per-environment secrets.
- Worker secrets (wrangler `secret`) are not needed for the frontend.

## 8. API / WebSocket

- **REST:** `https://chatti-workers.wz0un.workers.dev/api/*` (verified 200 live).
- **WebSocket:** `wss://chatti-workers.wz0un.workers.dev/api/room/{roomId}` and
  `/api/dm/{conversationId}` (verified live: room join returns `user_list`;
  DM join connects; solo-DM no ack is documented backend behavior).
- Browser uses **only https/wss** — `VITE_API_URL` default is https, WS derived
  by `toWsUrl()` (`https→wss`), never `http://`/`ws://` in production.
- CORS: backend returns `Access-Control-Allow-Origin: *` with
  `Content-Type, Authorization, Upgrade` headers — works from any origin.
  (Permissive; see §9 issues.)

## 9. Security

| Item | State |
|------|-------|
| HTTPS/TLS | Cloudflare-managed, automatic (workers.dev). Plain HTTP is served without redirect — mitigated by `upgrade-insecure-requests` in CSP, which forces browsers to https |
| CSP | Added via `web/public/_headers` → `_headers` in dist: `default-src 'self'`, `connect-src 'self' https://chatti-workers.wz0un.workers.dev wss://…`, `frame-ancestors 'none'`, `object-src 'none'`, **`upgrade-insecure-requests`**. `style-src 'unsafe-inline'` required by one inline avatar style |
| Headers | `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `X-Frame-Options: DENY`, `Permissions-Policy` |
| Source maps | Not generated in prod |
| Secrets | None in frontend; no `VITE_` secrets; `.env` files never committed |
| Auth | deviceId-based (no cookies, no tokens) — nothing to leak |
| WebSocket | wss only; server trusts join payload (backend design, unchanged) |
| WAF / rate limiting | Zone-level only (mohsine.com). workers.dev managed by Cloudflare. **None configured for the app** (report only — needs BE/zone work) |
| DNS | No changes required (workers.dev). Custom domain blocked by token scope (zone read-only) |

## 10. DNS / custom domain

- **No DNS changes required** for workers.dev deployment.
- Custom domain (e.g. `chatti.example.com`) — **blocked by current token scope**
  (zone read-only). Requires a token with `zone` write / DNS edit to add a CNAME
  `chatti.example.com → chatti-web.wz0un.workers.dev` (proxied). Deferred.

## 11. Rollback

- Every deploy creates a new version; previous deployment remains live-retrievable.
- Rollback: `npx wrangler rollback <deployment-id>` (or `wrangler rollback` for
  the previous deployment) from `web/`.
- The previous `chatti-web` Hello-World stub: **not recoverable by design**
  (it was never functional) — rollback before first real deploy is N/A.
- Staging has zero blast radius (separate worker).

## 12. Observability

- Workers Observability enabled (`observability.logs` on the worker):
  request logs, invocations, exceptions (persist: true).
- **Limitation (verified):** `wrangler tail` cannot tail assets-only Workers
  (API code 100311 "Cannot tail a Worker which only has assets"). Request logs
  are visible in the dashboard (chatti-web → Logs) only. Application-level
  errors surface in the backend worker (`chatti-workers`), which IS tail-able.
- Dashboard: Cloudflare Dashboard → Workers → `chatti-web` → Logs.
- Backend (`chatti-workers`) observability already enabled (unchanged).

## 13. CI/CD (proposed, NOT implemented)

Manual deployment is validated (2026-08-11). Next step when approved:

- GitHub Actions:
  - `main` → production: build → `wrangler deploy` (worker `chatti-web`)
  - `develop` → staging: build → `wrangler deploy --name chatti-web-staging`
- Credentials: `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` as GitHub
  repo secrets — **never committed** to the repository.
- Tokens: dedicated API token, minimal scopes (workers scripts:write + workers
  routes + account:read for staging/prod workers only).
- Wrangler runs in the pipeline via `npx wrangler@latest deploy -c web/wrangler.jsonc`
  after `npm ci && npm run build` in `web/`.

## 14. Known issues / notes

1. Backend CORS is `*` (permissive). Restricting to `https://chatti-web*.wz0un.workers.dev`
   requires a backend change (`backend/src/index.js`) — reported, not actioned.
2. DM WebSocket does not emit `history` on join (documented in WEB-PARITY.md;
   mobile has the same dead path) — backend finding (`backend/src/DirectMessage.js`), reported to BE.
3. No rate limiting / WAF rules for the API — backend/zone concern, reported.
4. `style-src 'unsafe-inline'` in CSP due to one inline avatar style
   (ConversationListItem.tsx:108) — refactor to a CSS class to tighten later.
5. Custom domain requires a DNS-write token.
6. Plain HTTP is served without redirect on workers.dev (mitigated by
   `upgrade-insecure-requests` in CSP).
7. QA probe scripts fail in this environment (pre-existing, not deployment
   related): `scripts/interop-mobile.test.ts` (react-native Flow syntax —
   needs mobile toolchain) and `scripts/reconnect-probe.test.ts` (DM listener
   survival probe). Unit suite: 83/83 pass.
8. **Backend staging:** no existe DO/KV/env de staging aún. Antes de habilitar
   deploy de `backend/` desde CI, DevOps debe configurar DOs + KV de staging en
   Cloudflare y un `[env.staging]` en `backend/wrangler.toml`. Producción sigue
   manual vía `cd backend && pnpm deploy`.
