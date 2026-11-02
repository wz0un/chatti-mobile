# QA-WAVE-2 — Web Push notification click — QA sobre dev mergeado `d6608d9`

**Célula:** QA-WAVE-2 (Wave 2, Phase B)
**Agente:** QA-WEBPUSH-PRE-MERGE (rol asignado; esta ejecución es QA sobre `dev` mergeado) — read-only sobre producto y Git
**Fecha de ejecución:** 2026-11-02, 13:19–13:34 CET (Europe/Madrid)
**Worktree:** `/home/mohsine/.t3/worktrees/chatti-mobile/t3-989546bb`
**Base verificada:** `origin/dev` @ **`d6608d9e3f3630a408c98bd401516365c95b34df`**
**PR #57:** [#57](https://github.com/wz0un/chatti-mobile/pull/57) — head `7087b1b787d37b9c576125852b9397c34ff72380`, merge `2d7d798ff33b8500e0bfa29584affdb6ec13dac3`
**PR #56:** merge `d6608d9e3f3630a408c98bd401516365c95b34df` (segundo merge sobre `dev`)
**Session id:** `wave2-qa-webpush-dev-d6608d9`
**Alcance:** verificación del árbol mergeado de `dev`. No se editó producto, tests, docs ni estado Git. El único fichero escrito es este informe. No se tocó `/home/mohsine/Proyectos/chatti-mobile`.

---

## 0. Contexto de la base verificada

`git fetch origin --prune` + `git rev-parse origin/dev` confirman:

| Ref | SHA | Contenido |
|-----|-----|-----------|
| `origin/dev` | `d6608d9e3f3630a408c98bd401516365c95b34df` | merge de #56 (#57 ya incluido) |
| merge #57 | `2d7d798ff33b8500e0bfa29584affdb6ec13dac3` | padres `2a331a7` (dev base) + `7087b1b` (head #57), 12:16:03Z |
| merge #56 | `d6608d9e3f3630a408c98bd401516365c95b34df` | padres `2d7d798` + `1c0b8b3` (head #56), 12:16:15Z |
| `origin/master` | `6221d4c2cedc7c3ad28629d4da2747cd79ccc46e` | sin el fix (producción sirve `sw-1`) |

`git diff 7087b1b..d6608d9 -- web shared` está **vacío**: los paths de Web Push (`web/public/sw.js`, `web/src/lib/swNotificationClick.test.ts`, `shared/notifications/webPush.ts`) son idénticos entre el head del PR y el merge. El único delta del merge #56 es BE-AUTH-CLOSE:

```text
.mece/cells/BE-AUTH-CLOSE/REPORT.md | 126 +++++++++++++
backend/src/index.js                |  87 +++++----
backend/src/index.test.js           | 155 ++++++++++++++++
docs/QA-BUG01-SOURCE-PARITY.md      |  30 +++-
```

Aun así, **todos los gates de este informe se ejecutaron sobre `d6608d9`**, no sobre `7087b1b`. Esta es la QA del árbol mergeado; la entrega real en navegador sigue pendiente y se hace con la tabla de §6.

---

## Veredicto resumido

| # | Item | Resultado |
|---|------|-----------|
| 1 | Checkout de `origin/dev` @ `d6608d9` | ✅ PASS — `HEAD = d6608d9…`, árbol limpio |
| 2 | `pnpm typecheck` / `lint` / `test` / `build` (web) | ✅ PASS — 119/119 tests; build OK |
| 3 | `dist/sw.js` con `sw-2`, `skipWaiting`, `clients.claim` y fallback | ✅ PASS — idéntico byte a byte a `public/sw.js` |
| 4 | Harness `swNotificationClick.test.ts` — ejecución | ✅ PASS — 9/9 tests |
| 5 | Harness — cobertura de **todos** los casos pedidos | ❌ **FAIL (solo test)** — falta el caso hash / target con query; comportamiento verificado por sonda independiente |
| 6 | Contrato `shared/notifications/webPush.ts` ⇄ `web/public/sw.js` | ✅ PASS — paridad 7/7 en la tabla de routing |
| 7 | Entrega push real headless (`ServiceWorker.deliverPushMessage`) | ✅ PASS — 5/5 payloads, `data.url` correcto, `sw-2`, 0 excepciones |
| 8 | Click real de notificación en navegador de escritorio | ⚠️ **NOT RUN** — pendiente de Staff; el headless no puede enfocar ventanas |
| 9 | Invariantes PR #44 — fan-out paginado | ✅ PASS — backend 29/29 + `listKeysPaginated` 2/2 + call sites |
| 10 | Invariantes PR #44 — badge “Blocked” en en/es/ar/fr | ✅ PASS — claves + test i18n; sin test de componente |
| 11 | Prueba manual real Chrome/Firefox | ⚠️ **NOT RUN** — tabla preparada; requiere desplegar `d6608d9` en staging |
| 12 | Despliegue actual con el fix | ❌ **BLOQUEADO por entorno** — prod sirve `sw-1`; staging sirve HTML en `/sw.js` |

