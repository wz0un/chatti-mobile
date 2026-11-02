# QA-WAVE-2 — BUG-01 LIVE (QA pre-merge)

**Agente:** QA-BUG01-LIVE · **Fecha:** 2026-11-02 (UTC) · **Modo:** READ-ONLY sobre producto y Git
**Worktree:** `/home/mohsine/.t3/worktrees/chatti-mobile/t3-4ee4cae1`
**HEAD:** `d6608d9e3f3630a408c98bd401516365c95b34df` (= `origin/dev`) · **master:** `6221d4c2cedc7c3ad28629d4da2747cd79ccc46e`
**Target:** `https://chatti-workers.wz0un.workers.dev` (producción)
**Regla:** no se declara nada DONE. Este informe es evidencia de QA; faltan QA funcional formal y sign-off CTO/Staff.

---

## 0. Resumen ejecutivo

1. **Probe live: 126/126 intentos HTTP 200, cero 5xx, cero `error code: 1102`.** PASS del procedimiento prescrito.
2. **Pero producción está sirviendo el código de `master` con bcrypt, no el PBKDF2 de `dev`.** Evidencia conductual black-box: un login con contraseña idéntica en los primeros 72 bytes y distinta después devuelve **200** (truncación de bcrypt); con PBKDF2 devolvería 401. Control con diferencia dentro de los 72 bytes → 401. Segundo marcador: el login con `deviceId` nuevo **no** lo adopta (`users/find` sigue devolviendo el viejo; `by-device-id` nuevo → 404), comportamiento de `master`, no del fix de BE-AUTH-CLOSE.
3. **Consecuencia:** el probe PASS **no cierra BUG-01**. El camino que consume CPU y produjo el 1102 (`bcrypt.hash` / `bcrypt.compare`) sigue desplegado. El probe es secuencial; no se ha probado concurrencia (ver §7).
4. Los 29/29 tests de backend pasan en `dev`/PR #56. El código de `dev` es correcto para PBKDF2 y endurece hashes malformados, pero **ese código no es el que responde en producción**.

---

## 1. Contexto verificado antes del probe

| Ref | SHA | Estado |
|---|---|---|
| `HEAD` / `origin/dev` | `d6608d9` | Merge PR #56 (`bugfix/be-auth-close`), `2026-11-02T12:16:15Z` |
| PR #56 head | `1c0b8b3` | `git diff origin/bugfix/be-auth-close HEAD -- backend/src` → **vacío** (código idéntico al mergeado) |
| `origin/master` | `6221d4c` | Merge PR #53, `2026-11-01T19:49:22Z` |
| PR #52 (`2d3a9e5`) | PBKDF2 | **No** es ancestro de `master` (`git merge-base --is-ancestor` → NO) |

- `master` (`6221d4c`) sigue con `bcrypt.hash(password, 10)` en `registerUser` y `bcrypt.compare(...)` en `loginUser` (`backend/src/index.js` de master).
- `dev`/PR #56 usa PBKDF2-HMAC-SHA-256 (100.000 iteraciones, 16 B salt, 256 bits) y fallback bcrypt legacy con migración.
- `GET /health` no es discriminativo: `version: "2.2.0"` está hardcodeada en ambas ramas.

---

## 2. Método exacto

### 2.1 Probe prescrito (`docs/QA-BUG01-RETEST.md`)

Desde `web/`:

```bash
pnpm qa:bug01
# 1 ronda × 12 pares register+login (+ GET conversaciones por par)

BUG01_PER_ROUND=10 pnpm qa:bug01:stress
# BUG01_STRESS=1 fija 3 rondas; BUG01_PER_ROUND=10 fija 10 pares por ronda
# 3 rondas × 10 pares, 10 s entre rondas
```

Script: `web/scripts/bug01-probe.test.ts` (config `web/scripts/bug01.vitest.config.ts`).
Por cada par: `POST /api/auth/register` → `POST /api/auth/login` → `GET /api/dm/conversations` → `POST /api/auth/delete` best-effort.
Cualquier respuesta no-2xx se registra como fallo (un 503 con cuerpo 1102 entra por `status: 503`).
Regla de parada aplicada: 3 fallos 5xx/1102 consecutivos → detener. **No ocurrió.**

### 2.2 Diagnóstico adicional bcrypt vs PBKDF2 (black-box, no destructivo)

- **Discriminador de truncación:** bcrypt trunca la contraseña a 72 bytes; PBKDF2 usa la cadena completa.
  - Cuenta desechable, contraseña de 94 B: `A×72 + "TAIL-ONE-DISCRIMINATOR"`.
  - Login con `A×72 + "TAIL-TWO-DIFFERENT"` (90 B, mismos primeros 72 B).
  - **200 ⇒ bcrypt. 401 ⇒ PBKDF2.**
