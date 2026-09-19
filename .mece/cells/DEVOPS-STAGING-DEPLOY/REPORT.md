# DEVOPS-STAGING-DEPLOY — REPORT

## Status: DEPLOYED (staging)

## Steps completed

1. **Clean tree:** wrangler OAuth session refreshed (logged in as `wz0un.wzn@gmail.com`). Working tree had only the cell REPORT.md dirty.
2. Read `web/wrangler.jsonc` and `docs/CLOUDFLARE-DEPLOYMENT.md`.
3. **Build (PASS):** `npm run build` (tsc -b && vite build) from `web/` — 76 modules, `dist/index.html` + `dist/assets/index-W8mAsD3n.js` (347.17 kB / gzip 107.14 kB) + `dist/assets/index-bIZe5b7q.css` (34.08 kB).
4. **Deploy (PASS):** `npx wrangler deploy -c wrangler.jsonc --name chatti-web-staging` — 3 static assets uploaded, `chatti-web-staging` deployed in 8.29 s.

## Deployed artifact

- Git built from: `c90f130372d88641d7ce0f63b5baed9ecebb953d` (HEAD at build time)
- Staging URL: https://chatti-web-staging.wz0un.workers.dev
- Current Version ID: `b45c53cb-d624-44c1-9408-724907c25362`
- Live check: `/assets/index-W8mAsD3n.js` HTTP 200, `/assets/index-bIZe5b7q.css` HTTP 200. Root returns HTML body with HTTP 404 (SPA routing behavior, matches BUG-05; assets and app render normally).

## Notes

- No source or dependency files were modified. Only this report.
- `chatti-web` (production) was NOT touched.

## Session

- Session id: no OPCODE_SESSION_ID set.