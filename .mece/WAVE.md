# M1 Web Stabilization

## Goal

Remove the confirmed web-chat correctness regressions that block the M1 QA gate,
without changing backend contracts or mobile behavior.

## Cells

- `CTO-WEB-STABILITY`: Owns the Direct Message WebSocket lifecycle and the two
  localized web UI correctness fixes. This cell exclusively owns changes for
  this wave.

## Guardrails

- Do not change Cloudflare Worker or mobile application code.
- Preserve existing public API and event contracts.
- Run focused verification before reporting completion.
