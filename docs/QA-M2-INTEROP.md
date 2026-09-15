# QA M2 — Interop web ⇄ móvil EN VIVO (mohsine#0001)

Fecha: 2026-09-15. Backend prod `chatti-workers.wz0un.workers.dev`.
Peer móvil real: **mohsine#0001** (`user_1773398798797_i2krddvhm`), desde la app en su teléfono.
Probe: `web/scripts/m2-live-interop.test.ts` (fases `setup`/`observe`, config `scripts/m2live.vitest.config.ts`).

## Setup (lado web, usuario desechable)

- Web user: `m2webmu2yaa75#0001` (`user_1789493599438_mtbp488p3`)
- Sala creada: **`m2webmu2yaa75-sala`** (`2iq2txdp`), unida por WS real, bienvenida enviada ✓
- DM cifrado web→móvil creado (`dm_9ncpeb_v2`) y enviado ✓
- Solicitud de contacto web→móvil: **FALLÓ** — backend `Recipient user not found` (ver hallazgo 4)

## Evidencia capturada en vivo (lado web observando)

| # | Evento | Origen | Resultado |
|---|--------|--------|-----------|
| 1 | DM `hi` (`senderId=user_1773398798797_i2krddvhm`, el id registrado de mohsine) | móvil → web | ✅ PASS |
| 2 | `user_joined` mohsine#0001 en sala, `totalUsers: 2` | móvil → web | ✅ PASS |
| 3 | `typing isTyping:true` ×8 → mensaje **`hola`** → `isTyping:false` | móvil → web | ✅ PASS |
| 4 | Bienvenida web visible en sala + DM cifrado enviado | web → móvil | ✅ PASS (el reply "hi" en el DM lo confirma) |

Logs: `/tmp/chatti-qa/m2-observe2.log` (DM + join), `/tmp/chatti-qa/m2-observe3.log` (typing + "hola").
Estado: `/tmp/chatti-qa/m2-live.json`.

## Hallazgos

1. **M2 rooms web⇄móvil: PASS.** Join, presencia (`totalUsers`), typing y mensajes en ambas direcciones con el móvil real.
2. **DM móvil→web: PASS** ("hi" recibido y legible). DM web→móvil cifrado enviado; el reply en el mismo hilo confirma recepción.
3. **Mobile bug #5 confirmado en vivo:** el móvil entra a la sala con `userId` efímero por conexión
   (`user_1789493965894_9rudm7g9z`, luego `user_1789494202884_yl1kre4nr`), username siempre `mohsine#0001`.
   El `RoomSocket` web usa correctamente el id registrado. Sin impacto funcional hoy, pero rompe
   cualquier lógica futura atada a `userId` de sala.
4. **Backend — inconsistencia users/find vs by-device-id (nuevo, para BE):**
   `GET /api/users/find?username=mohsine#0001` devuelve `deviceId=device_1772489247332_…`,
   pero `GET /api/users/by-device-id?deviceId=<ese>` → **404**, y
   `POST /api/contacts/request` con ese deviceId → **"Recipient user not found"**.
   La solicitud de contacto web→móvil **no se entregó**. Hipótesis: deviceId stale en la fila del
   usuario (re-login con device nuevo sin migrar la fila). Requiere investigación BE.
5. **Salas efímeras sin persistencia:** `room/info` → `ephemeral:true`, `GET messages` → `[]` siempre.
   El interop en vivo funciona con ambos conectados; sin historial REST que lo respalde.

## Veredicto

- **M2 rooms + DM web⇄móvil contra usuario real: PASS** (único pendiente: reintentar contacto cuando BE
  corrija el hallazgo 4).
- Nota de harness: el reporter `verbose` es obligatorio para ver stdout en vivo (`default` lo oculta
  en runs que pasan); el observe debe correrse en background + poll del log para interactuar de verdad.
