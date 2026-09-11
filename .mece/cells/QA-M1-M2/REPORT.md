# QA-M1-M2 — informe de cierre

## Base y trazabilidad

- **Base verificada:** `master` en `a2d5c657c528bf97626bf604b1c0f392d024a178`.
- **Sesión OpenCode:** `ses_f6e6091ddffeAA30Wfsfah5L7J`.
- **Alcance:** sólo lectura, salvo este archivo; no se hizo commit.
- **Aislamiento:** el árbol de trabajo contenía cambios sin integrar de la célula
  `FE-M1-CLOSE` en conversaciones/perfil. No se usaron para afirmar resultados de
  esta QA: las comprobaciones de implementación se hicieron contra el SHA base.
- **Cierre anticipado autorizado:** no se repitieron comprobaciones que requieren
  auth/backend ni se intentaron flujos sin sesión existente o sesión móvil.

## Scripts válidos y evidencia disponible

`web/package.json` declara `typecheck`, `lint`, `test` y `smoke`.

| Script/superficie | Estado | Evidencia |
| --- | --- | --- |
| `npm run typecheck` | **PASS** | La comprobación independiente previa de la misma base, registrada en `.mece/SYNTHESIS.md`, pasó. |
| `npm run lint` | **PASS** | La comprobación independiente previa de la misma base, registrada en `.mece/SYNTHESIS.md`, pasó. |
| `npm run test` | **PASS** | La comprobación independiente previa de la misma base, registrada en `.mece/SYNTHESIS.md`, pasó: 6 archivos / 85 pruebas. |
| `npm run smoke` | **NOT RUN** | Depende de registro/login contra el Worker y crea cuentas efímeras. BUG-01 es un bloqueo conocido de auth (503/1102) y se ordenó no reintentar backend. |

## M1

| Superficie | Estado | Evidencia / límite |
| --- | --- | --- |
| Contactos: lista, alta `username#disc`, aceptar/rechazar y badge pendiente | **NOT RUN** | El flujo está implementado en `web/src/features/contacts/ContactsPage.tsx` (carga de lista/solicitudes, validación `#`, `sendContactRequest`, aceptar/rechazar y `pendingCount`). Requiere dos sesiones autenticadas; no se disponía de ellas. |
| Perfil: logout | **PASS** | En el SHA base, `web/src/features/profile/ProfilePage.tsx` expone el botón que invoca directamente `onLogout`. |
| Perfil: copiar device ID | **PASS** | En el SHA base, el mismo archivo usa `navigator.clipboard.writeText(user.deviceId)` y confirma el copiado. |
| Perfil: idioma y borrado de cuenta (Task 12) | **NOT RUN — ausente** | **Task 12 no está todavía en este SHA.** `ProfilePage.tsx` sólo contiene tarjeta, copy de device ID y logout; no hay selector de idioma ni control de delete-account. |
| BUG-02: listeners tras reconexión de DM | **PASS — FIXED** | `shared/ws/DirectMessageSocket.ts` reemplaza el socket sin limpiar listeners en `connect()`; el test de regresión existente `web/scripts/reconnect-probe.test.ts` cubre mensaje posterior a reconexión. |
| BUG-04: DM entrante actualiza `lastSeen` | **PASS — FIXED** | Conservado como corregido en la evidencia de estabilización de esta base; la lista usa `lastSeenKey(user.userId)` y el estado de `lastSeen` para el indicador de no leído en `web/src/features/conversations/ConversationsPage.tsx`. |
| BUG-06: búsqueda vacía localizada | **PASS — FIXED** | La vista usa `t('usersList.emptySearch')` para el texto y subtítulo de búsqueda vacía en `web/src/features/conversations/ConversationsPage.tsx`. |
| BUG-01: registro/login en vivo | **BLOCKED** | **Severidad: BLOCKER.** Rutas afectadas: Worker externo `https://chatti-workers.wz0un.workers.dev` (registro/login). El 503/1102 intermitente está documentado como residual de la base; no se reintentó por la instrucción de cierre. |

