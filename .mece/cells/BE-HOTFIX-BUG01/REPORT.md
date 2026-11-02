# BE-HOTFIX-BUG01 — report

**Session:** `be-hotfix-bug01-2026-11-02`
**Branch:** `hotfix/bug01-pbkdf2-prod` (desde `origin/master` @ `6221d4c`)
**PR:** https://github.com/wz0un/chatti-mobile/pull/58
**Code commit SHA:** `16aab98` (el SHA final de la rama incluye commits de documentación posteriores)
**Status global:** QA live post-deploy + sign-off CTO/Staff pendientes. Nada se declara DONE (AGENTS.md).

## Objetivo

Hotfix de producción: restaurar PBKDF2 en `master` para corregir la regresión
BUG-01. `master` solo contiene bcrypt; Workers Builds despliega
`chatti-workers` desde `master`, por lo que cada build reintroduce el camino
bcrypt (CPU → error 1102 → 503) y rompe las cuentas ya migradas a PBKDF2.

## Causa

- Workers Builds construye y despliega `chatti-workers` desde `master` en cada push.
- El fix PBKDF2 vive solo en `dev` (PR #52, commit `7752875`); `master` sigue con
  `bcrypt.hash` en registro y `bcrypt.compare` en login.
- `bcryptjs` puro en JS agota el presupuesto de CPU del Worker bajo concurrencia
  (error 1102), y las cuentas migradas a PBKDF2 no verifican con bcrypt.

## Evidencia QA live (2026-11-02, producción)

- Login con una password que coincide en los primeros 72 bytes y difiere después
  devolvió **200**: firma del truncamiento de bcrypt. Con PBKDF2 habría devuelto
  **401**. Confirma que el backend activo usa bcrypt.
- Probe de 126 intentos: **126/126 sin 5xx** (no se reprodujo 1102 en esa
  ventana), pero el código desplegado es el de `master`, que solo tiene bcrypt.

## Cambio (equivalente a #52)

Commit: `fix(backend): restore PBKDF2 hashing in source for BUG-01 parity`
(cherry-pick `-x` de `7752875`; se excluyó `docs/STATUS.md`).

```
 backend/src/index.js           | 104 +++++++++++++++++++++++++++++--
 backend/src/index.test.js      | 138 +++++++++++++++++++++++++++++++++++++++++
 docs/QA-BUG01-SOURCE-PARITY.md |  71 +++++++++++++++++++++
 3 files changed, 308 insertions(+), 5 deletions(-)
```

- `backend/src/index.js`:
  - Registro: `derivePasswordHash` con PBKDF2-HMAC-SHA-256 nativo
    (`crypto.subtle`), 100.000 iteraciones, salt de 16 bytes, clave de 256 bits,
    formato `pbkdf2$sha256$100000$<saltB64>$<derivedB64>`.
  - Login: `verifyPassword` PBKDF2 con comparación timing-safe.
  - Legacy: fallback `bcrypt.compare`; si es correcto, el hash se re-hashea a
    PBKDF2 en el primer login y se actualizan `user:username:*`, `user:id:*` y
    `user:device:*`.
  - Decoder base64 acepta variante estándar y URL-safe.
- `backend/src/index.test.js`: 3 tests nuevos de PBKDF2.
- `docs/QA-BUG01-SOURCE-PARITY.md`: doc de source parity / QA (25/25).

**Fuera del hotfix:** `docs/STATUS.md` (restaurado a `master`), fix de device-id
y hardening de #56, mobile/web/shared, lockfiles. No se tocó `dev`.

## Tests

```bash
cd backend
pnpm install --frozen-lockfile
pnpm test
```

Resultado: **25/25 tests PASS** (2 archivos), incluidos los 3 tests de PBKDF2:

1. `stores PBKDF2 hashes on register and verifies login`
2. `accepts legacy bcrypt users and migrates them to PBKDF2`
3. `verifies PBKDF2 hashes from an independent implementation (standard and URL-safe base64)`

## Conflictos

Ninguno. El parent de `7752875` y `origin/master` tienen `backend/src/index.js`,
`backend/src/index.test.js` y `docs/STATUS.md` idénticos; el cherry-pick aplicó
limpio. No hubo que resolver `backend/src/index.js`.

## Riesgo / rollback

- Riesgo bajo: mismo código ya mergeado y validado en `dev` (#52) y mismo
  comportamiento que producción ejecuta desde el deploy manual.
- Rollback: revertir el PR. Las cuentas ya migradas a PBKDF2 no podrán
  autenticarse con el código bcrypt anterior; el rollback debe acompañarse del
  rollback del Worker al build previo.

## Merge / despliegue

- El merge lo hace el **Staff**; el agente no mergea ni despliega.
- Al mergearse, Workers Builds desplegará `chatti-workers` desde `master`.

## Pendiente (no declarar DONE)

- QA live post-deploy: registro/login nuevos (sin 5xx) y login de una cuenta
  legacy verificando la migración a PBKDF2.
- Sign-off CTO/Staff.
- Sincronizar `master -> dev` tras el hotfix para evitar divergencia.

## Blockers

Ninguno para el PR. El merge y el despliegue dependen del Staff.