- **Control:** contraseña de 63 B, diferencia en el byte 51 (< 72) → debe ser 401 en ambos. Sirve para descartar que el login ignore la cola en general.
- **Segundo marcador:** login con `deviceId` nuevo. `dev` lo adopta (fix BE-AUTH-CLOSE); `master` lo ignora. Se contrasta con `users/find` y `users/by-device-id`.
- No se leyó KV ni ningún hash almacenado. Las conclusiones son **conductuales + código**, no inspección de hashes.

### 2.3 Health

`GET /health` antes y después, con `curl` (`-w '%{http_code} %{time_total}'`).

---

## 3. Evidencia live

### 3.1 Health

| Momento | UTC | HTTP | Latencia | Body |
|---|---|---|---|---|
| Antes | `2026-11-02T12:20:08Z` | 200 | 90.8 ms | `{"status":"ok","timestamp":1793622008351,"version":"2.2.0"}` |
| Después | `2026-11-02T12:22:03Z` | 200 | 120.9 ms | `{"status":"ok","timestamp":1793622123766,"version":"2.2.0"}` |

Mismo `version: "2.2.0"` antes y después. No distingue ramas.

### 3.2 Ronda normal — 12 pares

| Métrica | Valor |
|---|---|
| Ventana UTC | `12:20:41Z` → `12:20:55Z` |
| Intentos | **36** (12 register + 12 login + 12 GET) |
| 200 / 5xx | **36 / 0** |
| Latencia min / avg / p95 / max | 67 / 248 / 618 / 639 ms |
| `error code: 1102` | 0 |
| Resultado | PASS |

### 3.3 Stress — 3 rondas × 10 pares

| Ronda | Intentos | 200 | 5xx | Max | Avg | p95 | Resultado |
|---|---|---|---|---|---|---|---|
| 1 | 30 | 30 | 0 | 784 ms | 283 ms | 721 ms | OK |
| 2 | 30 | 30 | 0 | 597 ms | 245 ms | 564 ms | OK |
| 3 | 30 | 30 | 0 | 644 ms | 256 ms | 636 ms | OK |
| **Total** | **90** | **90** | **0** | **784 ms** | **261 ms** | **636 ms** | **OK** |

Ventana UTC: `12:21:00Z` → `12:21:57Z`.

### 3.4 Totales

| Conjunto | Intentos | 200 | 5xx | 1102 |
|---|---|---|---|---|
| Normal | 36 | 36 | 0 | 0 |
| Stress | 90 | 90 | 0 | 0 |
| **Probe total** | **126** | **126** | **0** | **0** |

Latencia por operación (los 126):

| Operación | n | min | avg | p95 | max |
|---|---|---|---|---|---|
| register | 42 | 456 ms | 547 ms | 699 ms | 784 ms |
| login | 42 | 98 ms | 127 ms | 174 ms | 209 ms |
| get-conversations | 42 | 66 ms | 98 ms | 147 ms | 151 ms |

Informes durables:

- `/tmp/chatti-qa/bug01-2026-11-02T12-20-41-030Z.json`
- `/tmp/chatti-qa/bug01-2026-11-02T12-21-00-832Z.json`

Ambos con `failures: []` y `verdict: "PASS — BUG-01 not reproduced"`.

### 3.5 Diagnóstico bcrypt (decisivo)

Cuenta `bug01qa_trunc_1793622014#0001`, `2026-11-02T12:20:14Z`:

| Paso | HTTP | Latencia | Lectura |
|---|---|---|---|
| register (password 94 B) | 200 | 761 ms | cuenta creada |
| login con password exacta | 200 | 210 ms | control OK |
| login con `A×72 + cola distinta` | **200** | 176 ms | **bcrypt trunca a 72 B** |
| delete | 200 | 566 ms | cuenta eliminada (ver §5) |

Control `bug01qa_ctl60_1793622171#0001`, `2026-11-02T12:22:51Z`:

| Paso | HTTP | Lectura |
|---|---|---|
| register (password 63 B) | 200 | cuenta creada |
| login exacto | 200 | control OK |
| login con diferencia en byte 51 (<72) | **401** | el login **sí** compara esa zona |
| delete | 200 | eliminada |

⇒ El 200 con cola distinta **solo** es explicable por truncación bcrypt a 72 bytes. Si el registro hubiera usado PBKDF2 (como `dev`) y el login PBKDF2, habría sido 401. Si el registro hubiera usado PBKDF2 y el login bcrypt legacy, `verifyPassword` habría entrado por la rama `pbkdf2$` y también habría dado 401. **Producción hashea y verifica con bcrypt.**