## M2

| Superficie | Estado | Evidencia / límite |
| --- | --- | --- |
| Lista y creación de sala | **NOT RUN** | `web/src/features/rooms/RoomsPage.tsx` contiene `listRooms` y `createRoom`, pero el flujo requiere backend y una sesión autenticada. |
| Sala: join, enviar/recibir, typing, presencia, mensajes join/leave y reconexión | **NOT RUN** | `web/src/features/rooms/RoomChatPage.tsx` registra handlers para `connected`, `history`, `message`, `typing`, `user_list`, `user_joined` y `user_left`; `shared/ws/RoomSocket.ts` implementa reconexión. No hubo sesión existente para validarlo en vivo. |
| Interop web/móvil de salas | **NOT RUN** | No había sesión móvil disponible. El test existente `web/scripts/interop-mobile.test.ts` cubre criptografía web↔móvil, no interop funcional de salas. |

## Bugs nuevos y riesgos residuales

- **Ningún bug nuevo confirmado.** Los flujos de contactos y salas no se ejecutaron de extremo a extremo, por lo que esta conclusión no equivale a una aprobación funcional de backend.
- **BUG-01 — BLOCKER, externo:** 503/1102 de auth impide crear/restaurar la sesión necesaria para QA en vivo.
- **Task 12 — gap conocido, `web/src/features/profile/ProfilePage.tsx`, severidad media:** ausente en el SHA auditado; no se registra como regresión nueva.
- **Riesgo alto:** las operaciones de salas (incluida reconexión) sólo tienen evidencia estática en esta pasada; faltan dos clientes autenticados para validación real.
- **Riesgo medio:** la interop de salas web/móvil no se pudo ejecutar sin una sesión móvil.

M2 not ready

---

## Phase B delta

- **Fecha:** 2026-09-11.
- **Sesión OpenCode:** `01a09196-b587-7cb2-98ae-76ecf9f6465f`.
- **Alcance:** validación del delta FE sin integrar (sólo lectura). No se re-ejecutó M1/M2; el informe Phase A y su veredicto `M2 not ready` se conservan intactos arriba. No hubo escrituras de backend, ni borrado de cuenta real.
- **Base:** misma que Phase A (`a2d5c657c528bf97626bf604b1c0f392d024a178`), trabajando sobre el árbol con cambios sin hacer commit.

### Delta producto cubierto

Sólo 4 archivos del delta FE (confirmado con `git status`): `web/src/features/profile/ProfilePage.tsx`, `web/src/features/profile/profile.css`, `web/src/features/conversations/ConversationListItem.tsx`, `web/src/features/conversations/conversations.css`.

### Evidencia de comandos (ejecutada ahora, no mutante)

| Script | Estado | Resultado |
| --- | --- | --- |
| `npm run typecheck` | **PASS** | `tsc -b --pretty false` sin errores. |
| `npm run lint` | **PASS** | `eslint .` sin errores. |
| `npm run test` | **PASS** | 6 archivos / 85 pruebas; mismo baseline que Phase A. Ninguna regresión. |
| `npm run smoke` | **NOT RUN** | Escribe en backend (registro/login en vivo); prohibido en este delta. |

### Task 12 — Perfil (idioma + borrado de cuenta)

