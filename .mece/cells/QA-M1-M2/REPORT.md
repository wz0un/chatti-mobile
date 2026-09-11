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
