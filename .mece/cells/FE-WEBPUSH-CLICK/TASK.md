# FE-WEBPUSH-CLICK

You own this cell exclusively. Read `AGENTS.md` and `.mece/WAVE-2.md` first. Work only on the web Service Worker and its tests.

## Context

GitHub #45 (bug): the Web Push notification arrives and is shown in Chrome and Firefox, but clicking it does not open `/room/:id` or `/dm/:id`. It blocks the Task 22 sign-off (Trello card "[FE · P1] Task 22 — Fix Web Push notification deep-link (#45)"). The routes `room/:roomId` and `dm/:conversationId` exist in `web/src/app/App.tsx` and the SPA fallback serves them, so the routes are not the cause. Read GitHub #45, `docs/QA-PR27-TASK22.md` section 7.2.1 and `docs/WEB-PUSH.md` sections 3 and 4 before you start.

## Objective

1. Reproduce before fixing. Build a vitest harness that loads the `notificationclick` logic of `web/public/sw.js` with mocked `self.clients`, `self.registration` and `WindowClient`, and reproduce the failure. Cover at least: (a) no app window open; (b) an app window open on another route, both controlled and uncontrolled; (c) an app window already on the target URL, including trailing slash and query differences; (d) `navigate()` rejecting.
2. Find the root cause with evidence. QA's candidates are unconfirmed: `WindowClient.navigate()` throws for uncontrolled clients; the `client.url === target.href` comparison does not match; the browser still runs a previous cached SW version. Do not guess.
3. Fix it in `web/public/sw.js`. For example, after `focus()`, fall back to `clients.openWindow(target.href)` when `navigate()` throws or is unavailable; or post a message to the page and let the SPA route (only then may you add a small listener in `web/src/lib/webPush*.ts`). Keep the payload contract in `shared/notifications/webPush.ts` and `docs/WEB-PUSH.md` unchanged, and keep `notificationUrlFor` in `sw.js` in sync with the shared one.
4. Make sure the new SW replaces the old one in already-subscribed browsers: keep `skipWaiting` and `clients.claim`, and add a version marker that QA can read to confirm which SW is active.
5. Update section 4 of `docs/WEB-PUSH.md` with the final click algorithm.

## Exclusive scope

`web/public/sw.js`, `shared/notifications/**`, `web/src/lib/webPush*.ts`, new test files under `web/src/lib/`, and `docs/WEB-PUSH.md`. Do not touch the mobile app, `backend/`, `web/wrangler.jsonc`, `web/public/_headers`, dependencies, lockfiles, or `docs/STATUS.md`. Do not start Tasks 16 to 19.

## Git

Create `bugfix/webpush-click-deeplink` from `dev` (`git checkout dev && git pull` first). Push the branch and open a pull request into `dev`. Never commit to `master`. Do not deploy. Do not mark #45 or Task 22 as done: they need the QA delivery test in a real browser plus CTO/Staff sign-off.

## Verification and delivery

From `web/`, run the `typecheck`, `lint`, `test` and `build` scripts (CI uses pnpm 11 and Node 22) and confirm that `dist/sw.js` contains the fix and the version marker. Write `.mece/cells/FE-WEBPUSH-CLICK/REPORT.md` with: root cause and evidence, changed paths, command results, the exact manual steps for a real browser (reuse section 7.2 of `docs/QA-PR27-TASK22.md`), residual risks, STATUS delta, pull request link, and session id.
