# BE-AUTH-CLOSE report

**Session:** `be-auth-close-2026-11-01`
**Branch:** `bugfix/be-auth-close` (desde `dev` @ `2a331a7`)
**PR:** https://github.com/wz0un/chatti-mobile/pull/56
**Status global:** QA + CTO/Staff pendientes. Nada se declara DONE.

## Status por item

| Item | Estado | Evidencia |
| --- | --- | --- |
| 1. BUG-01 source parity + BE confirmation | Implementado, pendiente QA/Staff | Commits `d000208`; tests 29/29; `docs/QA-BUG01-SOURCE-PARITY.md` |
| 2. `users/find` vs `users/by-device-id` | Implementado, pendiente QA/Staff | Commit `28dd303`; tests de regresión M2 |
| 3. DM history contract | Recomendado, **no implementado** | Sección "DM history" abajo; decisión Staff |

## Archivos cambiados

- `backend/src/index.js`
  - `verifyPassword`: try/catch en la rama PBKDF2 y en `bcrypt.compare`; un hash corrupto devuelve `false` (401), no 500.
  - `findUserByUsername`: lee el registro canónico `user:id:<userId>` y devuelve su `deviceId`/`publicKey`; fallback al registro de `user:username`.
  - `handleUpdatePushToken`: actualiza también `user:username:<u>:<d>` y borra `user:device:<deviceId anterior>` cuando cambia.
  - `loginUser`: acepta `deviceId` opcional, actualiza el mapping y borra el índice anterior.
- `backend/src/index.test.js`
  - Hash PBKDF2 malformado → 401.
  - Dos primeros logins concurrentes de una cuenta legacy bcrypt → 200 y migración a PBKDF2.
  - Regresión M2: tras cambiar de device, `users/find`, `users/by-device-id` y `contacts/request` son consistentes.
  - Login con `deviceId` nuevo refresca `user:username`, `user:id` y `user:device`.
- `docs/QA-BUG01-SOURCE-PARITY.md`
  - Sección **BE confirmation** y tests 29/29.

## Test output

```text
$ cd backend && vitest run

Test Files  2 passed (2)
     Tests  29 passed (29)
  Duration  2.37s
```

## Item 1 — BE confirmation

Comparado con `.mece/cells/BE-AUTH-STABILITY/REPORT.md` (deploy manual en producción):

| Aspecto | Producción | `dev` |
| --- | --- | --- |
| KDF | PBKDF2-HMAC-SHA-256, 100.000 iteraciones | Igual (`crypto.subtle`) |
| Salt / clave | 16 bytes / 256 bits | Igual |
| Formato | `pbkdf2$sha256$100000$<saltB64>$<derivedB64>` | Igual |
| Legacy | `bcrypt.compare` + migración | Igual |
| Migración | `user:username`, `user:id`, `user:device` | Igual, más limpieza del device anterior |

Root cause confirmado: `bcryptjs` es bcrypt puro en JS y consume CPU en Workers;
bajo concurrencia excede el presupuesto → error 1102 → HTTP 503. PBKDF2 nativo
elimina ese camino para cuentas nuevas y migradas.

No verificado: no se ha leído un hash real de producción desde KV (`wrangler`
sin credenciales). La compatibilidad se validó con un vector independiente de
`node:crypto`, no contra el valor almacenado en producción.

## Item 2 — device-id consistency (M2 finding 4)

Causa raíz: `update-push-token` actualizaba `user:id` y `user:device:<nuevo>`,
pero no `user:username`. Tras una reinstalación/re-login, `users/find` devolvía
el `deviceId` viejo del índice de username; `by-device-id` daba 404 y
`contacts/request` fallaba con "Recipient user not found".

Fix sin cambiar request/response shapes:

1. `users/find` usa el registro canónico `user:id`.
2. `update-push-token` refresca los tres índices y elimina el device anterior.
3. `loginUser` acepta `deviceId` opcional para adoptar un dispositivo nuevo
   (los clientes actuales todavía no lo envían; es aditivo).

## Item 3 — DM history (recomendación, sin código)

Estado actual:

- `backend/src/DirectMessage.js:146` envía `history` en `handleWebSocket`, antes
  de que el cliente haga `join`.
- `handleJoin` (`:199`) no envía historial.
- Móvil: `src/services/DirectMessageService.js:109` registra `onmessage` antes
  del `onopen` que envía `join` (`:91`); `handleHistory` (`:230`) **añade** al
  cache sin deduplicar.
- Web: `shared/ws/DirectMessageSocket.ts:134` registra `onmessage` antes del
  `join` (`:118`); `DirectMessagePage.tsx:100` reemplaza la lista.

**Recomendación (a):** mover el envío de `history` de `handleWebSocket` a
`handleJoin`, después de guardar la metadata. Es compatible con ambos clientes
porque el listener ya está registrado cuando envían `join`. No se implementa en
este PR: duplicar `history` (conectar + join) rompería el móvil, que no deduplica,
y no hay harness de test para el DO WebSocket. Requiere decisión Staff y QA live.

## Riesgos

- Borrar `user:device:<anterior>` asume un device por cuenta; el modelo actual
  no soporta multi-device real. Si el Staff quiere multi-device, hay que
  rediseñar el índice.
- `users/find` cambia la fuente de `deviceId` a `user:id`; la forma de la
  respuesta no cambia, pero QA debe verificar el flujo de contacto.
- El login con `deviceId` es aditivo y aún no lo usan los clientes; no hay
  regresión esperada.
- `master` sigue con bcrypt: no desplegar backend desde `master` hasta promover
  #52.
- Vulnerabilidades Dependabot reportadas por GitHub: 101 en la rama por defecto
  (1 crítica). Fuera del alcance de esta celda.

## QA live que debe ejecutar

1. Registro y login nuevos: 200, sin 503/1102.
2. Login de una cuenta legacy bcrypt: 200 y hash migrado en KV (Staff puede
   leer KV; el agente no tiene credenciales).
3. Reinstalar/limpiar storage del móvil, login, arrancar la app (dispara
   `update-push-token`); desde web: `users/find` debe devolver el device nuevo,
   `by-device-id` 200 y `contacts/request` 200.
4. Password incorrecta → 401; hash corrupto → 401 (no 500).

## STATUS delta (para CTO-STATUS-SYNC)

- Backend tests: **29/29**.
- BUG-01 source parity: código + confirmación BE; **pendiente QA live y
  sign-off**; `master` aún con bcrypt.
- M2 finding 4 (`users/find` vs `by-device-id`): corregido en código; mantener
  la fila M2 en QA, no DONE, hasta la prueba live.
- DM history: recomendación (a) pendiente de decisión Staff; no cambia el
  contrato todavía.
