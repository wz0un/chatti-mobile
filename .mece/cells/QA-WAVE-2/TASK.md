# QA-WAVE-2

Phase B. Read `AGENTS.md` and `.mece/WAVE-2.md` first. Start only when Staff tells you that the FE-WEBPUSH-CLICK and BE-AUTH-CLOSE pull requests are merged into `dev`, and gives you the merged SHA. You verify; you do not edit product files or Git state. You may write `.mece/cells/QA-WAVE-2/REPORT.md` and append one new section to `docs/QA-PR27-TASK22.md`.

Definition of Done (AGENTS.md): your result is the QA input to a sign-off. Task 22 and BUG-01 are not DONE without CTO/Staff approval, and automated tests are supporting evidence only.

## 1. Task 22: deep link on click (GitHub #45, Trello "Task 22-QA")

- Review the FE REPORT.md and pull request. From `web/`, run `typecheck`, `lint`, `test` and `build`, and confirm that `dist/sw.js` contains the fix and the version marker.
- Verify the click behaviour as far as the sandbox allows. First, the SW harness cases (no window, another route, same route, uncontrolled client, `navigate()` rejecting) must pass. Second, try delivering a push event to the registered SW in headless Chrome (for example with the DevTools Protocol method `ServiceWorker.deliverPushMessage`) and check that the notification is shown with the correct `data.url`. If the sandbox cannot do this, record NOT RUN with the reason (previously: `push service not available`).
- Prepare the manual real-browser delivery test for Staff (Chrome and Firefox on desktop): the steps of section 7.2 of `docs/QA-PR27-TASK22.md` plus an evidence table (browser and version, date, step, result, screenshot link). Do not mark it as passed: only Staff running it can.
- Confirm in code that the PR #44 fixes still hold: paginated fan-out tests and the "Blocked" badge in en, es, ar and fr.

## 2. BUG-01 source parity (PR #52)

- Run `pnpm test` in `backend/` (25/25 or more) and review the hash, verify and migration code path independently.
- Run a live, non-destructive probe against production using the procedure in `docs/QA-BUG01-RETEST.md`: disposable users only, 20 consecutive register and login requests, zero 503 or 1102. Record how many accounts you created so Staff can purge them.
- Do not claim that a real production hash was checked unless you did it.

## 3. Items from BE-AUTH-CLOSE

- `users/find` versus `users/by-device-id`: re-run the failing scenario from finding 4 of `docs/QA-M2-INTEROP.md` against the fixed code (backend tests or a local worker). Run it live only if Staff has deployed the fix.
- DM history: verify the contract Staff chose, in the web client and, if a session is available, with a real mobile device.

## Delivery

Write the REPORT.md and a new section 8 in `docs/QA-PR27-TASK22.md` with: PASS, FAIL or NOT RUN per item, with evidence, environment and date; new bugs with path and severity; residual risks; STATUS delta; session id. End with one exact verdict line per area:

- Task 22: `Task 22 QA PASS pending manual delivery` or `Task 22 QA BLOCKED`
- BUG-01: `BUG-01 parity QA PASS` or `BUG-01 parity QA FAIL`