Marcador secundario `bug01qa_devid_1793622171#0001`, `2026-11-02T12:22:51Z`:

| Comprobación | Resultado | Lectura |
|---|---|---|
| register con `deviceId=qa-dev-old-…` | 200 | cuenta creada |
| login con `deviceId=qa-dev-new-…` | 200, `user.deviceId` = **old** | `master` ignora `deviceId` en login |
| `GET /api/users/find?username=…` | `deviceId` = **old** | índice de username sin refrescar |
| `GET /api/users/by-device-id?deviceId=new` | **404** | mapping nuevo no existe |
| `GET /api/users/by-device-id?deviceId=old` | 200 | mapping viejo intacto |
| delete(old y new) | 200 / 200 | limpieza |

⇒ Producción **no** tiene el fix de BE-AUTH-CLOSE (`dev`), corroborando que sirve `master`.

Las latencias también son coherentes con bcrypt: register avg ~547 ms (hash bcrypt 10 rondas en JS) vs login avg ~127 ms (compare), muy por encima de un PBKDF2 nativo de 100k iteraciones.

---

## 4. Revisión de código (independiente)

### 4.1 `dev` / PR #56 (idénticos en `backend/src`)

`verifyPassword(password, storedHash)` (`backend/src/index.js:72-101`):

- `typeof storedHash !== 'string'` → `false` (401, no 500).
- Rama `pbkdf2$`: exige 5 partes y `sha256`; parsea iteraciones; `Number.isFinite` y `> 0`; decodifica salt/derivado; `derivePbkdf2`; compara con `timingSafeEqual`.
- Todo el bloque va en `try/catch` → `false`. Un hash corrupto (`pbkdf2$sha256$100000$!!!$!!!`) devuelve **401**, no 500. Test explícito en `index.test.js:458`.
- Fallback legacy: `bcrypt.compare` envuelto en `try/catch` → `false` si el hash no es bcrypt válido.
- No hay comparación en tiempo constante para bcrypt (delegada a bcryptjs); aceptable.

Migración legacy (`loginUser`, `:588-620`):

- Solo tras verificación correcta: si `!passwordHash.startsWith('pbkdf2$')`, rehashea con PBKDF2.
- Actualiza `user:username:<u>:<d>`, `user:id:<id>` y `user:device:<deviceId>`; borra `user:device:<deviceId anterior>` si cambió.
- Test `accepts legacy bcrypt users and migrates them to PBKDF2` (`:367`) verifica los tres índices y relogin.
- Test `handles concurrent first logins of a legacy bcrypt account` (`:480`): dos logins concurrentes → 200/200 y hash final PBKDF2. Correcto, aunque ambos ejecutan `bcrypt.compare` a la vez (ver riesgo §7.3).

Hashes malformados / vectores:

- Test con vector independiente `node:crypto.pbkdf2Sync`, base64 estándar y URL-safe (`:415`).
- Test de hash PBKDF2 corrupto → 401 (`:458`).
- `decodeB64` normaliza `-`/`_` y rellena `=`; `atob` lanza en basura y el `catch` lo convierte en 401.

Resultado de tests:

```
$ cd backend && pnpm test
Test Files  2 passed (2)
     Tests  29 passed (29)
  Duration  2.74s
```

### 4.2 `master` (`6221d4c`, lo que sirve producción)

- `registerUser`: `const passwordHash = await bcrypt.hash(password, 10);`
- `loginUser`: `const isValidPassword = await bcrypt.compare(password, user.passwordHash);`
- Sin `verifyPassword`, sin PBKDF2, sin migración, sin `try/catch` específico para hash corrupto (el `try/catch` del handler devolvería 500 ante un hash malformado).
- PR #52 (`2d3a9e5`) no está en `master`.

---

## 5. Cuentas desechables creadas (para purga del Staff)

Prefijo común: **`bug01qa_`** (`user:username:bug01qa_…`). Total: **45 cuentas**.

| Origen | N | Patrón / nombre exacto | Limpieza |
|---|---|---|---|
| `pnpm qa:bug01` (12 pares) | 12 | `bug01qa_r1_<0-11>_<base36>` (slice 24) | `deleteAccount` por par; sin warnings |
| `qa:bug01:stress` (3×10) | 30 | `bug01qa_r<1-3>_<0-9>_<base36>` | `deleteAccount` por par; sin warnings |
| canary truncación | 1 | `bug01qa_trunc_1793622014#0001` | borrada; login posterior con password correcta → **401** |
| control <72 B | 1 | `bug01qa_ctl60_1793622171#0001` | borrada; login posterior → **401** |
| marcador deviceId | 1 | `bug01qa_devid_1793622171#0001` | borrada; login posterior → **401** |
| **Total** | **45** | | |

