# DEVOPS-STAGING-DEPLOY

Do not begin until Staff explicitly starts Phase C. Own only Cloudflare staging publication of an already-built web/dist. Do not edit sources, dependencies, or Git state.

1. Confirm the working tree is clean and record HEAD. If unrelated files are dirty, stop and report; do not stash or revert.
2. Read web/wrangler.jsonc and docs/CLOUDFLARE-DEPLOYMENT.md.
3. From web/, run npm run build; stop if it fails.
4. Deploy staging only with npx wrangler deploy -c wrangler.jsonc --name chatti-web-staging.

Never deploy chatti-web, touch chatti-workers, create DNS, or use an auth workaround. If Wrangler/OAuth is unavailable, record the precise blocker. Write .mece/cells/DEVOPS-STAGING-DEPLOY/REPORT.md with the built SHA, staging URL, output summary (or literal blocker), and session id.
