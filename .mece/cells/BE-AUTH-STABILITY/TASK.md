# BE-AUTH-STABILITY

This cell belongs exclusively in the separate Cloudflare Worker repository that serves https://chatti-workers.wz0un.workers.dev; it must not edit chatti-mobile. If the checkout cannot be located on this machine, write .mece/cells/BE-AUTH-STABILITY/REPORT.md in this repository stating that blocker, then stop.

Investigate and resolve two production defects without breaking mobile/web payloads or paths:

1. BUG-01 CRITICAL: POST /api/auth/register and /login intermittently return 503 error code: 1102, likely CPU pressure from bcrypt. Fix, deploy, and prove 20 consecutive register-or-login requests without 503.
2. DM history: the DM WebSocket never emits history on join. Either emit it on join or document the contract as pending_messages only and remove the dead client expectation.

Do not implement JWT, CORS lockdown, or backend-hardening scope. Report root cause, files changed, post-fix evidence, and the history decision.