| Criterio | Estado | Evidencia |
| --- | --- | --- |
| Selector en/es/ar/fr | **PASS** | `LANGUAGE_OPTIONS` con en/es/ar/fr, `ProfilePage.tsx:21-26`; flags + etiquetas endónimas. |
| Cambio inmediato de idioma | **PASS** | `handleLanguageChange` llama `setLanguage` (`ProfilePage.tsx:57-59`); `I18nProvider.setLanguage` hace `setLanguageState(next)` síncrono antes de persistir (`web/src/lib/i18n.tsx:33-36`). |
| Persistencia por la ruta i18n existente (`chatti_language`) | **PASS** | `storage.setItem(STORAGE_KEYS.language, next)` (i18n.tsx:35); `STORAGE_KEYS.language = 'chatti_language'` (`shared/storage/StorageAdapter.ts:18`), misma clave que móvil. |
| El botón confirma el borrado | **PASS** | `window.confirm(t('profile.deleteMessage'))` (`ProfilePage.tsx:62`); la clave existe en en/es/ar/fr. |
| Envía el par userId/deviceId vía `ApiService.deleteAccount` | **PASS** | `ApiService.deleteAccount(user.userId, user.deviceId)` (`ProfilePage.tsx:67`); payload `{ userId, deviceId }` (`shared/api/ApiService.ts:348-351`). |
| Logout sólo tras éxito | **PASS** | `await onLogout()` dentro del `try`, después del `await` del API (`ProfilePage.tsx:68`); logout real en `App.tsx:54-57` (`authService.logout()`). |
| Deshabilitado mientras está pendiente | **PASS** | `setDeleting(true)` antes de la petición y `disabled={deleting}` (`ProfilePage.tsx:64,125`). |
| Renderiza fallo de API | **PASS** | `catch` → `setDeleteError(t('profile.deleteError'))` y `<p className="profile__deleteError">` (`ProfilePage.tsx:69-72,129`). |

### BUG-03 — Borrado de conversación

| Criterio | Estado | Evidencia |
| --- | --- | --- |
| Visible en touch | **PASS** | `@media (hover: none) { .conv-item__delete { opacity: 1 } }` (`conversations.css:140-144`). |
| Visible en hover/focus de escritorio | **PASS** | `.conv-item:hover .conv-item__delete, .conv-item:focus-within .conv-item__delete { opacity: 1 }` (`conversations.css:131-134`). |
| Alcanzable por teclado | **PASS** | Control nativo `<button type="button">` (`ConversationListItem.tsx:134-145`), tabulable; `:focus-within` del ítem lo revela al recibir foco. |
| Etiqueta accesible | **PASS** | `aria-label` + `title` con `t('conversations.deleteTitle')` (`ConversationListItem.tsx:137-138`). |
| Conserva la confirmación vía `onDelete` | **PASS** | El botón llama `onDelete()` (`ConversationListItem.tsx:141`); en el padre, `deleteConversation` confirma con `window.confirm(t('conversations.deleteMessage'))` antes del API (`web/src/features/conversations/ConversationsPage.tsx:161-176`). `stopPropagation` evita que la pulsación abra el chat. |

### Verdict (delta)

`M1 blocked on BUG-01`

El delta FE (Task 12 + BUG-03) está **PASS** en las 13 comprobaciones. El bloqueo para la totalidad de M1 sigue siendo **BUG-01** (auth en vivo 503/1102, BLOCKER externo, documentado en Phase A; no se reintentó). `M2 not ready` de Phase A no se re-evalúa.

### Riesgos residuales

- **Sólo estático:** idioma y borrado de cuenta se verificaron por inspección, no por interacción DOM en vivo; no se realizó un borrado de cuenta real (prohibido). Las claves i18n de perfil/delete existen en las 4 locales.
- **Precondición no reseculada (baja):** `ApiService.deleteAccount` devuelve `data.success === true` y sólo lanza en `!response.ok`; un 200 con `success:false` (si el backend lo emitiera) no lanzaría y el FE haría logout igualmente. Es el mismo contrato compartido que el móvil (`src/services/ApiService.js` `deleteAccount`) y otras rutas; preexistente, no introducido en este delta.
- **Menor:** la ruta de éxito del delete no resetea `deleting` antes del logout; inofensivo porque el logout desmonta la página.
- **Menor:** no hay focus ring CSS propio para `.conv-item__delete`; se usa el outline por defecto del navegador.
- **Task 12 en producción** sigue dependiendo de BUG-01 para validación en vivo con sesión autenticada.