**No se marca nada como DONE.** Task 22 / #45 siguen en QA: falta la entrega real en navegador y el sign-off CTO/Staff. El único FAIL es de cobertura de tests (no funcional); no bloquea el merge del fix, pero debe cerrarse antes de declarar Task 22 DONE.

---

## 1. Entorno y método

| Dato | Valor |
|------|-------|
| SO | Linux 7.3.0-1-default (x86_64) |
| Node | v24.13.1 |
| pnpm | 11.9.0 |
| Chrome headless | Google Chrome **156.0.8078.79** |
| Python (servidor estático) | 3.13.16 |
| Worktree | `/home/mohsine/.t3/worktrees/chatti-mobile/t3-989546bb` |
| HEAD | `d6608d9e3f3630a408c98bd401516365c95b34df` (detached) |
| Fecha/hora | 2026-11-02 13:19–13:34 CET |

Pasos: `git fetch origin --prune`; `git checkout --detach d6608d9…`; `cd web && pnpm install --frozen-lockfile`; ejecución de gates; build; revisión del harness; sonda independiente del SW con `vm`; CDP con Chrome headless sobre el `dist` recién construido; `cd backend && pnpm install --frozen-lockfile && pnpm test`.

`git status` al terminar: solo este informe sin trackear; `node_modules/` y `dist/` son ignorados. No se commiteó, pusheó, mergeó ni desplegó nada.

---

## 2. Gates técnicos (web, `d6608d9`)

| Gate | Comando | Resultado exacto | Exit |
|------|---------|------------------|------|
| Typecheck | `pnpm typecheck` (`tsc -b --pretty false`) | sin errores | **0** |
| Lint | `pnpm lint` (`eslint .`) | sin warnings/errores | **0** |
| Tests | `pnpm test` (`vitest run`) | **9 files passed (9) · 119 tests passed (119)** · 1.02 s | **0** |
| Build | `pnpm build` (`tsc -b && vite build`) | **77 modules transformed**, built in 1.40 s | **0** |

Salida del build:

```text
dist/index.html                   0.54 kB │ gzip:   0.32 kB
dist/assets/index-BXovyozF.css   35.47 kB │ gzip:   5.48 kB
dist/assets/index-_VDfNBTW.js   354.42 kB │ gzip: 108.29 kB
✓ built in 1.40s
```

El número esperado (119/119) se cumple en el árbol mergeado. El PR #57 añadió 9 tests al harness; el resto son los 110 preexistentes.

### 2.1 `dist/sw.js`

| Comprobación | Evidencia |
|--------------|-----------|
| Existe y se copia a `dist/` | `web/dist/sw.js`, 5 256 bytes |
| Idéntico a la fuente | `cmp dist/sw.js public/sw.js` → idénticos; SHA-256 `2bc71fdc19bd49068e5911f7048a1bea9d485a72c29ebbb6a37fc3d644848c60` en ambos |
| Versión | línea 17: `const SW_VERSION = 'sw-2';`; ping responde `sw-2` |
| Lifecycle | línea 20: `self.skipWaiting();`; línea 24: `event.waitUntil(self.clients.claim());` |
| Fallback | línea 16: `FALLBACK_PATH = '/rooms'`; línea 86: `new URL(targetRaw \|\| FALLBACK_PATH, scope)`; líneas 50–59: `notificationUrlFor` con `/rooms` |
| Fallback de navegación | línea 131: `typeof appWindow.navigate === 'function'`; líneas 132–137: `try/catch` → `openWindow`; línea 139: `clients.openWindow(target.href)` |
| Sin ventana | línea 144: `clients.openWindow(target.href)` |
| Sin `sw-1` residual en el build | `grep -o "sw-[0-9]" dist/sw.js` → solo `sw-2` |

