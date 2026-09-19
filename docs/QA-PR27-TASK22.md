# QA Verdict — PR #27 promote Task 22 Web Push to master

**QA Agent:** Senior QA (sesión 2026-09-19)
**PR:** [#27](https://github.com/wz0un/chatti-mobile/pull/27) — `dev` (`f8a876a`) → `master` (`14a6bef`)
**Scope:** Task 22 Web Push (FE): Service Worker + VAPID helper + `/api/auth/webpush` contract + Profile toggle + tests + docs (20 archivos, +1218/−6)
**Authoritative docs:** `docs/WEB-PUSH.md`, `docs/WEB-TASKS.md`, `docs/WEB-PARITY.md`

---

## Veredicto resumido

| Área | Resultado |
|------|-----------|
| Código / estática | ✅ **PASS** |
| Merge safety (móvil) | ✅ **PASS** — no se toca `App.js`/`src/`/`package.json`; SDK 57 conservado |
| Merge simulado en config CI | ✅ **PASS** — build + 109/109 tests sobre el árbol fusionado |
| Check de producción (Workers Builds) | ✅ **RESUELTO por DevOps** (2026-09-19) — ver §4 |
| Función end-to-end | ⛔ **NO operativa** — backend `/api/auth/webpush` + VAPID pendientes (ver §5) |

Conclusión QA: **código aprobado para promoción**. El merge a `master` queda a cargo de Staff una vez confirmado el fix de pipeline. La task 22 **NO puede marcarse DONE** (DoD: falta sign-off QA funcional + BE pendiente).

---

## 1. Gates técnicos (head `f8a876a`, clone limpio)

| Gate | Resultado |
|------|-----------|
| `pnpm run typecheck` (tsc `-b`, strict) | ✅ PASS |
| `pnpm run lint` (eslint) | ✅ PASS |
| `pnpm run build` (`tsc -b && vite build`) | ✅ PASS — 77 módulos, `assets/index-*.js` 353.39 kB / 108.92 kB gzip; `sw.js` + `icons/chatti-icon-192.png` copiados a `dist/` |
| `pnpm test` (unit) | ✅ **109/109** (8 files) — incluye `webPush.test.ts`, `web/src/lib/webPush.test.ts`, `ApiService.test.ts` |
| `pnpm run smoke` (live backend) | ✅ 4/4 |
| Probes de regresión (`reconnect.vitest.config.ts`) | ✅ 2/2 (BUG-02 sigue resuelto) |
| Interop cripto web⇄mobile (`interop.vitest.config.ts`) | ✅ 5/5 |
| i18n claves `profile.webPush.*` | ✅ 11/11 × 4 idiomas (en/es/ar/fr) — `getNested` resuelve todas; sin claves huérfanas |
| CSP (`web/public/_headers`) | ✅ `worker-src 'self'` añadido; `connect-src` correcto |
| Rutas deep-link usadas por `sw.js` | ✅ `room/:roomId` y `dm/:conversationId` existen en `src/app/App.tsx` |

## 2. Merge safety

- `git merge-tree origin/master origin/dev` → merge limpio, sin conflictos.
- Árbol fusionado: `expo ~57.0.19`, `react-native 0.86.3` (**SDK 57 de master conservado**, no hay downgrade; `package.json` no cambia porque dev no lo tocó vs. el merge-base).
- Cero cambios en `App.js`, `index.js`, `app.json`, `eas.json`, `src/`.
- Simulación en worktree (`origin/master` + `git merge origin/dev`): `pnpm run build` OK y `pnpm test` **109/109** con la config que usa CI.

## 3. Revisión funcional de código

- `shared/notifications/webPush.ts` — schema + `parsePushPayload` + `notificationUrlFor`: tipado estricto, saneado de tipos en runtime (string-only), fallback `/rooms`. ✅
- `web/src/lib/webPush.ts` — permisos → suscripción VAPID → registro backend; manejos desacoplados (resultado union, sin throws de UI); base64url→Uint8Array correcto (VAPID sin padding). ✅
- `web/public/sw.js` — `skipWaiting`/`claim`; `push` ignora payload sin `title`; `notificationclick` reutiliza/focaliza ventanas; deep-link a SPA. URLs no-`http(s)` rechazadas por `openWindow`/`navigate` (sin vector `javascript:`). ✅
- `shared/api/ApiService.ts` `registerWebPush`/`removeWebPush` — payload según contract; error `{error?}` extraído y propagado. ✅
- `ProfilePage.tsx` — toggle + estados (loading/on/off/blocked/unsupported); refleja errores localizados. ⚠️ **UX menor:** con permiso denegado el badge muestra "On" (`webPushState === 'blocked'` entra en `statusEnabled`); sugerido mostrar "Off/Blocked".

## 4. Pipeline de producción (bloqueo 1 — RESUELTO por DevOps)

Diagnóstico QA sobre check `Workers Builds: chatti-web` (todos los builds fallaban en ~2 s en cualquier rama; último deploy real 11-ago):

- **Causa raíz:** `web/pnpm-workspace.yaml` roto + `tsconfig.json` raíz con `extends: expo/tsconfig.base` no resoluble en el entorno de build de Cloudflare.
- **Fix (en `master`):** `756780b` (elimina pnpm-workspace.yaml) + `f7c896f` (inlina expo tsconfig.base en `tsconfig.json`).
- **Evidencia:** build `51b03b57` **SUCCESS** en `master` `f7c896f` (`npx wrangler deploy`, 2026-09-19 21:03).
- **Nota:** el deploy de `f7c896f` aún NO incluye Task 22 (el código de web push vive en `dev`); llega a producción con el merge de PR #27.

## 5. Bloqueo 2 — feature NO operativa end-to-end (pendiente BE/Staff)

Probado live 2026-09-19 contra `chatti-workers.wz0un.workers.dev`:

- `POST /api/auth/webpush` → **HTTP 200 con el JSON raíz de la app** (endpoint inexistente; cae al índice). `registerWebPush` recibirá `success !== true` → `register-error` → toggle muestra "Could not update push notifications".
- `VITE_VAPID_PUBLIC_KEY` sin valor en el build → estado "not configured".
- Conclusión: el FE degrada con gracia (sin crash), pero la feature solo será usable cuando el Worker implemente el endpoint + VAPID + envío (contract en `docs/WEB-PUSH.md` §2). Apta para promoción del código; **no para declarar Task 22 DONE**.

## 6. Recomendación final

1. Apoyar el merge de PR #27 a `master` una vez confirmado el pipeline verde (evidencia §4) — el código es sólido y no regresiona móvil.
2. **Sync `master`→`dev` de los fixes de CI** (tsconfig inline + sin pnpm-workspace.yaml) para que `dev` también buildee en CF.
3. **BE/Staff:** implementar `POST /api/auth/webpush` + keypair VAPID (o aceptar que la feature queda inerte en producción hasta entonces).
4. **FE (opcional, minor):** badge "On" en estado `blocked` → mostrar "Off/Blocked".
5. DoD: Task 22 permanece **IN PROGRESS** hasta sign-off QA funcional (end-point vivo) + CTO.