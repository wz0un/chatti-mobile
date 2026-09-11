# Wave: Close M1 web gaps, QA M1/M2, and publish staging

Base: master at a2d5c657c528bf97626bf604b1c0f392d024a178.

## Authoritative state

The Expo mobile app is the source of truth and remains untouched. The web client lives in web/; shared contracts, crypto, auth, API, and WebSocket code lives in shared/. The backend is a separate Cloudflare Worker repository at https://chatti-workers.wz0un.workers.dev.

M1 is nearly complete: auth, shell, conversations, encrypted DMs, contacts and badges are implemented. Profile lacks the language selector and delete-account UI (Task 12). M2 rooms list (Task 13) and room chat (Task 14) are implemented. BUG-02, BUG-04 and BUG-06 are already fixed in the code. App.js, src/, index.js, app.json, and eas.json are mobile and out of scope.

Do not use stale .mece audit artifacts or stale roadmap/task/QA documents as implementation truth. Production chatti-web is stale; only chatti-web-staging is in scope.

External residual issues: auth register/login intermittently returns 503/1102 (BUG-01), and the DM WebSocket does not emit history on join.

## Cells and exclusive ownership

| Cell | Ownership | Phase |
| --- | --- | --- |
| FE-M1-CLOSE | web/src/features/profile/**, ConversationListItem.tsx, ConversationsPage.tsx, and only their existing CSS | A |
| QA-M1-M2 | .mece/cells/QA-M1-M2/REPORT.md only; read-only elsewhere | A, then B delta |
| DEVOPS-STAGING-DEPLOY | Staging deployment of an already-built web/dist; no source edits | C |
| BE-AUTH-STABILITY | Separate Worker repository only | A if checkout is available |

Staff owns this file, all active cell TASK.md files, .mece/SYNTHESIS.md, and the later synchronization of docs/STATUS.md, docs/WEB-TASKS.md, docs/WEB-PARITY.md, and docs/WEB-ROADMAP.md.

## Sequencing

1. Phase A: Dispatch FE-M1-CLOSE and QA-M1-M2 concurrently from this SHA. QA records that Task 12 is absent if it tests before FE is integrated. Dispatch BE-AUTH-STABILITY only after locating the Worker checkout.
2. Phase B: After FE reports complete and Staff independently passes web typecheck, lint and tests, re-dispatch QA for Task 12 and BUG-03 only.
3. Phase C: After QA reports a staging-safe M2 verdict, build and deploy only chatti-web-staging. Never deploy chatti-web.
4. Phase D: Staff repeats verification, runs git diff --check, writes synthesis and synchronizes the four specified documents.

## Guardrails

- No dependency or lockfile changes, migrations, secrets, or infra other than the authorized staging deployment.
- No product mobile edits and no M3/M4 or backend-hardening work.
- Do not amend, reset, stash, discard, rebase, or force-push.
- Cells write only their report plus the source explicitly owned by FE.
- Do not commit inside a cell. Staff may make one conventional commit after independent verification; .mece artifacts need not be included.
- A blocked cell records its blocker and does not take another cell's files.
- The prior audit cells are retired and are not active work.
