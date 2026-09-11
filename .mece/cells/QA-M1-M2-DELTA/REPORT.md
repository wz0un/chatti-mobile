# QA-M1-M2-DELTA — informe de cierre (Phase B delta)

- **Base:** `master` en `a2d5c657c528bf97626bf604b1c0f392d024a178` (workspace con delta sin integrar: `web/src/features/conversations/ConversationListItem.tsx`, `conversations.css`, `web/src/features/profile/ProfilePage.tsx`, `profile.css`).
- **Alcance:** sólo lectura; no se editaron productos, docs, estado Git, ni el informe de Phase A. No se hizo commit. No se ejecutó ninguna destrucción ni escritura de backend.
- **Sesión OpenCode:** `ses_f6e4fa590ffeEpIXjC3QqiexWM`.
- **Evidencia de comandos (independiente, reproducida en esta pasada):**
  - `npm run typecheck` → **PASS** (sin errores, `web/`).
  - `npm run lint` → **PASS** (sin errores, `web/`).
  - `npm test` → **PASS** — 6 archivos / **85 pruebas** (`vitest run`).

## 1. Task 12 — `ProfilePage` (idioma + delete-account)

| Ítem | Estado | Evidencia |
| --- | --- | --- |
| Ofrece en/es/ar/fr | **PASS** | `LANGUAGE_OPTIONS` = `en, es, ar, fr` en `web/src/features/profile/ProfilePage.tsx:21-26`. |
| Llama la ruta de persistencia `setLanguage` existente | **PASS** | `handleLanguageChange` invoca `setLanguage(...)` (`ProfilePage.tsx:57-59`) → `I18nProvider.setLanguage` (`web/src/lib/i18n.tsx:33-36`) guarda `STORAGE_KEYS.language` = `chatti_language` (`shared/storage/StorageAdapter.ts:18`) vía `LocalStorageAdapter`. |
| Refleja el estado i18n inmediatamente | **PASS** | `<select value={language}>` (`ProfilePage.tsx:98-109`); `setLanguage` hace `setLanguageState(next)` y el contexto memoriza en `[language]` (`i18n.tsx:38-46`), re-renderizando `t()` al instante. |
| Confirma el borrado de cuenta | **PASS** | `window.confirm(t('profile.deleteMessage'))` con early-return si se cancela (`ProfilePage.tsx:62`). |
| Llama `ApiService.deleteAccount(user.userId, user.deviceId)` | **PASS** | `ProfilePage.tsx:67`; firma existente en `shared/api/ApiService.ts:348` (`POST /auth/delete` con `{ userId, deviceId }`). |
| Logout sólo tras éxito | **PASS** | `await onLogout()` sólo se alcanza tras resolver `deleteAccount` (`ProfilePage.tsx:68`). |
| Deshabilita durante la petición | **PASS** | `disabled={deleting}` (`ProfilePage.tsx:126`), con `setDeleting(true)` antes del request. |
| Renderiza fallo de API | **PASS** | Catch → `setDeleteError(t('profile.deleteError'))` (`ProfilePage.tsx:69-73`), renderizado en `ProfilePage.tsx:129`. |

## 2. BUG-03 — Botón de eliminar conversación

| Ítem | Estado | Evidencia |
| --- | --- | --- |
| Botón real enfocable por teclado | **PASS** | `<button type="button">` nativo en `web/src/features/conversations/ConversationListItem.tsx:134-145` (focusable por defecto). |
| Etiqueta accesible | **PASS** | `aria-label` y `title` desde `t('conversations.deleteTitle')` (`ConversationListItem.tsx:137-138`). |
| Visible en hover/focus de escritorio | **PASS** | `conversations.css:131-134`: `.conv-item:hover .conv-item__delete, .conv-item:focus-within .conv-item__delete { opacity: 1; }`. |
| Visible en touch | **PASS** | `conversations.css:140-144`: `@media (hover: none) { .conv-item__delete { opacity: 1; } }`. |
| Llama `onDelete` existente y preserva confirmación | **PASS** | `onClick` → `onDelete()` (`ConversationListItem.tsx:139-142`) → `handleDelete` (`ConversationsPage.tsx:178-180`) → `deleteConversation` con `window.confirm(t('conversations.deleteMessage'))` (`ConversationsPage.tsx:161-176`). No se ejecutó la variante destructiva (confirm desestimado / sin llamada real). Context-menu sigue invocando `onDelete`. |

## Verdict

`M1 blocked on BUG-01`

## Nota sobre M2 (Phase A)

El veredicto de M2 de Phase A permanece **`M2 not ready`** y **no se re-evalúa** en esta pasada: sigue sin haber sesión/backend autenticado en vivo (BUG-01, 503/1102) para validar salas. Ver `.mece/cells/QA-M1-M2/REPORT.md`.

## Riesgos residuales

- **Bajo (delta):** el logout post-delete (`await onLogout()`) verificó sólo por inspección estática; el flujo real requiere backend autenticado. Si `onLogout` lanzara tras un delete-account exitoso, el catch mostraría `deleteError` pese a la cuenta ya borrada — caso extremo no ejercitado, no señalado como bloq de M1.
- **Medio (heredado de Phase A):** contactos y salas siguen sin ejecución de extremo a extremo; BUG-01 (auth 503/1102) es el bloqueo del veredicto M1.