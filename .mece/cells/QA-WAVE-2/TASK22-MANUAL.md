# Task 22 — prueba manual en navegador real (extracto de evidencia)

**Fecha:** 2026-11-09, 00:01–00:14 CET
**Ejecutor:** agente Antigravity (Chrome real) + observación del Staff
**Entorno:** Chrome 157.0.8103.38, Linux Wayland, perfil `/tmp/chrome-devtools-profile`
**Sitio:** https://chatti-web.wz0un.workers.dev (producción, `sw-2`)
**Cuentas:** A = `push_user_a#0001` (`user_1794178945161_1p4puuvkb`); B = `push_user_b#0001`

Este fichero es un extracto legible de artefactos volátiles en `/tmp`; no contiene secretos.

## 1. Notificación mostrada (Platform Notifications)

Origen: `/tmp/chrome-devtools-profile/Default/Platform Notifications/000003.log`

| Campo | Valor |
|---|---|
| Origen | `https://chatti-web.wz0un.workers.dev/` |
| Título | `💬 push_user_b#0001` |
| Cuerpo | `Hola User A! Prueba Web Push en vivo!` |
| Tag | `room-poklx599` |
| Icono | `https://chatti-web.wz0un.workers.dev/icons/chatti-icon-192.png` |
| Payload | `"url":"/room/poklx599"`, `{"kind":"room","roomId":"poklx599"}` |
| Registros | 3 (reintentos del mismo push) |

## 2. Sesión del usuario A (Local Storage)

Origen: `/tmp/chrome-devtools-profile/Default/Local Storage/leveldb/`

```
userData = {
  "username": "push_user_a",
  "discriminator": "0001",
  "fullUsername": "push_user_a#0001",
  "deviceId": "device_1794178944956_267576622_yyaf2hoig",
  "userId": "user_1794178945161_1p4puuvkb"
}
```

## 3. Suscripción push (Service Worker DB)

Origen: `/tmp/chrome-devtools-profile/Default/Service Worker/Database/000003.log`

```
REG: https://chatti-web.wz0un.workers.dev/
     https://chatti-web.wz0un.workers.dev/sw.js
push_registration_id
```

## 4. Historial de navegación (visits)

Origen: `/tmp/chrome-devtools-profile/Default/History`

| Hora local | URL | Transición |
|---|---|---|
| 00:01:41 | `/login` | TYPED + FROM_API |
| 00:02:28 | `/` → `/rooms` → `/profile` | TYPED + FROM_API |
| 00:03:55 | `/contacts` | TYPED + FROM_API |
| 00:06:54 | `/chats` | TYPED + FROM_API |
| 00:06:55 | `/rooms` | TYPED + FROM_API |
| 00:07:50 | `/profile` | TYPED + FROM_API |
| 00:10:07 | `/room/poklx599` | TYPED + FROM_API |
| 00:10:10 | `/dm/dm_vlgjbo_v2` | TYPED + FROM_API |
| 00:10:23 | `/profile` | TYPED + FROM_API |
| **00:10:28** | **`/room/poklx599`** | **LINK** |
| 00:10:37 | `/dm/dm_vlgjbo_v2` | TYPED + FROM_API |
| 00:11:25 | `/chats` | LINK |
| 00:11:26 | `/dm/dm_vlgjbo_v2` | LINK |
| 00:14:12 | `/profile` | LINK |
| 00:14:24 | `/dm/dm_vlgjbo_v2` | LINK |

La visita `LINK` a `/room/poklx599` de las 00:10:28 es posterior al registro de la notificación (00:10) y es consistente con un clic, pero **no se puede atribuir con certeza** al clic de la notificación.

## 5. Veredicto

| Paso §9.6 | Estado |
|---|---|
| 1. Login A | ✅ PASS |
| 2. Enable notifications | ✅ PASS |
| 3–4. Entrega de la notificación | ✅ PASS (Staff lo observó) |
| 5. Clic → deep link | ⚠️ NO CONFIRMADO |
| 6. Permiso denegado → bloqueado | ❌ NOT RUN |

**Task 22:** `IN PROGRESS (no DONE)`.