---

## 3. Harness `web/src/lib/swNotificationClick.test.ts`

### 3.1 Ejecución

`pnpm vitest run --reporter=verbose` sobre `d6608d9`: **9/9 tests del harness PASS**, dentro de los 119/119.

| Test | Caso | Qué prueba realmente | Veredicto |
|------|------|----------------------|-----------|
| `opens a new window when none is open` | sin ventana | `clients.matchAll` vacío → `openWindow('https://example.com/room/r1')` | ✅ |
| `focuses + navigates an open app window on another route (controlled)` | otra ruta, cliente controlado | `focus()` + `navigate(target.href)`; no se abre pestaña nueva | ✅ |
| `falls back to openWindow when an uncontrolled client has no navigate()` | uncontrolled sin `navigate` | `focus()` + `openWindow` (no hay `navigate` que llamar) | ✅ |
| `falls back to openWindow when navigate() rejects` | `navigate()` rechaza | `focus()` + `openWindow` tras el rechazo | ✅ |
| `focuses without navigating when already on target (trailing slash)` | ya en target, slash final | path igual tolerando `/` final → `focus()` y **no** `navigate()` | ✅ |
| `focuses without navigating when already on target (query diff)` | ya en target, query extra en el cliente | target sin query → se ignora la query del cliente → `focus()` sin `navigate()` | ✅ (nombre mejorable) |
| `skips clients with unparseable urls` | URL de cliente inválida | cliente `not a url` se salta; el bueno recibe `focus()`; no `openWindow` | ✅ |
| `continues when focus() rejects` | `focus()` rechaza | sigue al `navigate()` del mismo cliente | ✅ |
| `falls through when already-on-target focus() rejects` | ya en target + `focus()` rechaza | cae al `navigate(target.href)` | ✅ |

### 3.2 Cobertura que falta (FAIL de test, no de producto)

El encargo pedía “ya en target (slash/query/hash)”. El harness cubre slash y un caso de query, pero **no cubre**:

1. Target con **hash** y cliente sin hash → debe navegar (no enfocar).
2. Target con **hash** distinto → debe navegar.
3. Target con **hash** igual → debe enfocar sin navegar.
4. Target con **query** y cliente con query distinta → debe navegar.
5. Target con **query** igual → debe enfocar sin navegar.
6. Todos los clientes con URL inválida → debe caer a `openWindow` (hoy solo se prueba inválido + válido).
7. Payload sin `data` → `/rooms` (cubierto en `shared/notifications/webPush.test.ts`, no en el click harness).

**Por qué importa:** la regla documentada en `docs/WEB-PUSH.md` §4 (“cuando target tiene search/hash deben coincidir exactamente”) es la única rama del handler sin cobertura en CI. Un refactor futuro podría romperla en silencio. No es un fallo funcional actual: la sonda independiente de §3.3 confirma que el comportamiento es correcto.

**Sugerencia de tests a añadir (FE, no bloqueante para el merge del fix, sí para DONE):**

```ts
it('navigates when target has a hash and the client has none', ...)
it('navigates when target hash differs', ...)
it('focuses when target hash matches', ...)
it('navigates when target query differs', ...)
it('focuses when target query matches', ...)
it('opens a window when every client URL is unparseable', ...)
```

### 3.3 Sonda independiente (misma `web/public/sw.js` de `d6608d9`, fuera del harness)

Para no confundir “test ausente” con “comportamiento ausente”, cargué el `sw.js` real en un contexto `vm` con clientes simulados y ejecuté los casos no cubiertos:

| Caso | Resultado observado | ¿Coincide con la regla? |
|------|---------------------|--------------------------|
| target `#msg-5`, cliente sin hash | `focus` + `navigate(...#msg-5)` | ✅ |
| target `#b`, cliente `#a` | `focus` + `navigate(...#b)` | ✅ |
| target `#a`, cliente `#a` | solo `focus` | ✅ |
| target sin hash, cliente `#a` | solo `focus` | ✅ |
| target `?x=2`, cliente `?x=1` | `focus` + `navigate(...?x=2)` | ✅ |
| target `?x=2`, cliente `?x=2` | solo `focus` | ✅ |
| todos los clientes con URL inválida | `openWindow('/room/r1')` | ✅ |
| sin `notification.data` | `openWindow('/rooms')` | ✅ |
| uncontrolled + `focus()` rechaza | `openWindow('/room/r1')` | ✅ |
| target `javascript:alert(1)` | el SW llama `openWindow('javascript:alert(1)')` | ⚠️ no hay allowlist de esquema; ver §7 F4 |
| target absoluto cross-origin | `openWindow('https://evil.example/phish')` | ⚠️ por diseño se honra `url`; payload controlado por backend |

