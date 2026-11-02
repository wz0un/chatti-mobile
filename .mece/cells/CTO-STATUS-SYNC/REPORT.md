# CTO-STATUS-SYNC — REPORT (Phase C, Wave 2)

**Cell:** CTO-STATUS-SYNC (Wave 2, Phase C) · **Mode:** documentación solamente; sin código de producto, sin deploy, sin merge.
**Base:** `dev` @ `d6608d9e3f3630a408c98bd401516365c95b34df` (= `origin/dev`).
**Rama:** `docs/status-sync-wave-2` (desde `d6608d9`).
**Fecha:** 2026-11-02.
**Session id:** `cto-status-sync-wave-2`

## 1. Ficheros actualizados

Documentación (docs/):
- `docs/STATUS.md` — aplicado el STATUS delta de la Wave 2 (PR #56/#57 mergeados en `dev`; QA-WAVE-2 verdicts; PR #58 abierto a `master`; BUG-01 parity FAIL; despliegues `sw-1`/staging HTML/bcrypt; mobile Phase 2 locked; sección "Backend (separate repo, NOT this one)" eliminada; tabla de ramas reconciliada; sección Definition of Done con sign-offs pendientes).
- `docs/WEB-TASKS.md` — Task 16 y Task 24 marcados ◐ implementados (verificado contra el repo) pendientes QA/CTO; Task 22 actualizado (sw-2 en dev, producción sw-1); BUG-01 actualizado (paridad FAIL, PR #58); BUG-05 actualizado (implementado en código); añadidos BUG-NEW-01/02/03.
- `docs/WEB-ROADMAP.md` — Phase 1 (BUG-01 abierto en producción), Phase 3 item 1 (deep links implementados en código), Phase 4 items 3/4 (push sw-2 en dev, CI implementado), milestone summary actualizado.
- `docs/WEB-PARITY.md` — fila push actualizada (sw-2 en dev, producción sw-1, QA técnica PASS, manual NOT RUN); fila DM actualizada (worker envía `history` antes del `join`; contrato pendiente Staff); resumen actualizado.
- `docs/QA-PR27-TASK22.md` — copiado desde el worktree QA (`t3-504e388b`); solo la nueva §8 (QA-WAVE-2 consolidación) se añade; el resto coincide con `dev`.

Informes Wave 2 copiados (sin modificar):
- `.mece/cells/QA-WAVE-2/REPORT.md`
- `.mece/cells/QA-WAVE-2/WEBPUSH-DEV-D6608D9.md` (fuente: `WEBPUSH-PRE-MERGE.md`)
- `.mece/cells/QA-WAVE-2/BUG01-LIVE.md`
- `.mece/cells/DEVOPS-DEPLOY-VERIFY/REPORT.md`
- `.mece/cells/MOBILE-P0-PLAN/REPORT.md`

Informe propio:
- `.mece/cells/CTO-STATUS-SYNC/REPORT.md` (este fichero).

## 2. Reconciliación de entradas stale (verificadas contra el repo)

| Entrada stale | Verificación | Acción |
|---|---|---|
| Task 24 (CI) dice TODO | `.github/workflows/web.yml` existe (PR #50 `81d6c41`, #53) con typecheck, lint, tests, build | Marcado ◐ implementado, pendiente QA/CTO |
| Task 16 / BUG-05 (deep-linkable routes) | `web/src/app/App.tsx` define `room/:roomId` y `dm/:conversationId`; `web/wrangler.jsonc` usa `not_found_handling: single-page-application` | Marcado ◐ implementado en código, pendiente QA/CTO; BUG-05 pasa a "implementado en código, pendiente validación" |
| Bloque "Backend (separate repo, NOT this one)" en STATUS.md | Contradice la sección "Backend (integrated in this repo)" (monorepo) | Eliminado; se fusionó en la sección monorepo |
| Tabla de ramas de STATUS.md | `feature/web-implementation` ya fusionado; `dev` por delante de `master` (+19 commits); `master` con 4 commits no en `dev` (PR #51/#53) | Tabla reescrita (master/dev/hotfix/feature) |

## 3. Definition of Done (AGENTS.md) — sign-offs pendientes

Nada es DONE sin QA + CTO/Staff. Estado actual:

| Item | Estado | Sign-off pendiente |
|---|---|---|
| Task 22 Web Push (#45) | QA técnica PASS; entrega manual NOT RUN | QA manual en navegador real + CTO/Staff |
| BUG-01 source parity (PR #52/#56) | QA parity FAIL (producción bcrypt) | QA live (probe + ráfaga + legacy) + CTO/Staff; PR #58 a `master` |
| device-id (M2 finding 4) | PASS local (2 tests); live NOT RUN | QA live + CTO/Staff |
| DM history contract | NOT RUN (sin decisión Staff) | Decisión Staff + QA live + CTO/Staff |
| Task 16 / BUG-05 (deep links) | Implementado en código | QA + CTO/Staff |
| Task 24 (CI) | Implementado | QA + CTO/Staff |
| Mobile P0 #14/#15/#16 | Planes listos, Phase 2 LOCKED | `STAFF-APPROVAL` + QA device + CTO/Staff |

## 4. Lista exacta de cambios de Trello para el Staff

No se accedió a Trello (sin credenciales en esta sesión); los estados actuales se toman de `docs/STATUS.md`/`docs/WEB-TASKS.md` y de la TASK.md de esta celda. El Staff debe aplicar:

| Tarjeta | Estado actual (según docs) | Estado correcto | Evidencia |
|---|---|---|---|
| BUG-01 | Título con "IN PROGRESS"/"BLOCKED" pero marcada complete | Reabrir / no complete; QA parity FAIL | `.mece/cells/QA-WAVE-2/BUG01-LIVE.md`; producción ejecuta bcrypt de `master` (truncación 72 B) |
| BUG-03 | "IN PROGRESS"/"BLOCKED" en título pero marcada complete | Reconciliar con DoD (solo DONE con QA+CTO/Staff) | `docs/WEB-TASKS.md` (BUG-03 ☑ FIXED en código; validar sign-off) |
| Task 12 | "IN PROGRESS"/"BLOCKED" en título pero marcada complete | Reconciliar con DoD | `docs/WEB-TASKS.md` (Task 12 ☑ DONE, static QA) |
| "M1 + M2 staging QA gate" | Marcada complete | Reabrir: su descripción dice que no está cerrado | `docs/STATUS.md` (M1 gate ⚠️ Blocked; M2 QA not ready) |
| Task 22 Web Push (#45) | Debe permanecer en QA/IN PROGRESS | No marcar DONE hasta QA manual + sign-off | `docs/QA-PR27-TASK22.md` §8; veredicto "Task 22 QA PASS pending manual delivery" |
| Task 16 / BUG-05 | TODO | Pasar a "implementado en código, pendiente QA/CTO" | `web/src/app/App.tsx` (`room/:roomId`, `dm/:conversationId`); `web/wrangler.jsonc` (`single-page-application`) |
| Task 24 (CI) | TODO | Pasar a "implementado, pendiente QA/CTO" | `.github/workflows/web.yml` (PR #50/#53) |
| Mobile P0 #14/#15/#16 | Open | Permanecen OPEN; Phase 2 LOCKED | `.mece/cells/MOBILE-P0-PLAN/REPORT.md` (`STAFF-APPROVAL: none`) |
| BUG-NEW-01 / BUG-NEW-02 / BUG-NEW-03 | (nuevas) | Crear tarjetas P1/P1/P2 | `.mece/cells/QA-WAVE-2/REPORT.md` §4 |

## 5. Decisiones abiertas para el Staff

1. **PR #58 (hotfix PBKDF2 a `master`):** abierto, head `c6921f35`, CI verde (backend tests + Workers Builds). Pendiente merge del Staff; tras el merge, Workers Builds despliega `chatti-workers` con PBKDF2. Repetir probe BUG-01 con ráfaga concurrente y una cuenta legacy real.
2. **Cuándo promover `dev`→`master`:** `dev` está 19 commits por delante de `master` (incluye #52/#56/#57). El PR `dev → master` debe incluir #52/#56/#57 y no debe precederse de ningún otro push a `master` que despliegue bcrypt. Staff decide el momento (tras QA manual de Task 22 y validación BUG-01).
3. **Contrato DM history:** recomendación (a) de BE-AUTH-CLOSE (mover `history` de `handleWebSocket` a `handleJoin`) no implementada. Duplicar `history` (conectar + join) rompería el móvil, que no deduplica. Requiere decisión Staff + QA live.
4. **Despliegue de sw-2 a staging/producción:** redesplegar `d6608d9` en `chatti-web-staging` y verificar `sw-2` + `application/javascript` (BUG-NEW-02) antes de la prueba manual; promover `dev → master` para producción (BUG-NEW-01).
5. **Purga de las 45 cuentas `bug01qa_`:** pendiente del Staff (no se puede verificar individualmente sin acceso a KV).
6. **Tests query/hash del harness:** FE debe añadir los 6 casos faltantes (BUG-NEW-03) antes de declarar Task 22 DONE.
7. **Mobile Phase 2:** `STAFF-APPROVAL: none`; planes #16 (S) → #15 (M) → #14 (M) listos; requiere aprobación explícita del Staff antes de tocar `src/`.

## 6. Verificación del diff

El diff de esta rama solo toca `docs/` y `.mece/`. No se modificó ningún fichero de producto (`web/`, `backend/`, `shared/`, `src/`, `App.js`, `index.js`, `app.json`, `eas.json`), ni dependencias, ni lockfiles. No se tocó `master`, no se deployó, no se usaron secretos. No se mergeó nada.

## 7. Veredictos Wave 2 (para referencia)

- Task 22 QA PASS pending manual delivery
- BUG-01 parity QA FAIL
- device-id NOT RUN live — PASS en tests locales (29/29)
- DM history NOT RUN — no hay decisión Staff