- El canary y el control tuvieron un primer `delete` con `userId` erróneo por una colisión de variable del script de shell; se repitió con el `userId` correcto y se verificó con login 401. No quedan restos conocidos de esas 3.
- Las 42 cuentas del probe se borraron con `userId`/`deviceId` correctos y el script no emitió ningún `cleanup failed`. No se puede verificar individualmente sin acceso a KV.
- Si el Staff quiere purgar por si alguna limpieza best-effort falló: listar `user:username:bug01qa_` (ventanas `12:20:41–12:20:55Z` y `12:21:00–12:21:57Z`, más las 3 manuales de `12:20:14Z` y `12:22:51Z`).

Llamadas de diagnóstico: **21** adicionales (canary, control, marcador, health). **0 respuestas 5xx** (incluye 401/404 esperados). Total de peticiones de la sesión: 147, 0 × 5xx.

---

## 6. Qué demuestra y qué no demuestra el probe

**Demuestra:**

- Con el patrón del bug (register/login repetidos, secuenciales, 126 intentos en ~76 s), producción **no** devolvió 503 ni 1102.
- El endpoint responde y las cuentas nuevas funcionan de extremo a extremo (register → login → GET conversaciones → delete).
- Producción ejecuta bcrypt (truncación 72 B + `deviceId` no adoptado + latencias).

**No demuestra:**

- Que BUG-01 esté corregido. El código con bcrypt sigue desplegado; el 1102 es sensible a concurrencia y a CPU por isolate, no solo a volumen secuencial.
- Que las cuentas legacy bcrypt puedan loguearse sin 1102. No tenemos credenciales de una cuenta legacy; no se probó.
- Nada sobre los hashes almacenados en KV: no se leyó KV. La conclusión bcrypt es conductual, no inspección de valores.

---

## 7. Riesgos

1. **CRÍTICO — producción sirve bcrypt.** Confirmado conductualmente y por código (`master`). El fix PBKDF2 (PR #52) sigue solo en `dev`. Cualquier concurrencia de registros/logins puede volver a disparar 1102/503; el probe secuencial no lo descarta.
2. **ALTO — el PASS es estrecho.** 126 intentos secuenciales, sin ráfagas concurrentes ni cuentas legacy. No debe usarse como evidencia de cierre de BUG-01.
3. **ALTO — riesgo residual en el propio `dev`:** las cuentas legacy bcrypt siguen ejecutando `bcrypt.compare` en cada login hasta el primer login correcto; dos primeros logins concurrentes ejecutan bcrypt dos veces. La migración reduce el riesgo con el tiempo, no lo elimina de golpe.
4. **MEDIO — sin cota de iteraciones PBKDF2.** `verifyPassword` acepta cualquier `iterations > 0`; un hash con iteraciones absurdas (solo escribible por el servidor) podría consumir CPU. Impacto bajo, pero conviene un máximo.
5. **MEDIO — `master` sigue siendo la rama de despliegue.** Cualquier push a `master` (aunque sea docs/CI) reconstruye `chatti-workers` con bcrypt. Promover #52 a `master` mediante PR revisado es la mitigación estructural.
6. **BAJO — `/health` no distingue versión real.** `2.2.0` hardcodeada en ambas ramas; no sirve para verificar qué código está activo.
7. **BAJO — cuentas QA.** 45 cuentas desechables; 42 limpiadas best-effort sin verificación individual. Purga por prefijo si el Staff lo considera.

---

## 8. STATUS delta (para CTO-STATUS-SYNC, no aplicado)

- BUG-01: **probe live PASS (126/126, 0 5xx) pero producción sirve bcrypt**; la task sigue abierta (QA formal + CTO/Staff). No marcar DONE.
- Deploy: `chatti-workers` en producción responde con el comportamiento de `master 6221d4c` (bcrypt), no con `dev d6608d9` (PBKDF2). Consistente con DEVOPS-DEPLOY-VERIFY.
- Acción recomendada: PR revisado `dev → master` con #52/#56 antes de cualquier otro push a `master`; después repetir este probe con ráfaga concurrente y una cuenta legacy real (Staff).

---

## 9. Veredicto

El probe prescrito no reprodujo BUG-01 en 126 intentos secuenciales, pero la evidencia conductual demuestra que producción ejecuta bcrypt (`master`). **PASS del probe ≠ BUG-01 cerrado.**

BUG-01 live probe: PASS (0 5xx / 126 intentos)