La sonda no sustituye al harness: no queda en CI. Su objetivo es demostrar que la rama hash/query **funciona** y que el gap es solo de cobertura.

---

## 4. Contrato `shared/notifications/webPush.ts` ⇄ `web/public/sw.js`

### 4.1 Tabla de routing

| Payload | `notificationUrlFor` (shared) | `notificationUrlFor` (SW) | Backend que lo emite |
|---------|-------------------------------|---------------------------|----------------------|
| `data.kind='room'`, `roomId='r1'` | `/room/r1` | `/room/r1` | `ChatRoom.js` L511–516 |
| `data.kind='dm'`, `conversationId='dm_x_v2'` | `/dm/dm_x_v2` | `/dm/dm_x_v2` | `DirectMessage.js` L510–515 |
| `url` explícito | se usa verbatim | se usa verbatim | override opcional |
| sin `data` / kind desconocido / falta id | `/rooms` | `/rooms` | fallback |

Paridad comprobada con 7 payloads (room, room con id codificable, dm, dm sin id, sin data, override, kind inválido): **7/7 idénticos**. El backend envía `{kind:'room', roomId, timestamp}` y `{kind:'dm', conversationId, conversationPartnerId}`; el SW solo usa `kind` + id para la URL, así que la diferencia de campos no afecta al routing.

### 4.2 Observaciones menores

- El `parsePushPayload` local del SW **no copia** `conversationPartnerId` ni `timestamp` (el shared sí). Hoy no se usan al hacer click; si en el futuro se necesitan, hay que unificar. **P3, sin impacto actual.**
- El comentario del SW (“Tolerate trailing-slash and query/hash differences”) es engañoso: cuando el target **tiene** search/hash, no se toleran diferencias; se exige igualdad exacta. El código y `docs/WEB-PUSH.md` sí son correctos. **P3, solo comentario.**

---

## 5. Entrega push real headless (CDP)

### 5.1 Montaje

- `web/dist/sw.js` + icono construidos desde `d6608d9` y servidos desde `http://127.0.0.1:8123/` con `python3 -m http.server` (contexto seguro de localhost). El `sw.js` servido tiene el mismo SHA-256 que el `dist` (`2bc71fdc…`).
- Chrome 156 headless con `--remote-debugging-port=9222`.
- Permiso de notificaciones concedido vía `Browser.grantPermissions`.
- En Chrome 156 el dominio `ServiceWorker` **no está en el target browser**: `ServiceWorker.enable` en el websocket del browser devuelve `-32601`; hay que enviarlo en el **target de la página**. `ServiceWorker.deliverPushMessage` funciona desde ahí.
- Inspección del resultado con `self.registration.getNotifications()` en el target del SW (prueba que `showNotification` se ejecutó y que `data.url` es el correcto).

### 5.2 Resultados

| Payload entregado | `data.url` esperado | `data.url` observado | Resultado |
|-------------------|---------------------|----------------------|-----------|
| room `r1` | `/room/r1` | `/room/r1` | ✅ |
| room `r 1/x` (encoding) | `/room/r%201%2Fx` | `/room/r%201%2Fx` | ✅ |
| dm `dm_x_v2` | `/dm/dm_x_v2` | `/dm/dm_x_v2` | ✅ |
| kind desconocido | `/rooms` | `/rooms` | ✅ |
| `url:'/profile'` + room | `/profile` | `/profile` | ✅ |
| payload sin `title` | no debe crear notificación | contador 5 → 5 | ✅ ignorado |

- Ping desde la página: `{type:'pong', version:'sw-2'}`; `navigator.serviceWorker.controller === true`.
- **0 excepciones** en el run de entrega sobre `d6608d9`.
- La notificación se creó con título, tag, icono y `data.url` correctos; `getNotifications()` la devuelve.

**Conclusión:** la cadena “push event → `parsePushPayload` → `notificationUrlFor` → `showNotification({data:{url}})`” funciona con el `dist/sw.js` real del árbol mergeado en Chrome 156. Es evidencia más fuerte que el harness, pero **no** cubre el click.

