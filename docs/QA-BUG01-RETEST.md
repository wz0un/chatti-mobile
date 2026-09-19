# Chatti QA — BUG-01 Re-Test Report

**QA Agent:** Senior QA Engineer
**Date:** 2026-09-15
**Bug:** BUG-01 (CRITICAL) — Backend auth endpoints (register/login) intermittently crash with Cloudflare error 1102 → 503. Root cause suspected on the bcrypt hash path.
**Initial evidence:** `docs/QA-REPORT.md` §8 · reproduced intermittently on 2026-08-11 (final session 0/11 succeeded).

## Scope

Reproduce the original failing procedure against the **production worker** `https://chatti-workers.wz0un.workers.dev`:

1. `POST /api/auth/register` with a valid payload, repeated 10–15 times over a few minutes.
2. `POST /api/auth/login` per account.
3. Assert consistent `200`; any `5xx` / `error code: 1102` fails the probe.

## Method

- New reusable artifact `web/scripts/bug01-probe.test.ts` (config `bug01.vitest.config.ts`).
- Creates throwaway accounts (unique usernames), asserts register → login → `GET /api/dm/conversations` (GET stability documented in the original report), then deletes each account best-effort.
- Latency tracked per attempt (1102 is often preceded by slow responses).
- Run: normal round (12 pairs) + stress mode (3 rounds × 10 pairs, spaced 10 s between rounds — picks up intermittency).

## Evidence

Run 1 — normal (12 pairs): **PASS** · zero failures.

Run 2 — stress (3 × 10 pairs):

| Round | Register | Login | GET convs | Max latency | Avg | p95 | Result |
|---|---|---|---|---|---|---|---|
| 1 | 10/10 (200) | 10/10 (200) | 10/10 (200) | 570 ms | 222 ms | 546 ms | OK |
| 2 | 10/10 (200) | 10/10 (200) | 10/10 (200) | 570 ms | 220 ms | 542 ms | OK |
| 3 | 10/10 (200) | 10/10 (200) | 10/10 (200) | 559 ms | 208 ms | 547 ms | OK |

**Total: 90/90 attempts returned 200. Zero 503 / zero error code 1102.**
Durable JSON report: `/tmp/chatti-qa/bug01-2026-09-15T13-46-07-065Z.json`

## Verdict

**BUG-01 NOT REPRODUCED.** Backend auth stable across the exact failure mode documented in the original report, plus trailing smoke re-runs (2 × 4/4 on 2026-09-15). Behavior consistent with the backend-side 1102 fix having taken effect; note this is black-box QA evidence, not a backend root-cause confirmation (repo is separate).

## QA recommendation

1. Re-open the **M1 auth QA gate** (currently `⚠️ BLOCKED`) — no remaining FE-side blocker for auth. Staff to confirm before formal release.
2. Keep `qa:bug01` / `qa:bug01:stress` in the regression suite to catch recurrence (Task 20).
3. Route to the Backend Agent so the 1102 fix + root cause can be formally confirmed/documented BE-side.

## Re-run instructions

```bash
cd web
npm run qa:bug01          # 1 round × 12 pairs (fast)
npm run qa:bug01:stress   # 3 rounds spaced, catches intermittency
```

## Regressions

- `npm run qa:regression` (92 tests) unchanged/green — the probe runs under its own dedicated config only.
- No mobile source (`App.js`, `src/`, `index.js`, `app.json`, `eas.json`) touched.