# Chatti Mobile — Current Status

Updated: 2026-11-22 (Wave 2 deployed and verified in production: PR #62 → master c5610c9; BUG-01 post-deploy PASS; sw-2 live; Task 22 awaits manual test. Mobile P0 #16: QA ordinal 7 remains historical PASS only for exact source/diff/APK; QA ordinal 11 retest BLOCKED. Independent CTO re-review of PR #68 head 4ccc7cd returned REQUEST_CHANGES for stale provenance and missing QA ordinal 15 trace; the corrected copies (head 6bd7113) were then reviewed and returned REQUEST_CHANGES because the Cloudflare build records still named the 4ccc7cd builds. This snapshot reconciles the bot-reported builds per documentation head and awaits a new review. Cloudflare bot reports production builds for each docs head; no independent runtime check. #66 merged into dev at 5a0e1ae; #67 closed superseded; #68 open. #16 OPEN / IN PROGRESS, no DONE or master promotion.

## Repository

`chatti-mobile` — Expo SDK 54, React Native 0.81.5, React 19.1.0

## Backend (integrated in this repo)

**Monorepo:** el backend de Cloudflare Workers se migró del repo independiente
`wz0un/chatti` (workers/) a `chatti-mobile/backend/` — chore/monorepo-backend.
El repo `chatti` queda como referencia/archivado (solo `master`, 1 commit;
contenía también un frontend CRA obsoleto y un server Socket.IO deprecado que
NO se migran).

- Worker de producción `chatti-workers` en `https://chatti-workers.wz0un.workers.dev`
- Config: `backend/wrangler.toml` (DOs `ChatRoom`, `DirectMessage`; KV `ROOMS_KV`)
- Tests: `backend/` → `pnpm test` (vitest + `@cloudflare/vitest-plugin`, **29/29** en `dev` @ `4118ae2`)
- CI: `.github/workflows/backend.yml` — **solo tests** en `backend/**`
  (push/PR a dev/master). El job de deploy sigue comentado.
- **Deploy automático: ACTIVO vía Cloudflare Workers Builds** (proyecto conectado a
  `wz0un/chatti-mobile`). Cada push a `master` construye y despliega
  `chatti-workers` y `chatti-web`. La promoción de Wave 2 (PR #62, `master`
  `c5610c9`) se desplegó así; `/health` responde **200** (`version 2.2.0`) y la
  verificación post-despliegue del **2026-11-08** confirma PBKDF2 activo. Los
  parches manuales al Worker (p. ej. el hotfix PBKDF2 del 2026-09-15) son efímeros
  y quedan sobrescritos por el siguiente build de `master`.
- Auth: device-based, no tokens, `userId` as parameter
- Durable Objects: `ChatRoom` (rooms), `DirectMessage` (DMs)
- KV: rooms, users, contacts, conversations
- Password hashing: **PBKDF2-SHA256 (Workers-native) live en producción**, con
  fallback `bcrypt.compare` para hashes legacy (se re-hashea en el siguiente
  login). BUG-01 cerrado post-despliegue (ver `.mece/cells/QA-WAVE-2/POST-DEPLOY.md`).

## Branches

| Branch | Purpose | Key files |
|--------|---------|-----------|
| `master` | Producción (mobile + web + backend); head `c5610c9` (Wave 2 completa) | `App.js`, `src/`, `web/`, `shared/`, `docs/`, `backend/` |
| `dev` | Desarrollo activo; head `4118ae2` (#64). Diff con `master` = solo `pnpm-lock.yaml` | todo lo anterior + Wave 2 |
| `feature/web-implementation` | Histórico: implementación web (ya fusionado a `dev`) | `web/`, `shared/` |
| `hotfix/bug01-pbkdf2-prod` | Histórico: hotfix #58, ya en `master` vía #62; se puede borrar | `backend/src/index.js` |

## What's implemented

### Mobile app (source of truth, untouched)

- Full feature set: auth, rooms, DMs (encrypted), contacts, profile, i18n (en/es/ar/fr)
- Known bugs: 6 discovered (documented in `docs/WEB-ARCHITECTURE.md` §2), not fixed unless explicitly tasked

### Web app (on `dev`/`master`)

| Feature | Status | Task |
|---------|--------|------|
| Vite + React 19 + TS scaffold | ✅ Done | T1 |
| Shared types/contracts/i18n/storage | ✅ Done | T2 |
| E2E encryption (byte-identical with mobile) | ✅ Done | T3 |
| Auth service (register/login/session) | ✅ Done | T4 |
| REST API client | ✅ Done | T5 |
| WebSocket clients (room + DM) | ✅ Done | T6 |
| Auth UI (login/register) | ✅ Done | T7 |
| App shell (sidebar + responsive) | ✅ Done | T8 |
| Conversations list | ✅ Done | T9 |
| Encrypted DM chat | ✅ Done | T10 |
| Contacts screen (list + add + requests) | ✅ Done | T11 |
| Profile (language selector, delete) | ✅ Done | T12 |
| Room list screen | ✅ Done | T13 |
| Room chat screen | ✅ Done | T14 |
| Deep-linkable routes | ◐ Implementado en código (`room/:roomId`, `dm/:conversationId` + SPA fallback), pendiente QA/CTO | T16 |
| RTL/a11y | ❌ Not started | T18 |
| Dark mode | ❌ Not started | T19 |
| Web Push notifications (SW + VAPID + toggle) | ◐ **Desplegado**: producción sirve `sw-2` (verificado 2026-11-08). QA técnica PASS (125/125 tests, harness ampliado). ⏳ Pendiente solo la prueba manual de entrega + sign-off | T22 |
| CI pipeline (lint + typecheck + tests + build) | ◐ Implementado (`.github/workflows/web.yml`, PR #50/#53), pendiente QA/CTO | T24 |

### Cloudflare deployment

- chatti-web Worker (producción): la última verificación independiente registrada fue desde master c5610c9, sirviendo sw-2 (2026-11-08). Cloudflare bot reports one successful production build per documentation head pushed to PR #68; listed below are those known at authoring time: `55476ef` → build `289ae743-9e81-48c6-bd5a-8f47dd452779` (2026-11-19), `376b210` → build `401e499c-1b2b-4e4b-843b-1d3f7c4d2ef4` (2026-11-22 18:30 UTC), `4ccc7cd` → build `a116785f-301f-48ce-8f9d-7bf8b1043493` (19:10 UTC), `6bd7113` → build `bf67b333-26f5-4051-a032-363f4de5df05` (22:06 UTC). The bot edits its PR comment in place, so a comment link may show a build newer than the head named beside it; each ID above is the build the bot reported for that head. These are bot reports; Staff confirmed the trigger was expected and authorized publishing #68, and no manual deploy or independent runtime check was performed.
- chatti-workers Worker (producción): la última verificación independiente registrada fue /health 200 y PBKDF2 live desde master c5610c9 (2026-11-08). Cloudflare bot reports one successful production build per documentation head pushed to PR #68; listed below are those known at authoring time: `55476ef` → build `64088b03-8c32-408f-890d-8b72dfde6544` (2026-11-19), `376b210` → build `751d3736-3152-4ada-8482-4725f2ff0896` (2026-11-22 18:29 UTC), `4ccc7cd` → build `d869b1ff-8ad5-4ce3-bbc8-63820e472af5` (19:09 UTC), `6bd7113` → build `e71a1018-1d3b-48f9-9e91-be580ddec154` (22:06 UTC). The bot edits its PR comment in place, so a comment link may show a build newer than the head named beside it; each ID above is the build the bot reported for that head. These are bot reports; Staff confirmed the trigger was expected and authorized publishing #68, and no manual deploy or independent runtime check was performed.
- `chatti-web-staging` Worker (staging): build `c90f130` (2026-09-14); `/sw.js` sigue devolviendo HTML (543 B, BUG-NEW-02). No bloquea la prueba manual en producción, que ya sirve `sw-2`.
- Config: `web/wrangler.jsonc`, `web/public/_headers`
- Workers Builds CI/CD arreglado (2026-09-19): `web/pnpm-workspace.yaml` roto eliminado en `master` (commit `756780b`); `tsconfig.json` raíz inlineado (commit `f7c896f`). Fixes reintroducidos en `dev` (PRs #40/#41).

## QA status

| Phase | Gate | Result |
|-------|------|--------|
| M0 Foundations | Unit tests + build | ✅ PASS (125/125 web tests en `c5610c9`; build OK) |
| M0 Foundations | Encryption interop | ✅ PASS (byte-identical with mobile) |
| M1 Core chat | Fresh-session DM round-trip | ✅ PASS |
| M1 Core chat | Auth (register/login) | ✅ **PASS post-deploy 2026-11-08**: PBKDF2 live (discriminador 72 B → 401), 10/10 checks, probe 36/36 × 2 rondas sin 5xx/1102. Ver `.mece/cells/QA-WAVE-2/POST-DEPLOY.md`. |
| M1 Core chat | DM reconnect | ✅ FIXED (BUG-02: listener wipe resolved) |
| M1 Core chat | Contacts screen | ✅ DONE (Task 11 implemented + validated) |
| M1 Core chat | Profile controls + conversation delete | ✅ DONE (Task 12 + BUG-03; typecheck/lint/125 tests pass) |
| M1 Core chat | Full QA gate | ✅ **Desbloqueado** — BUG-01 resuelto en producción; gate formal pendiente de re-ejecución QA/CTO. |
| M2 Rooms | Functional QA | ✅ LIVE PASS 2026-09-15: interop web⇄móvil real. ✅ Contacto web→móvil (finding 4): corregido y **verificado live 2026-11-08** (`deviceId` nuevo adoptado, viejo 404). |
| Regression suite | Task 20 (QA regression) | ✅ DONE — `npm run qa:regression` = 92/92 (85 unit + 5 interop + 2 reconnect), reproducible en clone limpio. Ver `docs/QA-REGRESSION.md` |
| Task 22 Web Push — FE+BE | producción `sw-2` | ✅ QA técnica PASS (125/125 tests, harness con hash/query, push headless). ✅ Bloqueos 1 y 2 resueltos (pipeline y VAPID en prod). ✅ `sw-2` desplegado y verificado live. ⏳ Pendiente: prueba manual de entrega en navegador real + sign-off CTO/Staff. **No DONE.** |
| Wave 2 — Task 22 (QA) | `master` `c5610c9` | ✅ QA técnica PASS · ⏳ manual NOT RUN · sign-off pendiente. No DONE. |
| Wave 2 — BUG-01 parity | `master` `c5610c9` | ✅ **QA post-deploy PASS** (2026-11-08). CTO verificado. Pendiente ack del Staff en tablero. |
| Wave 2 — device-id (M2 finding 4) | `master` `c5610c9` | ✅ **PASS live** (2026-11-08): `users/find` y `by-device-id` adoptan el `deviceId` nuevo; el viejo 404. |
| Wave 2 — DM history | `master` `c5610c9` | ⚠️ NOT RUN — sin decisión Staff. No DONE. |

Full report: `docs/QA-REPORT.md` · Regression: `docs/QA-REGRESSION.md` · PR #27: `docs/QA-PR27-TASK22.md` · Post-deploy: `.mece/cells/QA-WAVE-2/POST-DEPLOY.md`

## Open items

1. **Task 22 Web Push — prueba manual de entrega (único pendiente de la task):** el entorno de QA no puede recibir push. Requiere un navegador real (Chrome/Firefox) contra producción (`sw-2` live): usuario B envía DM a usuario A sin conexión activa; debe llegar la notificación del SO y el click debe abrir el chat correcto. Procedimiento en `docs/QA-PR27-TASK22.md` §9.6; veredicto actual `Task 22 QA técnica PASS, manual delivery NOT RUN`.
2. **DM history contract:** sin decisión Staff; recomendación (a) de BE-AUTH-CLOSE (emitir `history` en `join`) no implementada. No duplicar `history` sin decidir el contrato (el móvil no deduplica).
3. **Mobile P0 (#16 → #15 → #14):** #16 está implementado y fusionado en dev por [PR #66](https://github.com/wz0un/chatti-mobile/pull/66), merge 5a0e1ae. QA ordinal 7 conserva PASS histórico a–d solo para fuente/diff/APK exactos; retest ordinal 11 BLOCKED por falta de Android SDK/dispositivo. CTO ordinal 1 aprobó fuente/diff; ordinales 3/4 son aprobaciones históricas sobre alcances/snapshots anteriores. El auditor independiente T3 emitió REQUEST_CHANGES sobre el head 376b210 ([review](t3-thread://v2/39965b4d-5f2a-4a0f-96a4-e78e93c02ef4/thread:delegated-task:command%3Amcp%3A2a912ee0-4d39-44c1-b6fc-1ec390bfded0%3Adelegate-task%3A071ea9d3-3786-4ea1-9c28-edd68dc134c1)); el CTO re-review independiente del head 4ccc7cd también devolvió REQUEST_CHANGES por provenance histórica y falta de traza del QA ordinal 15 ([review](t3-thread://v2/39965b4d-5f2a-4a0f-96a4-e78e93c02ef4/thread:delegated-task:command%3Amcp%3A759110f6-0150-4522-ba7d-7f489adcb568%3Adelegate-task%3A828aa578-538a-4ab3-9fef-b0af599f2b50)). El CTO re-review independiente del head 6bd7113 devolvió REQUEST_CHANGES porque los informes aún citaban los builds de 4ccc7cd como los reportados, mientras el bot ya había publicado los de 6bd7113 ([review](t3-thread://v2/39965b4d-5f2a-4a0f-96a4-e78e93c02ef4/thread:delegated-task:command%3Amcp%3Ada205b4e-d153-4d2b-9a7d-c1fefca6f7bd%3Adelegate-task%3A49551e1a-489c-443d-9a9a-187e26785c4f)). Snapshot actual corregido: QA SHA-256 975960832d28fd512ab8050bdbe724a527cea25d44cd86bac3189e670ca13711; implementación c1accb61940985200f14ad8fedd0886745bbb82785b4e34de77ac609a7a9761c; nueva revisión pendiente. Cloudflare bot reporta un build production por head documental (55476ef, 376b210, 4ccc7cd, 6bd7113) y edita su comentario in place; sin verificación independiente del runtime. #67 cerrado como supersedido; #68 abierto; #16/Trello OPEN / IN PROGRESS, sin DONE ni promoción a master. #15/#14 no iniciados.
4. **Purga KV (Staff):** quedan las **45 cuentas `bug01qa_*`** del probe pre-despliegue. Las cuentas nuevas del post-deploy (4 manuales + 24 del probe) se borraron best-effort.
5. **Staging:** `chatti-web-staging` sigue sirviendo HTML en `/sw.js` (BUG-NEW-02). Redesplegar `master`/`dev` si se quiere usar staging para la prueba manual.
6. **Cuentas legacy:** siguen autenticándose con `bcrypt.compare` (fallback) hasta su siguiente login; no se probó una cuenta real legacy.
7. **Ramas:** `dev` permanece en `5a0e1ae` y `master` en `c5610c9` (verificado 2026-11-22); `dev` está 2 commits por delante de `master` (solo `pnpm-lock.yaml`, PR #64). PR abiertos: #68 (trazabilidad de #16, pendiente de revisión) y #63 (dependabot); #67 se cerró como supersedido y PR #65 está fusionado.

## Fixed (committed)

- **BUG-01 (CRITICAL):** auth 503/1102 por bcrypt en Workers → PBKDF2 nativo; desplegado en `master` y verificado live el 2026-11-08.
- **BUG-NEW-01 (P1):** producción servía `sw-1` → producción sirve `sw-2` (verificado 2026-11-08).
- **BUG-NEW-03 (P2):** cobertura del harness de hash/query → 6 casos añadidos; web 125/125.
- **BUG-02 (HIGH):** WebSocket reconnect wipes `listeners` Map — fixed in `shared/ws/DirectMessageSocket.ts` (commit `673832a`); regression cubierta por `npm run qa:reconnect`
- **BUG-04 (MEDIUM):** `lastSeen` not updated on incoming DM messages — fixed in `web/src/features/dm/DirectMessagePage.tsx` (commit `673832a`)
- **BUG-06 (LOW):** i18n key mismatch in empty-search subtext — fixed in `web/src/features/conversations/ConversationsPage.tsx` (commit `673832a`)

## Next steps

1. ⏳ Staff ejecuta la prueba manual de Task 22 contra producción (`sw-2`) y firma → Task 22 DONE.
2. ⏳ Staff purga las 45 cuentas `bug01qa_*` en KV de producción.
3. ⏳ Staff decide el contrato DM history (recomendación (a)).
4. ⏳ Solicitar nuevo re-review independiente sobre los informes corregidos en [PR #68](https://github.com/wz0un/chatti-mobile/pull/68): QA SHA `e4c63c664ef44f8cff20583d6be2844b13d21976053f0781f180042ea8d79335`, implementación SHA `a8246ec93c4f6e86aa15637d970aa0f858982c29da6253529b8a4a496604d035`. El CTO re-review del head 4ccc7cd devolvió REQUEST_CHANGES por provenance del worktree sin marcar como histórica y por falta de traza del QA ordinal 15; ambos puntos están corregidos en los informes. QA ordinal 11 sigue BLOCKED, no hay PASS funcional nuevo. Mantener #16 OPEN / IN PROGRESS; no cerrar issue/Trello ni promover a master sin sign-offs válidos. #67 está cerrado como supersedido; #66 está fusionado en dev.
5. ⏳ DevOps redespliega staging (BUG-NEW-02) si se quiere un entorno de pruebas Web Push alternativo.
6. ⏳ Siguiente promoción `dev → master` solo si se quiere incluir la sincronización de lockfile (#64).

## Docs index

| Document | Purpose |
|----------|---------|
| `WEB-ARCHITECTURE.md` | Target architecture, API inventory, interop constraints |
| `WEB-ROADMAP.md` | M0–M4 milestones with status |
| `WEB-TASKS.md` | 24 tasks with ownership and status |
| `WEB-PARITY.md` | 26-feature mobile vs web matrix |
| `WEB-PUSH.md` | Task 22 Web Push: BE/FE contract, payload schema, SW behavior |
| `QA-PR27-TASK22.md` | QA verdict PR #27 (Task 22) — gates, merge sim, pipeline, blockers (§8 Wave 2, §9 post-deploy) |
| `QA-REPORT.md` | QA gate report with bugs |
| `CLOUDFLARE-DEPLOYMENT.md` | Cloudflare deployment config |
| `BACKEND-AUDIT.md` | Deep backend technical audit (separate repo context) |
| `BACKEND-HARDENING-PLAN.md` | 5-phase backend production plan (separate repo context) |
| `QA-BUG01-SOURCE-PARITY.md` | BUG-01 source parity + BE confirmation |
| `QA-BUG01-RETEST.md` | BUG-01 retest procedure |
| `QA-M2-INTEROP.md` | M2 live interop evidence |

## Definition of Done (AGENTS.md)

Nothing is DONE without **QA sign-off + CTO/Staff sign-off**. Estado a 2026-11-08:

| Item | Sign-off pendiente |
|------|--------------------|
| Task 22 Web Push (#45) | ⏳ Prueba manual de entrega en navegador real + CTO/Staff. `sw-2` ya está live. |
| BUG-01 source parity (PR #52/#56/#58) | ✅ QA post-deploy PASS + CTO (2026-11-08). Pendiente ack del Staff en tablero. |
| device-id (M2 finding 4) | ✅ QA live PASS (2026-11-08). Pendiente ack del Staff en tablero. |
| DM history contract | ⏳ Decisión Staff + QA live + CTO/Staff |
| Task 16 / BUG-05 (deep links) | ⏳ QA + CTO/Staff (implementado en código, no validado) |
| Task 24 (CI) | ⏳ QA + CTO/Staff (implementado, no validado) |
| Mobile P0 #14/#15/#16 | #16: QA ordinal 7 a–d PASS histórico solo para hashes exactos; QA ordinal 11 retest BLOCKED. CTO ordinal 1 aprobó fuente/diff; ordinal 3 evidencia QA histórica; ordinal 4 snapshots documentales anteriores, sin revocación. El auditor T3 independiente devolvió REQUEST_CHANGES sobre 376b210, el CTO re-review independiente sobre 4ccc7cd, y el re-review de 6bd7113 devolvió REQUEST_CHANGES porque los informes aún citaban los builds de 4ccc7cd como los reportados. Snapshot actual corregido: QA SHA `975960832d28fd512ab8050bdbe724a527cea25d44cd86bac3189e670ca13711`; implementación `c1accb61940985200f14ad8fedd0886745bbb82785b4e34de77ac609a7a9761c`; re-review pendiente. Raw logs no existen; no hubo reejecución. #66 merged en dev, #67 supersedido/cerrado, #68 abierto. Cloudflare bot reporta un build production por head documental y edita su comentario in place; sin chequeo independiente de runtime. #16 OPEN / IN PROGRESS, sin DONE ni master promotion. #15/#14 pendientes, no iniciados. |