### 5.3 Click: NOT RUN (limitación real del sandbox)

No existe un método CDP para “clickear” una notificación del sistema. Intenté una aproximación con `new NotificationEvent('notificationclick', {notification})` + `self.dispatchEvent(ev)`:

- El handler real se ejecuta, pero `event.waitUntil` lanza `InvalidStateError: Can not call waitUntil on a script constructed ExtendableEvent` (sw.js:88): el evento sintético no tiene “extensions allowed”, así que no es una prueba válida del ciclo de vida.
- Además, en headless `client.focus()` se rechaza con `Not allowed to focus a window` (no hay ventana enfocable). El handler cae al `navigate()`, que recarga la pestaña; eso **no** demuestra el caso “ya en target = solo foco”.
- Probé también `clients.openWindow` con `userGesture:true` para `javascript:` y para `https://example.com/`: **ambos** se rechazan con `InvalidAccessError: Not allowed to open a window`, así que el sandbox no permite validar el comportamiento por esquema (ver F4).
- Por tanto, el click real queda **NOT RUN** y se delega a la tabla manual de §6. El fallo observado es un artefacto del evento sintético/headless, **no** un bug del producto.

---

## 6. Prueba manual real para Staff (Chrome y Firefox de escritorio)

> **NO ejecutada. NO marcar como pasada.** Solo Staff, en un navegador real, puede validar la entrega y el click.

### 6.1 Precondición crítica: desplegar primero `d6608d9`

Estado comprobado el 2026-11-02 (13:27–13:33 CET):

