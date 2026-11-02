# FE-WEBPUSH-CLICK REPORT

## Root cause & evidence
- `web/public/sw.js` notificationclick: exact `client.url === target.href` comparison failed on trailing slash/query; uncontrolled clients may lack `navigate()` or reject. Fix adds tolerance + fallback to openWindow.

## Changed paths
- web/public/sw.js
- web/src/lib/swNotificationClick.test.ts
- docs/WEB-PUSH.md

## Commands
- typecheck: PASS
- lint: PASS
- test: 116/116 PASS
- build: PASS; dist/sw.js contains sw-2.

## Manual steps
Reuse docs/QA-PR27-TASK22.md §7.2.1 steps 1-5.

## Residual risks
- Real browser QA + CTO sign-off still required. #45 and Task 22 not marked done.

## STATUS delta
- No STATUS.md edits (phase A).

## PR
https://github.com/wz0un/chatti-mobile/pull/57

## Session id
wave2-fe-webpush-click
