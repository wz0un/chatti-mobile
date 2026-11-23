# Security Review

Date: 2026-11-23

## Findings

| # | Severity | File | Lines | Vulnerability | Confidence |
|---|----------|------|-------|---------------|------------|
| 1 | 🟠 HIGH | backend/src/index.js | 630 | Account deletion uses a client-supplied user ID and lacks identity or password verification | 10/10 |
| 2 | 🟠 HIGH | backend/src/index.js | 264 | Private/password-protected rooms are not verified before joining or fetching room data | 9/10 |
| 3 | 🟠 HIGH | backend/src/DirectMessage.js | 82 | Direct-message conversations lack participant authorization for HTTP, key exchange, and WebSocket operations | 10/10 |
| 4 | 🟠 HIGH | backend/src/index.js | 830 | Push-token registration and removal use client-provided user and device identities without authentication | 9/10 |

## Recommended remediation

1. Derive the authenticated user from a server-issued session or token on every protected endpoint.
2. Authorize account deletion and device/push-token operations against the authenticated user.
3. Store room authorization as cryptographic or server-side state, and validate access before joining or reading room history.
4. Validate both participants before exposing direct-message metadata, messages, key exchange, or WebSocket access.

## Dependency patch

Integrated Dependabot commit `446770d` on branch `bugfix/security-patches`, updating backend and web dependency manifests and lockfiles.