| Entorno | `GET /sw.js` | Contenido | ¿Tiene el fix? |
|---------|--------------|-----------|----------------|
| Producción `https://chatti-web.wz0un.workers.dev` | HTTP 200, 3 701 bytes, `text/javascript` | `sw-1`, sin `sameSearch`/`sameHash` | ❌ **NO** (master aún no tiene #57) |
| Staging `https://chatti-web-staging.wz0un.workers.dev` | HTTP 200, 543 bytes, `content-type: text/html` | index.html (fallback SPA), no es un SW | ❌ **NO** (build stale/sin `/sw.js`) |
| Build local `web/dist` de `d6608d9` | 5 256 bytes | `sw-2` + fix | ✅ |

**Por tanto:** la prueba manual **no puede empezar** contra producción ni contra el staging actual. Staff/DevOps debe publicar un build que contenga `d6608d9` en `chatti-web-staging` (permitido desde `dev` bajo QA; nunca a `chatti-web`/producción todavía). Usar `pnpm build` (modo production) para hornear `VITE_VAPID_PUBLIC_KEY`; no un mode staging sin env. Verificación previa obligatoria:

```bash
curl -sS https://chatti-web-staging.wz0un.workers.dev/sw.js | grep -o "sw-[0-9]"
# debe imprimir: sw-2
curl -sSI https://chatti-web-staging.wz0un.workers.dev/sw.js | grep -i content-type
# debe ser application/javascript (NO text/html)
```

Si se prefiere probar en local: `cd web && pnpm build && pnpm preview` (localhost es contexto seguro) o `npx wrangler dev`; el push service real debe ser alcanzable desde el equipo de Staff.

### 6.2 Material necesario

- Dos cuentas QA (A y B) en el backend de producción (`chatti-workers`), o dos perfiles de navegador.
- A con permiso de notificaciones concedido; notificaciones del SO activas; No Molestar desactivado.
- Chrome de escritorio y Firefox de escritorio, versión anotada.
- Consola/DevTools para el ping y `chrome://serviceworker-internals` / `about:debugging#/runtime/this-firefox` para el SW.
- Carpeta de evidencias (p. ej. `docs/qa/2026-11-02-webpush/`) para capturas; enlazarlas en la última columna.

### 6.3 Pasos y resultados esperados

| ID | Paso | Resultado esperado |
|----|------|--------------------|
| S1 | Abrir la app; en consola: `navigator.serviceWorker.controller.postMessage({type:'ping'})` y escuchar `message`. | `{type:'pong', version:'sw-2'}`. Si responde `sw-1`, el navegador aún tiene el SW viejo: Application → Service Workers → Update / recargar. |
| S2 | Profile → Push Notifications → **Enable notifications**; aceptar el permiso. | Badge **On**; sin errores en consola; suscripción registrada. |
| S3 | A en `/rooms` (pestaña abierta). B envía un mensaje a una sala de A. Esperar la notificación y hacer click. | Se enfoca la pestaña existente y navega a `/room/:roomId`; **no** se abre una pestaña duplicada. |
| S4 | A cierra todas las pestañas de la app (el SW sigue registrado). B envía un mensaje de sala. Click en la notificación. | Se abre una ventana/pestaña nueva en `/room/:roomId`. |
| S5 | B envía un DM a A. Click en la notificación. | Título `🔒 <usuario>`, cuerpo opaco; navega a `/dm/:conversationId`. |
| S6 | A está en la URL exacta del chat (`/room/:roomId`). B envía otro mensaje. Antes del click: `window.__qaMarker='alive'`. Click. | Solo se enfoca la pestaña; URL sin cambios; `window.__qaMarker` sigue `'alive'` (no hay recarga); sin pestaña duplicada. **Caso central del bug #45.** |
| S7 | A está en `/room/:roomId/` (slash final). B envía otro mensaje. Click. | Solo se enfoca; no recarga; sin duplicado (tolerancia de slash final). |
| S8 | Revocar el permiso de notificaciones (o cuenta nueva que deniega). Abrir Profile. | Badge **Blocked** / **Bloqueadas** / **محظورة** / **Bloquées** según idioma; mensaje explicativo; el toggle no queda muerto. |
| S9 | Si el navegador tenía `sw-1`: Application → Service Workers → **Update** (o `registration.update()`), recargar; repetir S1 y S6. | El SW activo pasa a `sw-2`; S6 sigue pasando. Valida la actualización real de usuarios con el SW viejo. |
| S10 | Negativo: llega una notificación y **no** se clickea; después llega otra con target distinto y se clickea. | La primera no navega nada; la segunda navega a **su** URL (sin cross-routing). |

### 6.4 Tabla de ejecución (rellenar a mano; **vacía = no ejecutada**)

| ID | Navegador + versión | Fecha | Paso | Resultado esperado | Resultado real (Staff) | Captura (enlace) |
|----|---------------------|-------|------|--------------------|------------------------|------------------|
| C1 | Chrome ________ | ____-__-__ | S1 | `sw-2` en el ping | | |
| C2 | Chrome ________ | ____-__-__ | S2 | Badge On + permiso | | |
| C3 | Chrome ________ | ____-__-__ | S3 | Navega a `/room/:id` sin duplicar | | |
| C4 | Chrome ________ | ____-__-__ | S4 | Abre ventana nueva en `/room/:id` | | |
| C5 | Chrome ________ | ____-__-__ | S5 | Navega a `/dm/:id`, cuerpo opaco | | |
| C6 | Chrome ________ | ____-__-__ | S6 | Solo foco, sin recarga, marker vivo | | |
| C7 | Chrome ________ | ____-__-__ | S7 | Solo foco con slash final | | |
| C8 | Chrome ________ | ____-__-__ | S8 | Badge Blocked localizado | | |
| C9 | Chrome ________ | ____-__-__ | S9 | Update a `sw-2` y S6 OK | | |
| C10 | Chrome ________ | ____-__-__ | S10 | Sin navegación cruzada | | |
| F1 | Firefox ________ | ____-__-__ | S1 | `sw-2` en el ping | | |
| F2 | Firefox ________ | ____-__-__ | S2 | Badge On + permiso | | |
| F3 | Firefox ________ | ____-__-__ | S3 | Navega a `/room/:id` sin duplicar | | |
| F4 | Firefox ________ | ____-__-__ | S4 | Abre ventana nueva en `/room/:id` | | |
| F5 | Firefox ________ | ____-__-__ | S5 | Navega a `/dm/:id`, cuerpo opaco | | |
| F6 | Firefox ________ | ____-__-__ | S6 | Solo foco, sin recarga, marker vivo | | |
| F7 | Firefox ________ | ____-__-__ | S7 | Solo foco con slash final | | |
| F8 | Firefox ________ | ____-__-__ | S8 | Badge Blocked localizado | | |
| F9 | Firefox ________ | ____-__-__ | S9 | Update a `sw-2` y S6 OK | | |
| F10 | Firefox ________ | ____-__-__ | S10 | Sin navegación cruzada | | |

**Criterio de aprobación manual:** S1, S3–S7 y S9 en verde en **ambos** navegadores; S8 y S10 como comprobaciones negativas. Cualquier FAIL debe adjuntar captura, versión exacta y hora. Sin esta tabla rellena **no** hay QA funcional de Task 22.

---

## 7. Bugs nuevos, hallazgos y riesgos

### 7.1 Bugs funcionales nuevos

**Ninguno.** No se encontró un defecto en el fix de `notificationclick` sobre `d6608d9`: el routing, el fallback y la tolerancia de slash funcionan en harness, sonda y entrega headless.

### 7.2 Hallazgos (no bloqueantes del merge del fix)

| ID | Severidad | Hallazgo | Acción |
|----|-----------|----------|--------|
| F1 | **P2 test** | El harness no cubre target con hash ni target con query (solo query extra en el cliente). La regla “search/hash exactos” queda sin CI. | FE: añadir los 6 tests de §3.2 en un follow-up. |
| F2 | **P3 comentario** | El comentario del SW dice “tolerate query/hash differences”, pero el código exige igualdad exacta cuando el target los lleva. | Corregir el comentario (no el código). |
| F3 | **P2 entorno** | Ningún despliegue actual tiene el fix: prod sirve `sw-1`; staging sirve HTML en `/sw.js`. | Staff/DevOps: desplegar `d6608d9` en `chatti-web-staging` antes de la prueba manual. |
| F4 | **P3 robustez** | `new URL(targetRaw, scope)` está fuera de `try/catch` y no hay allowlist de esquema: un `data.url` malformado lanzaría y cerraría la notificación sin navegar; `javascript:`/`data:` se pasan a `openWindow`/`navigate`. En el sandbox no se pudo validar el rechazo por esquema (`openWindow` rechazó tanto `javascript:` como `https:` por falta de activación). | Endurecer en un follow-up: validar `http(s)` + `try/catch`. Riesgo bajo: el payload lo controla el backend. |
| F5 | **P3 contrato** | El `parsePushPayload` del SW descarta `conversationPartnerId`/`timestamp`; el shared los conserva. | Unificar si se usan al click; hoy no afecta. |

### 7.3 Riesgos residuales

- **Click real sin verificar:** el headless no puede enfocar ventanas; la única evidencia del click es el harness + la sonda. La prueba manual es obligatoria.
- **Producción stale:** `chatti-web` sirve `sw-1`; los usuarios reales siguen con el bug hasta que el fix llegue a `master` y se despliegue. No es un fallo del PR, pero sí un riesgo de expectativas: probar en prod hoy daría FAIL y no probaría este fix.
- **Staging sin SW:** el staging actual responde HTML para `/sw.js`; si Staff prueba ahí sin redesplegar, el SW no se registra y la prueba no es válida.
- **Actualización de SW en clientes existentes:** `skipWaiting` + `clients.claim` ayudan, pero un usuario con `sw-1` puede necesitar una recarga/Update. S9 lo cubre.
- **Dependencia de VAPID/push service:** la entrega real depende de los secrets VAPID y de FCM/Mozilla; no se revalidó el envío worker→push service en esta sesión (fuera de alcance). El endpoint y los secrets ya se verificaron en QA 2026-09-21.
- **Fan-out de salas:** `listKeysPaginated` está probado, pero no hay test end-to-end de `sendWebPushNotificationsToOfflineUsers`; el call site se verificó por grep. La acotación por membresía de sala sigue siendo mejora futura (documentada en PR #44).
- **Badge “Blocked”:** el test i18n valida las 4 cadenas, no el render del componente; no hay test DOM de `ProfilePage`.

---

## 8. Invariantes PR #44 (regresión sobre `d6608d9`)

### 8.1 Fan-out paginado

- `backend/src/WebPush.js` L407: `listKeysPaginated(env, prefix, limit=1000)` con `do/while` sobre `cursor` y `list_complete`.
- Call sites: `ChatRoom.js` L491 (fan-out de salas), `WebPush.js` L420 (`listWebPushSubscriptions`), L436 (`deleteWebPushSubscriptions`).
- `ChatRoom.js` L489–520 sigue filtrando `user:*:webpush:*`, excluyendo al remitente y a conectados, y purgando `410 Gone`.
- Tests backend sobre `d6608d9`: **29/29** (2 files), incluidos **2/2** de `listKeysPaginated` (multi-página y página única vacía). Los 4 tests extra respecto al head `7087b1b` vienen de BE-AUTH-CLOSE (#56).
- Nota: no hay test de integración del fan-out completo; el helper y el call site están cubiertos/verificados, no el recorrido E2E.

### 8.2 Badge “Blocked” en en/es/ar/fr

- `shared/i18n/translations.ts`: `statusBlocked` en L227 (`Blocked`), L481 (`Bloqueadas`), L716 (`محظورة`), L951 (`Bloquées`).
- `web/src/features/profile/ProfilePage.tsx` L190–193 mapea `webPushState === 'blocked'` → `statusBlocked`.
- Test `shared/i18n/translations.test.ts` “webPush statusBlocked is present in all languages (P3 QA 2026-09-21)” **PASS** (dentro de 119/119).
- Limitación: valida las cadenas, no el render DOM del badge.

---

## 9. Delta de estado (para CTO-STATUS-SYNC; no editado aquí)

- **Task 22 / GitHub #45:** sigue en **QA / IN PROGRESS**. QA técnica sobre `dev` `d6608d9`: PASS; entrega real en navegador: pendiente; sign-off CTO/Staff: pendiente. **No DONE.**
- **PR #57:** mergeado en `dev` (`2d7d798`), head `7087b1b`; checks CI verdes; sin reviews formales registradas. Verificado sobre el árbol mergeado `d6608d9`.
- **PR #56 / BE-AUTH-CLOSE:** mergeado en `dev` (`d6608d9`); sus 4 tests extra pasan en la suite backend 29/29. La validación funcional de BUG-01 sigue fuera de este informe.
- **BUG-01:** sin cambios en este informe.
- **Despliegues:** ninguno realizado por este agente. Producción sigue en `sw-1`; staging no sirve `/sw.js`; se requiere despliegue de staging para la prueba manual.

---

## 10. Evidencia y reproducibilidad

| Evidencia | Ubicación / comando |
|-----------|---------------------|
| Base mergeada | `git fetch origin --prune`; `git rev-parse origin/dev` → `d6608d9…` |
| Merges | `git log -1 2d7d798` (padres `2a331a7` + `7087b1b`); `git log -1 d6608d9` (padres `2d7d798` + `1c0b8b3`) |
| Diff web/shared | `git diff 7087b1b..d6608d9 -- web shared` → vacío |
| Gates web | `cd web && pnpm typecheck && pnpm lint && pnpm test && pnpm build` |
| Resumen tests web | `Test Files 9 passed (9)` / `Tests 119 passed (119)` |
| `dist/sw.js` | `sha256sum web/dist/sw.js web/public/sw.js` → `2bc71fdc…`; `cmp` idénticos |
| Harness | `cd web && pnpm vitest run --reporter=verbose` (9/9 del archivo) |
| Sonda hash/query | script `vm` sobre `web/public/sw.js` de `d6608d9` (resultados en §3.3; no commiteado) |
| CDP delivery | Chrome 156 headless, `web/dist` de `d6608d9`, `ServiceWorker.deliverPushMessage`; resultados en §5.2 |
| Backend | `cd backend && pnpm test` → `Test Files 2 passed (2)` / `Tests 29 passed (29)` |
| Estado de despliegues | `curl` a `/sw.js` de prod y staging (§6.1) |
| Worktree | `git status --short` → solo `.mece/cells/QA-WAVE-2/WEBPUSH-PRE-MERGE.md` sin trackear |

No se adjuntan capturas de la prueba manual porque **no se ejecutó**; la tabla §6.4 es el instrumento para que Staff las aporte.

---

## 11. Conclusión

El fix de `notificationclick` está técnicamente listo sobre el árbol mergeado de `dev` (`d6608d9`): gates verdes, `dist/sw.js` con `sw-2` y fallback, harness 9/9, paridad de contrato 7/7, entrega push real headless 5/5 con `data.url` correcto y sin excepciones, e invariantes de PR #44 intactos (backend 29/29, badge en 4 idiomas). Queda un **gap de cobertura de tests** (hash/query en el target) que no bloquea el merge del fix pero debe cerrarse antes de declarar Task 22 DONE, y queda la **prueba manual real** en Chrome/Firefox, que además requiere desplegar primero `d6608d9` en staging porque ni producción (`sw-1`) ni el staging actual (HTML en `/sw.js`) lo contienen.

Esta es la QA sobre el SHA mergeado de `dev` `d6608d9`; no se sustituye por la evidencia del head `7087b1b`, aunque los paths de Web Push sean idénticos.

Task 22 QA sobre dev mergeado d6608d9 PASS pending real-browser delivery
