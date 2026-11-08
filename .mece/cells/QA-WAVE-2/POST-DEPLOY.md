# QA-WAVE-2 — POST-DEPLOY (verificación en producción)

**Célula:** QA-WAVE-2 (verificación post-despliegue)
**Ejecutor:** CTO (verificación directa, sin delegación) — lectura/escritura solo sobre cuentas desechables de QA; sin cambios de producto (los commits de esta sesión son únicamente documentación en `docs/` y este informe).
**Fecha:** 2026-11-08, 22:32–22:37 UTC
**Base desplegada:** `origin/master` @ `c5610c9` (PR #62, promoción Wave 2). `origin/dev` @ `4118ae2` — la única diferencia es `pnpm-lock.yaml` (PR #64).
**Objetivo:** confirmar que el despliegue de producción (Workers Builds desde `master`) incorpora PBKDF2, `sw-2` y la adopción de `deviceId`, y repetir el probe de estabilidad de BUG-01.

---

## 1. Estado del despliegue

| Comprobación | Resultado | Evidencia |
|---|---|---|
| `chatti-workers` `/health` | ✅ 200 · `{"status":"ok","version":"2.2.0"}` | `curl`, 2026-11-08 22:35 UTC |
| `chatti-web` `/sw.js` | ✅ 200 · `SW_VERSION = 'sw-2'` · `skipWaiting` + `clients.claim` | `curl`, 2026-11-08 22:36 UTC |
| `origin/master:backend/src/index.js` | ✅ PBKDF2 (`pbkdf2$sha256$…`) + fallback `bcrypt.compare` para cuentas legacy | `git show origin/master:backend/src/index.js` |
| `origin/master` vs `origin/dev` | ✅ Solo `pnpm-lock.yaml` (453+/385−); mismo código de producto | `git diff --stat origin/master origin/dev` |

El despliegue automático de Workers Builds (push a `master` en #58 y #62) quedó confirmado de forma conductual: la producción ya no trunca contraseñas a 72 bytes.

---

## 2. BUG-01 — PBKDF2 live (discriminador black-box)

Script: `/tmp/opencode/postdeploy_qa.py` (cabeceras Chrome + `Origin` para evitar el 403 de Cloudflare). **10/10 checks PASS.**

| # | Check | Esperado | Observado | ms |
|---|-------|----------|-----------|---|
| A1 | `register` password 94 B (`A×72 + "TAIL-ONE-DISCRIMINATOR"`) | 200 | **200** | 414 |
| A2 | `login` con `A×72 + "TAIL-TWO-DIFFERENT"` | **401** (PBKDF2) | **401** | 106 |
| A3 | `login` con la password correcta | 200 | **200** | 125 |
| B1 | `register` control 63 B | 200 | **200** | 419 |
| B2 | `login` control, diferencia en el byte 51 | 401 | **401** | 131 |
| C1 | `register` con `deviceId` d1 | 200 | **200** | 530 |
| C2 | `login` con `deviceId` nuevo d2 | 200 | **200** | 632 |
| C3 | `users/find` devuelve d2 | d2 | **d2** | — |
| C4 | `users/by-device-id?deviceId=d2` | 200 | **200** | — |
| C5 | `users/by-device-id?deviceId=d1` | 404 | **404** | — |

**Lectura:** un `200` en A2 habría significado bcrypt; el `401` confirma que **PBKDF2 está ejecutándose en producción**. C3–C5 confirman que la rotación/adopción de `deviceId` de #56 también está live.

**Cuentas creadas y borradas (best-effort, todas con `delete` 200):**

| Username | userId | Resultado |
|---|---|---|
| `qapdcb372763#0001` | `user_1794177363833_fqa0ibw8h` | creada + borrada |
| `qactlcb372763#0001` | — (borrada; userId no registrado en el informe) | creada + borrada |
| `qadevcb372763#0001` | — (borrada; userId no registrado en el informe) | creada + borrada |
| `qacurlc94ad297#0001` | `user_1794177355737_drp8x8wm9` | creada + borrada (prueba de cabeceras) |

> Nota de trazabilidad: el script registró `userId` solo de la cuenta A y de la cuenta C. Las cuentas B y C se borraron con `delete` 200 (el script imprime el código), pero sus `userId` no quedaron en el log; si la purga del Staff encuentra restos con prefijo `qacurl`/`qapd`/`qactl`/`qadev` de esta fecha, son de esta sesión.

---

## 3. Probe de estabilidad BUG-01 (`pnpm qa:bug01`)

Ejecutado desde el worktree `t3-6cd902e0/web` (base `c5610c9`), contra producción.

| Hora UTC | Ronda | Pares register+login | Resultado | 5xx / 1102 | avg / p95 / max |
|---|---|---|---|---|---|
| 22:32:53 | 1 | 12 | **36/36 OK** | 0 / 0 | 204 / 525 / 553 ms |
| 22:36:12 | 1 | 12 | **36/36 OK** | 0 / 0 | 201 / 515 / 598 ms |

- `get-conversations` también incluido (12 por ronda) y siempre 200.
- Veredicto del probe: `BUG-01 NOT reproduced — auth stable across probe`.
- Informes: `/tmp/chatti-qa/bug01-2026-11-08T22-32-53-807Z.json` y `/tmp/chatti-qa/bug01-2026-11-08T22-36-12-689Z.json`.

---

## 4. Veredictos

| Item | Veredicto |
|---|---|
| **sw-2 live** | ✅ **PASS** — producción sirve `SW_VERSION = 'sw-2'` |
| **BUG-01 post-deploy** | ✅ **PASS** — PBKDF2 live (discriminador 72 B → 401); probe 2×36/36 sin 5xx |
| **device-id live** | ✅ **PASS** — d2 adoptado; `users/find` d2; `by-device-id` d2 200 / d1 404 |
| **Estabilidad auth** | ✅ **PASS** — 72 requests HTTP 200, 0 5xx, 0 `1102` |
| **Task 22 entrega manual** | ⚠️ **NOT RUN** — requiere navegador real con permiso de notificaciones y un segundo usuario; no se puede automatizar aquí |

---

## 5. Qué queda para cerrar

1. **BUG-01:** cerrado técnicamente (QA post-deploy + revisión CTO). Riesgo residual: cuentas legacy siguen ejecutando `bcrypt.compare` en el primer login (fallback intencional) y las contraseñas >72 B creadas antes del fix quedaron truncadas en bcrypt; deben re-loguearse/migrarse. Cierre formal = QA + CTO (hecho) con conocimiento del Staff.
2. **device-id (M2 finding 4):** validado live. Cierre formal pendiente de QA/CTO (esta verificación lo cubre) y de la prueba funcional de contacto web→móvil si el Staff la exige.
3. **Task 22:** solo falta la **prueba manual de entrega** (notificación del SO + deep link) en Chrome/Firefox reales, ya se puede hacer **en producción** porque `sw-2` está live. Procedimiento paso a paso en `docs/QA-PR27-TASK22.md` §9.6.
4. **BUG-NEW-01:** resuelto (producción sirve `sw-2`).
5. **BUG-NEW-03:** resuelto en `dev`/`master` — harness ampliado a **125/125** tests web (9/9 archivos), verificado 2026-11-08 22:37 UTC.
6. **BUG-NEW-02 (staging):** sigue abierto; `chatti-web-staging` no valida la prueba manual porque devuelve HTML en `/sw.js`. Ya no bloquea Task 22 (se prueba en producción), pero debe corregirse antes de usar staging para regresión.
7. **Purga:** 45 cuentas `bug01qa_*` de la QA del 2026-11-02 + las cuentas desechables de esta sesión, en KV de producción.
