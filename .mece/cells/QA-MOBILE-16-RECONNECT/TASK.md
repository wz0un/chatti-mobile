# QA-MOBILE-16-RECONNECT — Validación funcional de #16

## Objetivo

Validar en el teléfono Android conectado que la reconexión WebSocket conserva el `userId` de la sala y que una salida manual impide reintentos tardíos, conforme al bug documentado #16. El artefacto candidato es el código de `src/services/ChatService.js` presente en esta rama; no crear commits, pushes, PRs ni cambios de estado en GitHub/Trello.

## Aplicación y entorno

- Paquete de QA separado: `com.chatti.mobile.qa`; no actualizar ni desinstalar `com.chatti.mobile`.
- Dispositivo: teléfono físico autorizado por ADB. Registrar modelo/versión Android, sin publicar el número de serie.
- ADB del usuario: `/home/mohsine/.local/share/opentester/android-tools/usr/bin/adb` (no está en `PATH`). Modelo detectado: `M2102J20SG`, Android 12; el perfil Xiaomi `XSpace` es el usuario Android `999`.
- `com.chatti.mobile` está instalado tanto para el perfil propietario `0` como para el clon Xiaomi `999`; instalar y operar el paquete QA solo en `999`.
- Comprobación Staff (2026-11-18): paquete instalado y visible en ADB; Android 12, `versionName=1.0.0`, `versionCode=4`, instalación/actualización `2026-11-18 13:00:50`.
- No hay evidencia aún de que el APK instalado se haya compilado desde esta rama y contenga el diff candidato. Verificarlo antes de atribuir cualquier resultado al fix.
- Backend: solo Worker local en `127.0.0.1:8788`, accesible desde el teléfono mediante `adb reverse tcp:8788 tcp:8788`. No contactar el Worker de producción ni desplegar.
- Flujo de prueba previsto: entrar en una sala, desconectar temporalmente la red, observar reconexión automática y comprobar que el mismo `userId` vuelve a unirse; luego salir de la sala con un retry pendiente y confirmar que no hay reconexión ni reingreso tardío.

## Autorización Staff para build local

- El Staff autorizó expresamente el 2026-11-18 instalar JDK y Android SDK en el espacio de usuario, aceptar las licencias Android, compilar `com.chatti.mobile.qa` y probarlo en XSpace únicamente contra el Worker local en el puerto `8788`.
- Tras el bloqueo `INSTALL_FAILED_USER_RESTRICTED`, el Staff autorizó expresamente activar temporalmente el toggle MIUI `Install via USB` para permitir esa instalación. Registrar su estado inicial y restaurarlo exactamente al finalizar; no activar otros toggles ni usar/solicitar SIM o cuenta Mi. Si aparece otro requisito, detener la instalación y reportarlo.
- Mantener intactos `app.json` y la configuración de producción. Para el applicationId y URL local se permite usar una configuración Expo temporal o una copia de build aislada; retirar la configuración temporal al terminar.
- Instalar solo el paquete QA para el usuario Android `999`. No borrar datos de ninguna app existente ni desinstalar/reemplazar `com.chatti.mobile`.
- Mantener todos los agentes y sesiones de ejecución bajo T3 Code; no iniciar OpenCode directamente.

## Criterios

1. Un retry automático vuelve a unirse con el mismo `userId` que el `join` inicial.
2. `disconnect()` manual cancela un retry pendiente y un callback tardío de `close` no inicia otro.
3. Un socket obsoleto no puede interferir con una conexión nueva.
4. Entrada, reconexión, salida y mensajería normal siguen funcionando sin duplicar eventos.

## Límites de privacidad y estado

- No llamar `generate_tests`: la implementación actual borra los datos de la app antes de iniciar.
- No llamar `validate_test`: el runner puede enviar capturas y árbol de accesibilidad al backend remoto configurado.
- No enviar capturas, árbol de accesibilidad, contenido de pantalla, credenciales ni logs con datos personales a servicios externos.
- No borrar los datos de ninguna app ni ejecutar `pm clear`/factory reset.
- No activar/desactivar modo avión, Wi-Fi ni datos móviles: la conectividad es compartida entre los perfiles y afectaría al teléfono original. Si no se puede provocar una caída del WebSocket solo para el clon y contra un backend local de QA, dejar ese criterio como NOT COVERED y pedir autorización antes de cualquier interrupción global.
- Está autorizado instalar JDK/Android SDK user-local y aceptar licencias para esta build QA. No instalar software del sistema. La única excepción de configuración del dispositivo es el toggle temporal `Install via USB`, con registro del estado previo y restauración inmediata al finalizar; no cambiar otras opciones globales.
- Para simular pérdida del WebSocket, detener/reiniciar únicamente el Worker local; no activar/desactivar modo avión, Wi-Fi ni datos móviles.
- No ejecutar `wrangler deploy`, `expo publish`, ni enviar solicitudes al Worker remoto.
- Se permiten consultas ADB y validación funcional manual en el perfil `999` con el paquete `com.chatti.mobile.qa`.

## Entregable

Actualizar `REPORT.md` con comandos y evidencia observada, criterios PASS/FAIL/NOT COVERED, bloqueos y si procede o no el QA sign-off. Si falta app instalada, build local, runtime o backend, detenerse sin alterar el entorno y registrar BLOCKED. No marcar la tarea DONE: requiere QA funcional y aprobación CTO/Staff.
