# M1 Web Stabilization — Synthesis

## Outcome

`CTO-WEB-STABILITY` completed the scoped web stabilization changes.

- Direct-message WebSocket listeners now survive automatic reconnects while an
  explicit `disconnect()` still performs full listener teardown.
- The reconnect-attempt counter is only reset after a successful socket open,
  allowing the maximum-attempt safety limit to be reached.
- The conversations list now persists `lastSeen` for received messages and
  message history.
- The empty-search subtext uses an existing, correctly scoped i18n key.
- Regression coverage verifies listener survival across abnormal reconnects.

## Verification

The Staff Engineer independently ran the following from `web/`:

```text
npm run typecheck  — PASS
npm run lint       — PASS
npm test           — PASS (6 files, 85 tests)
```

`git diff --check` also passed.

## Remaining Risks and Work

- Backend authentication intermittently returns Cloudflare error 1102 / HTTP
  503. This is outside this repository and affects web and mobile clients.
- The web Contacts screen remains a placeholder and is still required for the
  M1 QA gate.
- Historical DevOps, QA, and Backend sessions returned OpenCode server errors
  when resumed; do not assign file changes through them until they respond.
- No commit or remote push was performed.

## Next Suggested Wave

Implement the contacts experience as a single, exclusive web cell, then have
the QA session rerun the M1 gate once its session is available.
