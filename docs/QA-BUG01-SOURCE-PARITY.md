# Chatti — BUG-01 Source Parity (PBKDF2)

**Agent:** CTO
**Date:** 2026-11-01
**Branch:** `bugfix/bug01-pbkdf2-source-parity` (desde `dev` @ `394a9d0`)
**Status:** IN PROGRESS — pendiente QA funcional y sign-off Staff (AGENTS.md)

## Contexto

El Worker de producción `chatti-workers` (v2.2.0) ejecuta un fix PBKDF2 aplicado
manualmente vía API para BUG-01. Ese fix **no está en el repositorio**: el código
de `backend/src/index.js` seguía usando `bcrypt` (`bcrypt.hash` en registro,
`bcrypt.compare` en login), mientras `.mece/cells/BE-AUTH-STABILITY/REPORT.md`
documentaba el cambio a PBKDF2 (WebCrypto) con migración legacy.

Riesgo: el siguiente deploy construido desde `master` habría reintroducido el
camino bcrypt que causaba los 503 / error 1102, y habría roto la verificación de
las cuentas ya migradas a PBKDF2 en producción.

## Cambio

`backend/src/index.js`:

- Hash de registro: `pbkdf2$sha256$100000$<saltB64>$<derivedB64>`.
- Parámetros: salt aleatorio de 16 bytes, SHA-256, 100.000 iteraciones,
  clave derivada de 256 bits.
- Verificación: PBKDF2 nativo de Workers (`crypto.subtle`).
- Compatibilidad: si el hash guardado no es PBKDF2, se verifica con
  `bcrypt.compare` (cuentas legacy) y, si es correcto, se re-hashea a PBKDF2 en
  el primer login.
- La migración actualiza los tres índices KV: `user:username:*`,
  `user:id:*` y `user:device:*`.
- El decoder acepta base64 estándar y base64url (normaliza `-`/`_` y padding),
  para no depender de la variante usada por el deploy manual.

`bcryptjs` se mantiene en `backend/package.json` exclusivamente para verificar
cuentas legacy hasta que completen la migración.

## Evidencia

```bash
cd backend
pnpm test
```

Resultado: **29/29 tests PASS** (2 archivos), incluyendo 5 tests nuevos:

1. Registro guarda `pbkdf2$sha256$100000$...` y login correcto funciona;
   password incorrecta devuelve 401.
2. Usuario legacy con hash bcrypt inicia sesión y queda migrado a PBKDF2 en
   `user:username:*`, `user:id:*` y `user:device:*`; el siguiente login usa
   PBKDF2 y una password incorrecta devuelve 401.
3. Hash PBKDF2 generado por una implementación independiente
   (`node:crypto.pbkdf2Sync`, 100.000 iteraciones, SHA-256) se verifica
   correctamente, tanto en base64 estándar como base64url.
4. Hash PBKDF2 malformado (base64 inválido) devuelve 401, no 500; el fallback
   bcrypt tampoco propaga excepciones.
5. Dos primeros logins concurrentes de una cuenta legacy bcrypt devuelven 200 y
   dejan el hash migrado a PBKDF2.

## BE confirmation (2026-11-01)

Comparación del código de `dev` con el comportamiento desplegado documentado en
`.mece/cells/BE-AUTH-STABILITY/REPORT.md`:

| Aspecto | Producción (deploy manual) | `backend/src/index.js` en `dev` |
|---|---|---|
| KDF | PBKDF2-HMAC-SHA-256, 100.000 iteraciones | Igual (`crypto.subtle`) |
| Salt / clave | 16 bytes / 256 bits | Igual |
| Formato | `pbkdf2$sha256$100000$<saltB64>$<derivedB64>` | Igual |
| Legacy | `bcrypt.compare` + migración en login | Igual |
| Migración | `user:username`, `user:id`, `user:device` | Igual (más borrado del índice de device anterior) |

**Root cause confirmado:** `bcryptjs` (bcrypt puro en JS) consume CPU en el
runtime de Workers; bajo concurrencia supera el presupuesto de CPU → error 1102
→ HTTP 503. PBKDF2 nativo (`crypto.subtle`) elimina ese camino para cuentas
nuevas y migradas.

**Sin verificar todavía:** no se ha leído un hash real de producción desde KV
(`wrangler` sin credenciales). La compatibilidad se validó con un vector
independiente de `node:crypto`, no contra el valor almacenado en producción.
La verificación definitiva es QA live post-deploy: login de una cuenta creada
antes del fix y de una cuenta nueva.

## Pendiente (no declarar DONE)

- QA funcional en staging: registro nuevo, login, y login de una cuenta creada
  antes del cambio (hash legacy bcrypt) verificando que migra a PBKDF2.
- Validar con una cuenta existente de producción: no fue posible leer su hash
  desde KV porque `wrangler` no tiene credenciales en este entorno. La
  compatibilidad se cubrió con el vector independiente, no con el hash real.
- Sign-off CTO/Staff y promoción `bugfix/* -> dev -> master` por PR.
- El deploy a producción lo ejecuta el Staff; este cambio no se despliega solo.

## Rollback

Revertir el PR. Las cuentas ya migradas a PBKDF2 dejarían de poder iniciar
sesión con el código bcrypt anterior, por lo que el rollback solo es seguro
junto con el rollback del Worker de producción al build previo.
