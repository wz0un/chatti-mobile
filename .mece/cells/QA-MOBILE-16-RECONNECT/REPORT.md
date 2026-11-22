# QA-MOBILE-16-RECONNECT — Informe de QA funcional (P0 #16) — sesión con dispositivo físico

## Provenance and historical review copies

- El agente QA T3 ejecutó las comprobaciones y escribió este informe en su checkout registrado `/home/mohsine/Proyectos/chatti-mobile`, rama `bugfix/mobile-16-session-reconnect`.
- El informe se copió para revisión a la rama `bugfix/mobile-16-session-reconnect-android-qa`; esas rutas y ramas describen la procedencia de la evidencia, no el checkout actual.
- Esta copia quedó después incorporada a la rama documental del PR #68. No implica que el informe se haya integrado en la rama de implementación ni en `dev`.
- En el snapshot de ejecución del 2026-11-18, el `src/services/ChatService.js` observado en ambos worktrees tenía MD5 `43f4ed1bdf53e27edc44f3f56694ceb6`. Este dato es histórico, no una descripción del estado actual de esos worktrees.
- El informe conserva las rutas y fechas originales del ejecutor; esta copia solo cambia documentación.

- **Célula:** QA-MOBILE-16-RECONNECT (validación funcional de `.mece/cells/MOBILE-16-RECONNECT/`)
- **Issue:** GitHub #16 — `[P0] Preservar userId y estado de sesión durante la reconexión WebSocket` (leído en solo lectura; sin cambios de estado)
- **Sesión:** 2026-11-18, 13:02–13:10 CET (Europe/Madrid) — re-ejecución de la célula con teléfono Android conectado
- **Host:** Linux `7.2.15-1-omarchy` x86_64, Omarchy 4.5.0
- **Dispositivo:** Xiaomi `M2102J20SG` (producto `vayu_global`, ABI principal `arm64-v8a`), Android **12** (API 31, security patch 2022-02-01). Número de serie **omitido a propósito**.
- **Ámbito:** consultas ADB de solo lectura + inspección **local** del APK instalado. Sin commit/push/PR, sin tocar GitHub/Trello, sin desplegar, sin leer ni copiar secretos. No se ejecutó `generate_tests`, `validate_test`, `pm clear` ni ningún borrado de datos.
- **Restricciones adicionales (TASK actualizado, Staff):** prohibido conmutar modo avión, Wi-Fi o datos móviles (la conectividad es compartida entre los perfiles 0 y 999); ninguna interrupción global de conectividad; trabajo **exclusivo** con el perfil **999**. Ver §12.
- **ESTADO HISTÓRICO (§15, snapshot 2026-11-19; estado actual en §15.13): 🟢 QA PASS en (a–d)** sobre fuente SHA-256 `ddbc8af979ce94491d80297e5d0024dbda98c9307f1406bc93d0b22d58b4c457`, diff `4d1df4f339f60f11ed8dc3d43dd578c0fc01814840127a711ff2a23c7a716986` y APK QA `2868e8cbaeb4b89288d1dc2577509f6044d5a69a0e32f89087c577cd29907c74`. El sign-off funcional está en T3 thread `mcp:81055c85-c0d9-4e23-a9f4-6aad77d9d16f`, run ordinal 7. CTO thread `mcp:ec582871-66d1-4ee5-acbc-d00f796d8189`: ordinal 1 aprobó solo fuente/diff; ordinal 3 aprobó la evidencia QA histórica y snapshots previos; ordinal 4 aprobó los addenda documentales tras verificar sus SHA actuales. Los logs crudos ya no existen; no hubo reejecución ni rehash fresco del APK. #16/Trello siguen **OPEN / IN PROGRESS**; DoD no completo.
- **Vigencia:** los encabezados del 19-11 y los addenda §§15.10–15.12 describen snapshots históricos. El estado vigente se registra en §15.13 tras el re-review CTO independiente; el PASS histórico de a–d (QA ordinal 7) sobre hashes exactos se conserva íntegro, sin alteración.
- **Estado vigente (2026-11-22; véase §15.13):** QA ordinal 7 conserva su PASS histórico solo para los hashes del artefacto; el retest ordinal 11 quedó BLOCKED y no añade PASS. El auditor independiente T3 corrigió los snapshots 1d817209… / 3675cd00… del head 376b210; después, el re-review CTO independiente del head 4ccc7cd devolvió REQUEST_CHANGES por metadatos de procedencia sin marcar como históricos y falta de trazabilidad explícita al run de edición QA ordinal 15. Las correcciones están en §15.13 y requieren una nueva revisión. Cloudflare reportó production deployments desde 4ccc7cd para ambos Workers; no hubo QA de producción, deploy manual ni comprobación independiente del runtime. #16/Trello siguen OPEN / IN PROGRESS; #67 cerrado como supersedido y #68 abierto. Sin DONE ni promoción a master.
- **Evento de despliegue histórico (snapshot 2026-11-19, head 55476ef):** el bot de Cloudflare informó deployments successful en production de chatti-workers ([build 64088b03](https://dash.cloudflare.com/?to=/513628580fa6f627f416bca847d189bb/workers/services/view/chatti-workers/production/builds/64088b03-8c32-408f-890d-8b72dfde6544)) y chatti-web ([build 289ae743](https://dash.cloudflare.com/?to=/513628580fa6f627f416bca847d189bb/workers/services/view/chatti-web/production/builds/289ae743-9e81-48c6-bd5a-8f47dd452779)) desde el commit documental 55476ef7be965ebadfd2ae6aea90e98a7bfd95c8. En ese snapshot la confirmación de Staff estaba pendiente; Staff la confirmó después y los deployments del 22-11 se registran en §15.12. Esta célula no ejecutó deploy ni verificó el runtime independientemente.
- **Histórico:** la sesión 13:44–13:53 CET (§14) fue PASS sobre el APK anterior `54a43251…` (diff `317cd09…`) y **no es sign-off del código actual**; se conserva sin reescribir y queda superada por §15. El estado anterior (`BLOCKED`) queda documentado en §13 y el bloqueo histórico (APK pre-fix) en §§1–12.

---

## 1. Resumen ejecutivo

La nota del Staff se confirma en lo relativo al paquete: `com.chatti.mobile` está instalado y visible por ADB, Android 12, `versionName=1.0.0`, `versionCode=4`, instalación/actualización `2026-11-18 13:00:50`. El runtime Android existe (adb 1.0.41 / `37.0.0p1-android-tools` en `~/.local/share/opentester/android-tools/usr/bin/adb`, servidor escuchando en `127.0.0.1:5037`, dispositivo en estado `device`).

Pero la comprobación decisiva —*¿el APK instalado contiene el diff candidato?*— da **NO**:

1. Se extrajo el `base.apk` instalado con `adb pull` (solo lectura) y su `sha256` coincide con el que el propio dispositivo calcula sobre el fichero instalado.
2. Su bundle JS es **Hermes bytecode** (`assets/index.android.bundle`, 1.873.772 bytes, Hermes v98). En él **no aparece ninguno** de los identificadores que introduce el fix: `intentionalDisconnect`, `_socketGeneration`, `reconnectTimer`, `_autoReconnect`, `this.workerUrl`, ni el literal `Error closing WebSocket`.
3. Sí aparecen los marcadores del código **pre-fix**: `reconnectAttempts`, `maxReconnectAttempts`, `generateUserId`, `Was clean close`, `Max reconnection attempts reached`, `Connection URL was`.
4. Corrobora por el lado del repo: la rama `bugfix/mobile-16-session-reconnect` **no tiene commits propios** (`HEAD=dd3d72ce…` = `origin/dev`), el fix sigue **sin commitear** en el árbol de trabajo, y tanto `origin/dev` como `origin/master` son pre-fix. Cualquier APK construido desde el HEAD de esta rama, o desde `master`/`dev`, **no puede** contener el fix.
5. El APK no lleva metadatos VCS (`NO_SUPPORTED_VCS_FOUND`), no incluye `expo-dev-client`/dev menu (no puede cargar JS desde Metro) ni `expo-updates` (sin OTA). Es un build autónomo con bundle embebido.

Conclusión: ejecutar QA-1..QA-5 sobre este APK mediría el **bug pre-fix**, no el candidato; cualquier PASS/FAIL resultante **no sería atribuible** al diff candidato. Los criterios 1–4 quedan **NOT COVERED**.

**Actualización Staff (clon Dual Apps):** el clon existe en el usuario **999** (`XSpace`), pero comparte la **misma** ruta de APK y el **mismo** SHA-256 que el perfil 0; es decir, también es el artefacto **pre-fix**. No habilita la prueba funcional del candidato (ver §11).

Bloqueos adicionales: (a) no hay backend local (`localhost:8788` no responde) y el APK apunta al worker de producción `chatti-workers.wz0un.workers.dev` (HTTP 200); según `docs/CLOUDFLARE-DEPLOYMENT.md` **no existe backend de staging**, y usar producción para QA no está autorizado en esta célula. (b) No se puede recompilar aquí: faltan JDK/Android SDK y `node_modules`, no hay `android/` (proyecto Expo managed) ni APK/AAB en el repo, e instalar toolchain exige decisión explícita del Staff.

---

## 2. Entorno y dispositivo (evidencia exacta)

| Comprobación | Comando | Salida literal |
|---|---|---|
| Binario adb (fuera de PATH) | `ls -l /home/mohsine/.local/share/opentester/android-tools/usr/bin/adb` · `command -v adb` | fichero ejecutable `-rwxr-xr-x` (4.707.704 bytes) · `command -v adb` → sin salida (exit 1): **no está en PATH** |
| Versión | `adb version` | `Android Debug Bridge version 1.0.41` · `Version 37.0.0p1-android-tools` |
| Estado | `adb get-state` | `device` |
| Dispositivo | `adb devices -l` | `List of devices attached`<br>`<serial omitido>  device usb:1-3 product:vayu_global model:M2102J20SG device:vayu transport_id:3` |
| SO | `adb shell getprop ro.build.version.release` / `…sdk` | `12` / `31` |
| Fabricante/modelo | `adb shell getprop ro.product.manufacturer` / `…model` | `Xiaomi` / `M2102J20SG` |
| Producto/ABI | `adb shell getprop ro.product.device`; `dumpsys package` | `vayu`; `primaryCpuAbi=arm64-v8a` |
| Parche de seguridad | `adb shell getprop ro.build.version.security_patch` | `2022-02-01` |
| Paquete | `adb shell pm path com.chatti.mobile` | `package:/data/app/~~bgEtK6S83vbddKvayQ1yEA==/com.chatti.mobile-Nnisp_X5Ug-uWiOKf8zuwg==/base.apk` |
| Versión instalada | `adb shell dumpsys package com.chatti.mobile` | `versionCode=4 minSdk=24 targetSdk=36` · `versionName=1.0.0` · `firstInstallTime=2026-11-18 13:00:50` · `lastUpdateTime=2026-11-18 13:00:50` · `installerPackageName=com.google.android.packageinstaller` |
| Proceso vivo | `adb shell pidof com.chatti.mobile` | `26459` (la app está arrancada; en primer plano hay Settings, no la app) |
| Candidato local | `md5sum src/services/ChatService.js` | `43f4ed1bdf53e27edc44f3f56694ceb6` (idéntico al de la sesión previa: el código candidato no cambió) |
| Rama / HEAD | `git branch --show-current` · `git rev-parse HEAD` | `bugfix/mobile-16-session-reconnect` · `dd3d72ce83d106a6aca806f7727595553baaef6b` (= `origin/dev`) |

> Nota de privacidad: el número de serie del dispositivo **no** se reproduce en este informe. Las capturas y el árbol de accesibilidad **no** se han leído ni transmitido.

---

## 3. Verificación del artefacto instalado (bloqueo principal)

### 3.1 Extracción e integridad

```console
$ ADB=/home/mohsine/.local/share/opentester/android-tools/usr/bin/adb
$ $ADB shell sha256sum /data/app/~~bgEtK6S83vbddKvayQ1yEA==/com.chatti.mobile-Nnisp_X5Ug-uWiOKf8zuwg==/base.apk
26749e5a16780ca2a6f150c132cf983515119935da15ddf66d82fe8eac69f783  /data/app/~~bgEtK6S83vbddKvayQ1yEA==/com.chatti.mobile-Nnisp_X5Ug-uWiOKf8zuwg==/base.apk

$ $ADB pull <misma ruta> /tmp/opencode/qa-mobile16/base.apk
/data/app/.../base.apk: 1 file pulled, 0 skipped. 38.6 MB/s (79247776 bytes in 1.956s)

$ sha256sum /tmp/opencode/qa-mobile16/base.apk
26749e5a16780ca2a6f150c132cf983515119935da15ddf66d82fe8eac69f783  /tmp/opencode/qa-mobile16/base.apk
```

El APK analizado es **byte a byte** el instalado (mismo SHA-256 calculado en el dispositivo y en el host). Permanece solo en `/tmp/opencode/qa-mobile16/` (local); no se ha subido a ningún servicio.

### 3.2 Naturaleza del artefacto

```console
$ unzip -l base.apk | grep -E "assets/index.android.bundle|assets/app.config"
  1873772  1981-01-01 01:01   assets/index.android.bundle
     1118  1981-01-01 01:01   assets/app.config

$ file assets/index.android.bundle
assets/index.android.bundle: Hermes JavaScript bytecode, version 98

$ cat assets/app.config
{"name":"Chat-Ti","slug":"chatti-mobile","version":"1.0.0",...,"sdkVersion":"57.0.0","platforms":["ios","android","web"]}

$ cat meta/META-INF/version-control-info.textproto
generate_error_reason: NO_SUPPORTED_VCS_FOUND

$ unzip -l base.apk | grep -icE "expo/devlauncher|devmenu"     # 0
$ unzip -l base.apk | grep -icE "expo.modules.updates"          # 0
```

Lectura: build **standalone** (bundle embebido en Hermes, sin dev-client ni Metro, sin OTA). No hay metadatos que permitan fijar el commit de origen; solo se puede determinar qué código contiene.

### 3.3 ¿Contiene el diff candidato? — NO

Búsqueda de cadenas en el bundle instalado (los nombres de propiedad no se ofuscan, así que su ausencia es concluyente):

```console
$ for s in intentionalDisconnect _socketGeneration reconnectTimer _autoReconnect workerUrl \
           "Error closing WebSocket" reconnectAttempts generateUserId "Was clean close"; do
    printf "%-28s %s\n" "$s" "$(grep -a -o -- "$s" assets/index.android.bundle | wc -l)"; done
intentionalDisconnect        0
_socketGeneration            0
reconnectTimer               0
_autoReconnect               0
workerUrl                    0
Error closing WebSocket      0
reconnectAttempts            1
generateUserId               1
Was clean close              1
```

| Marcador | Solo existe en | Conteo en el APK instalado | Interpretación |
|---|---|---|---|
| `intentionalDisconnect` | fix candidato | **0** | no está |
| `_socketGeneration` | fix candidato | **0** | no está |
| `reconnectTimer` | fix candidato | **0** | no está |
| `_autoReconnect` | fix candidato | **0** | no está |
| `this.workerUrl` | fix candidato | **0** | no está |
| `Error closing WebSocket` | fix candidato (catch de `disconnect()`) | **0** | no está |
| `reconnectAttempts` | pre-fix y post-fix | 1 | presente |
| `generateUserId` | pre-fix y post-fix | 1 | ChatService está en el bundle |
| `Was clean close` | pre-fix (log) | 1 | comportamiento pre-fix |
| `Max reconnection attempts reached` | pre-fix (log) | 1 | comportamiento pre-fix |
| `Connection URL was` | pre-fix (log) | 1 | comportamiento pre-fix |

**Resultado:** el bundle instalado corresponde al `ChatService` **pre-fix** (`HEAD`/`origin/dev`/`origin/master`), no al árbol de trabajo que contiene el diff candidato. No se puede atribuir a este artefacto el comportamiento del fix.

### 3.4 Corroboración desde el repositorio

```console
$ for ref in origin/master origin/dev HEAD; do printf "%s: " "$ref"; \
    git show "$ref:src/services/ChatService.js" | grep -q intentionalDisconnect && echo "HAS FIX" || echo "pre-fix"; done
origin/master: pre-fix
origin/dev: pre-fix
HEAD: pre-fix

$ git rev-list --count origin/dev..HEAD
0
$ git status --short
 M .mece/cells/MOBILE-P0-PLAN/TASK.md
 M src/services/ChatService.js
?? .mece/WAVE-3.md
?? .mece/cells/MOBILE-16-RECONNECT/
?? .mece/cells/QA-MOBILE-16-RECONNECT/
```

El fix existe **solo** como cambio sin commitear en `src/services/ChatService.js`. Aunque el APK se hubiera construido desde el HEAD de la rama, no podría contenerlo.

---

## 4. Backend y viabilidad de recompilación

| Comprobación | Comando | Salida | Consecuencia |
|---|---|---|---|
| Backend local | `curl -sS -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:8788/` | `curl: (7) Failed to connect…` · `HTTP 000` | no hay backend local levantado |
| Puertos | `ss -ltn \| grep -E "8081\|8788"` | *(sin salida)* | ni Metro (8081) ni backend (8788) |
| Worker embebido en el APK | `strings -a assets/index.android.bundle \| grep -oE "https://[a-z0-9.-]+"` | `https://chatti-workers.wz0un.workers.dev` | el build apunta a **producción** |
| Alcance del worker | `curl -sS -o /dev/null -w "%{http_code}" https://chatti-workers.wz0un.workers.dev/` | `HTTP 200` | está vivo, pero es el backend de producción |
| ¿Backend de staging? | `grep -n "staging" docs/CLOUDFLARE-DEPLOYMENT.md` | `Backend \| same chatti-workers (there is no staging backend)` | no existe backend QA separado |
| JDK | `command -v java` | *(sin salida)* | no se puede compilar/gradlew |
| Android SDK | `command -v sdkmanager` / `adb` en PATH | ausentes (adb solo dentro de `opentester/`) | no se puede `expo run:android` |
| Dependencias JS | `ls -d node_modules` | no existe | no hay toolchain Expo instalado |
| Proyecto nativo | `ls -d android ios` | no existen | Expo managed: requiere prebuild |
| Build previo | `find . -maxdepth 4 \( -name "*.apk" -o -name "*.aab" \)` | sin resultados | no hay artefacto correcto que instalar |

No se ha instalado nada ni se ha levantado ningún servicio: la célula debía detenerse antes de alterar el entorno y así se ha hecho. Instalar JDK/SDK requiere decisión explícita del Staff (prohibido por el enunciado sin ella).

---

## 5. Cobertura de los criterios de la tarea

No se ejecutó QA funcional sobre el candidato: el artefacto instalado no lo contiene. Los cuatro criterios quedan **NOT COVERED** (ni PASS ni FAIL imputables al fix). Además, la simulación del corte de red está restringida por el TASK actualizado: no se permite interrumpir la conectividad del teléfono (§12).

| # | Criterio | Estado QA | Motivo |
|---|---|---|---|
| 1 | Un retry automático vuelve a unirse con el mismo `userId` del `join` inicial | **NOT COVERED** | el APK instalado es pre-fix; este criterio es precisamente el que el diff cambia |
| 2 | `disconnect()` manual cancela un retry pendiente y un `close` tardío no inicia otro | **NOT COVERED** | ídem; `intentionalDisconnect`/`reconnectTimer` no existen en el bundle instalado |
| 3 | Un socket obsoleto no puede interferir con una conexión nueva | **NOT COVERED** | ídem; `_socketGeneration` no existe en el bundle instalado |
| 4 | Entrada, reconexión, salida y mensajería normal sin duplicar eventos | **NOT COVERED** | no se ejecutó flujo end-to-end (además, sin backend QA seguro) |

> Revisión estática del código candidato (no es evidencia funcional): el árbol de trabajo sí contiene el fix y el harness local desechable vuelve a pasar 27/27 (ver §7). Eso **no** sustituye el QA en runtime y **no** se promociona a PASS.

Si se hubiera ejecutado el flujo sobre el APK instalado, lo esperable (según el código pre-fix) es que los criterios 1–3 **fallasen** al reproducir el bug original; **no se ha hecho** para no registrar un FAIL que no corresponde al candidato.

---

## 6. Qué se hizo y qué NO se hizo (cumplimiento de límites)

**Ejecutado (solo lectura / local):**
- `adb version`, `adb get-state`, `adb devices -l`, `getprop`, `dumpsys package`, `pm path`, `pidof`, `sha256sum` remoto.
- `adb pull` del `base.apk` instalado y análisis **local** del ZIP/bundle (SHA-256, Hermes, cadenas).
- Consultas de solo lectura a Git (`git show`, `git status`, `git rev-list`).
- Re-ejecución local del harness desechable en `/tmp/opencode` (complementario).

**No ejecutado (por límites de la célula):**
- ❌ `generate_tests` (borra datos de la app) y ❌ `validate_test` (puede enviar capturas/árbol al backend remoto configurado).
- ❌ `pm clear`, desinstalar, factory reset, borrar datos o caché de la app.
- ❌ Capturas de pantalla, volcados de UI/árbol de accesibilidad o lectura de contenido de pantalla; nada de eso se ha transmitido a servicios externos.
- ❌ Instalación de SDK/JDK, aceptación de licencias, `pnpm install`, levantamiento de backend, instalación/actualización del APK.
- ❌ Cambios en producto/config, commits, push, PR, issues/labels/estado de GitHub o Trello, despliegues.
- ❌ Lectura o copia de secretos.

**Único fichero escrito en el repo:** este `REPORT.md`. Artefactos locales de análisis: `/tmp/opencode/qa-mobile16/` (APK, bundle extraído, logs del harness).

---

## 7. Evidencia complementaria (NO es QA funcional)

El repositorio sigue sin harness móvil (`package.json` sin script `test`; sin Jest/Vitest/Detox en `src/`), así que se reutilizó el harness desechable ya existente en `/tmp/opencode/mobile16-harness` (Node 26.12.0, WebSocket simulado, sin añadir dependencias al repo):

```console
$ cd /tmp/opencode/mobile16-harness && node run.mjs; echo "EXIT=$?"
...
RESULT: ALL CHECKS PASSED
EXIT=0

$ cd /tmp/opencode/mobile16-harness/baseline && node run.mjs; echo "EXIT=$?"
...
RESULT: 12 CHECK(S) FAILED
EXIT=1
```

Esto solo confirma que el código del árbol de trabajo conserva la lógica del fix (y que el harness distingue pre-fix de post-fix). **No** mide timing real, códigos de `close()` durante `CONNECTING`, ciclo de vida Android ni el binario instalado.

---

## 8. Bloqueos y ruta de desbloqueo

| ID | Bloqueo | Qué falta exactamente | Quién decide |
|---|---|---|---|
| **B1** | El APK instalado no contiene el diff candidato | Un APK/AAB construido **desde el árbol de trabajo con el fix** (o desde un commit candidato cuyo SHA se registre), instalado en el dispositivo | Staff/CTO: commit o build autorizado |
| **B2** | No hay backend QA seguro | Backend local (`wrangler dev` + `pnpm install` en `backend/`) o autorización explícita para usar `chatti-workers` (producción, ya que no hay staging) | Staff |
| **B3** | No hay toolchain de build en este host | JDK 17 + Android command-line tools + platform-tools + system image, o un build EAS (`preview`/`development`) del commit candidato | Staff (instalar SDK/JDK exige decisión explícita) |
| **B4** | Corte de red restringido por el TASK | Simulación de corte **solo para el clon** contra backend local de QA (p. ej. parar/arrancar el backend) o aprobación explícita del Staff para una interrupción global | Staff |

**Ruta mínima tras desbloquear B1–B3:**
1. Fijar el artefacto: APK del commit candidato (o del árbol con el fix) + SHA-256 del APK + SHA del commit/estado del árbol.
2. Confirmar que **ese** bundle contiene `intentionalDisconnect`, `_socketGeneration`, `reconnectTimer`, `_autoReconnect` (mismo método de §3.3) antes de probar.
3. Backend QA accesible desde el dispositivo. Si es local en el host: `adb reverse tcp:8788 tcp:8788` y `EXPO_PUBLIC_WORKER_URL=http://localhost:8788` en el build.
4. Ejecutar QA-1..QA-5 del procedimiento §6 del anexo, con logs de Metro/logcat (filtrados, sin datos personales) y `wrangler tail`, capturando `userId` antes/después del retry y la ausencia de reintentos tras `disconnect()`.
5. Registrar modelo/Android/APK SHA/commit/worker URL y volver a esta célula para el veredicto PASS/FAIL.

---

## 9. Decisión QA

- **QA sign-off: ❌ NO procede.** No hay validación funcional del candidato porque el artefacto instalado es pre-fix.
- **Criterios 1–4: NOT COVERED.** Sin PASS ni FAIL imputables al diff.
- **Corte de red: NO ejecutado.** Prohibido tocar modo avión/Wi-Fi/datos; no hay backend local de QA contra el que simular un corte aislado del clon, así que se registra NOT COVERED y se solicita aprobación antes de cualquier interrupción global (§12).
- **#16 permanece OPEN / IN PROGRESS (QA bloqueado).** No se marca DONE, no se cierra issue/Trello, no se promociona ni se mergea nada.
- La sesión **no** alteró el entorno: ni datos de app, ni paquetes, ni toolchain, ni backend, ni Git/GitHub/Trello.

---

## 10. Trazabilidad

```text
STATUS delta — QA-MOBILE-16-RECONNECT (#16), sesión con dispositivo físico
- Runtime Android disponible: Xiaomi M2102J20SG, Android 12/API 31, arm64-v8a, adb 1.0.41 (serial omitido). Paquete com.chatti.mobile v1.0.0 (4), instalado 2026-11-18 13:00:50.
- BLOQUEO PRINCIPAL: el APK instalado NO contiene el diff candidato. Bundle Hermes sin intentionalDisconnect/_socketGeneration/reconnectTimer/_autoReconnect/this.workerUrl; sí contiene marcadores pre-fix. SHA-256 del APK verificado en dispositivo y host.
- El fix sigue sin commitear: HEAD=origin/dev=dd3d72ce, 0 commits sobre origin/dev; origin/master y origin/dev pre-fix.
- Backend: local :8788 caído; APK apunta a chatti-workers (producción, HTTP 200); no existe backend de staging. Rebuild imposible en este host (sin JDK/SDK, sin node_modules, sin android/, sin APK/AAB).
- Criterios 1-4 NOT COVERED. Sin QA sign-off. #16 OPEN / QA bloqueado. NO DONE.
- Clon Dual Apps (usuario 999): instalado y con datos aislados, pero mismo APK/SHA-256 pre-fix; flujo manual NO ejecutado (sin artefacto candidato ni backend QA).
- Corte de red NO ejecutado: prohibido conmutar modo avión/Wi-Fi/datos (conectividad compartida) y sin backend local para un corte aislado del clon. Criterios dependientes de 1006/retry: NOT COVERED. Aprobación del Staff pendiente para cualquier interrupción global.
- Sin cambios en producto/config/Git/GitHub/Trello/despliegues; sin generate_tests/validate_test, sin pm clear, sin capturas ni árbol de accesibilidad transmitidos.
- Complementario (no QA): harness local 27/27 PASS sobre el árbol actual; control negativo pre-fix 12 FAIL.
- ADB instalado fuera de PATH: `/home/mohsine/.local/share/opentester/android-tools/usr/bin/adb`; consultas del clon exclusivamente con `--user 999`; número de serie no registrado.
```

- **Issue:** https://github.com/wz0un/chatti-mobile/issues/16
- **Informe de implementación:** `.mece/cells/MOBILE-16-RECONNECT/REPORT.md` (§4.2 = procedimiento QA)
- **Informe previo (sin runtime):** anexo A de este documento
- **Sesión OpenCode de esta re-ejecución:** `ses_e1176f2bdffejyMAZ2BUPoNEE7`
- **T3 Code QA thread:** `mcp:0a657941-9a37-4439-af79-6e66eb40d120`; runs `run:thread:mcp%3A0a657941-9a37-4439-af79-6e66eb40d120:ordinal:1`, `...:ordinal:2`, `...:ordinal:3`, `...:ordinal:4`, todos completados bajo `opencode/big-pickle` ([hilo T3](https://app.t3.codes/threads/39965b4d-5f2a-4a0f-96a4-e78e93c02ef4/mcp%3A0a657941-9a37-4439-af79-6e66eb40d120)).
- **Artefactos locales (no versionados):** `/tmp/opencode/qa-mobile16/base.apk`, `assets/index.android.bundle`, `qa-session2-current.log`, `qa-session2-baseline.log`

---

## 11. Actualización Staff — clon Xiaomi Dual Apps (usuario 999)

Comprobación solicitada tras el aviso del Staff de que la app se clonó con Xiaomi Dual Apps. Todas las consultas son **ADB de solo lectura**; no se ha lanzado la app en ningún perfil, ni instalado, actualizado o borrado nada.

| Comprobación | Comando | Salida literal |
|---|---|---|
| Perfiles | `adb shell pm list users` | `UserInfo{0:Propietario:c13} running` · `UserInfo{999:XSpace:801010} running` |
| Paquete en 999 | `adb shell pm list packages --user 999` | `package:com.chatti.mobile` ✅ |
| Estado por usuario | `adb shell dumpsys package com.chatti.mobile` | `User 999: ceDataInode=563766 installed=true hidden=false suspended=false distractionFlags=0 stopped=false notLaunched=false enabled=0 …` |
| Versión en 999 | `adb shell pm list packages --user 999 --show-versioncode` | `package:com.chatti.mobile versionCode:4` |
| APK usado por 999 | `adb shell cmd package path --user 999 com.chatti.mobile` | `package:/data/app/~~bgEtK6S83vbddKvayQ1yEA==/com.chatti.mobile-Nnisp_X5Ug-uWiOKf8zuwg==/base.apk` |
| Integridad | `adb shell sha256sum <ruta>` | `26749e5a16780ca2a6f150c132cf983515119935da15ddf66d82fe8eac69f783` → **idéntico** al APK analizado en §3 |
| Aislamiento de datos | `adb shell ls -ld /data/user/999/com.chatti.mobile` | `drwx------ 4 u999_a239 u999_a239 … 2026-11-18 13:01` (perfil 0: `u0_a239`) → datos separados |
| Proceso | `adb shell ps -A -o uid,pid,name \| grep chatti` | solo una instancia de la app (uid `10239`, correspondiente al propietario); **no hay instancia del clon en ejecución**. Este QA no ha interactuado con ese proceso. |

> Android no mantiene copias de APK por usuario: el paquete no tiene splits y el único `base.apk` es la ruta anterior, ya analizada en §3. Las consultas de paquete, estado y versión se hicieron con `--user 999`; no se lanzó la app ni se manipuló ningún perfil. La fila de proceso es una lectura global de solo `uid/pid/nombre`, previa a esta restricción, para confirmar que el clon no estaba en ejecución.

**Conclusión:** el clon **sí está instalado y operativo** en el usuario 999 (`installed=true`, `versionCode=4`, directorio de datos propio), pero **comparte exactamente el mismo APK** que el perfil 0 (misma ruta, mismo SHA-256 y, por tanto, el mismo bundle Hermes **pre-fix** de §3, sin `intentionalDisconnect`, `_socketGeneration`, `reconnectTimer`, `_autoReconnect` ni `workerUrl`). El clon **no aporta un artefacto distinto** que probar; hereda el bloqueo B1.

**Flujo manual: NO ejecutado.** Fallan las dos condiciones exigidas:
1. el APK del clon **no** corresponde al código candidato (es pre-fix), y
2. no hay backend local/staging de QA: `localhost:8788` sigue caído y el build apunta a `chatti-workers.wz0un.workers.dev` (producción; no existe backend de staging).

**No se ha hecho:** no se lanzó la app en 999 ni en 0, no se navegó por la UI, no se leyeron capturas ni árbol de accesibilidad, no se instaló/actualizó/desinstaló ni se limpiaron datos, y no se usaron `generate_tests`/`validate_test`. Solo se consultaron metadatos de paquete y proceso.

**Estado: BLOCKED sin cambios.** Criterios 1–4 siguen **NOT COVERED**; sin QA sign-off; #16 sigue OPEN / QA bloqueado. Para desbloquear sigue siendo necesario un APK del código candidato (B1) y un backend QA (B2).

---

## 12. Restricción de conectividad (TASK actualizado) — corte de red no ejecutado

**Restricciones vinculantes recibidas:** no activar/desactivar modo avión, Wi-Fi ni datos móviles; la conexión es compartida entre los perfiles 0 y 999; no interrumpir la conectividad del teléfono; trabajar exclusivamente con el perfil 999; si no puede simularse un corte solo para el clon contra un backend local de QA, registrar el criterio como NOT COVERED y solicitar aprobación antes de una interrupción global.

**Cumplimiento:**
- No se ha ejecutado `svc wifi`, `svc data`, `cmd connectivity airplane-mode`, `settings put global airplane_mode_on` ni ninguna acción equivalente. La conectividad del teléfono permanece intacta.
- No se ha lanzado ni manipulado la app en el perfil 0 ni en el 999; no se ha tocado su UI, sus datos ni su estado.
- Las comprobaciones de paquete, estado y APK del clon se han hecho con `--user 999`; no se ha lanzado la app ni se ha manipulado ningún perfil. La única lectura global fue `ps` (solo `uid/pid/nombre`), previa a esta restricción, para confirmar que el clon no estaba en ejecución.

**Por qué no hay corte aislado del clon:**
- Android 12 no ofrece aislamiento de red por app vía ADB sin root o un DPC/device-owner. `cmd netpolicy` solo restringe datos en segundo plano; no provoca un `close` inesperado (código 1006) ni un fallo de socket.
- `force-stop` o matar el proceso del clon **no** equivale a un corte de red: termina el proceso y no ejercita la ruta de retry de `ChatService`.
- El método correcto y no global sería usar un backend local de QA y detener/reanudar el servidor solo para el clon; eso exige B2 (backend local) y B1 (APK candidato), ambos ausentes.

**Consecuencia:** los criterios que dependen de observar `Code: 1006` + `Reconnecting... (attempt N)` quedan **NOT COVERED**: 1 (retry conserva `userId`), 2 (`disconnect()` cancela retry/`close` tardío), 3 (socket obsoleto) y la parte de reconexión del 4. No se registra ningún FAIL: la prueba no se ha ejecutado.

**Solicitud al Staff:** se solicita aprobación explícita antes de cualquier interrupción global de conectividad. Aun con esa aprobación, no permitiría validar el candidato mientras el APK instalado sea pre-fix (§3) y el backend sea producción (§4); el orden correcto es B1 → B2 → corte aislado (o global aprobado).

---

## Anexo A — Informe de la sesión previa (2026-11-18 12:05–12:06, sin runtime móvil)

> Anexo histórico sin cambios de contenido: conserva la numeración original de sus secciones (1–9) y sus referencias internas (§4.2, §6, etc.).


- **Célula:** QA-MOBILE-16-RECONNECT (validación funcional de `.mece/cells/MOBILE-16-RECONNECT/`)
- **Issue:** GitHub #16 — `[P0] Preservar userId y estado de sesión durante la reconexión WebSocket` (leído en solo lectura; `state: open`, 0 comentarios)
- **Objetivo:** validación FUNCIONAL de #16 en dispositivo o emulador móvil real, siguiendo `REPORT.md` §4.2 (QA-1..QA-5)
- **Fecha de sesión:** 2026-11-18, 12:05–12:06 CET (Europe/Madrid)
- **Host:** Linux `7.2.15-1-omarchy` x86_64, Omarchy 4.5.0 (sin macOS → sin iOS Simulator posible)
- **Ámbito:** solo lectura sobre producto, Git y GitHub. **No** se modificó producto/config, **no** se desplegó, **no** hubo commit/push/PR, **no** se tocó GitHub/Trello, **no** se usaron secretos.
- **ESTADO: 🔴 BLOCKED** — no hay runtime móvil. **NO se otorga QA sign-off. NO se declara DONE.**

---

## 1. Resumen ejecutivo

No se ha podido ejecutar ningún procedimiento QA-1..QA-5 porque este host **no dispone de runtime móvil**: no hay Android SDK, ni `adb`, ni emulador, ni imagen de sistema, ni dispositivo físico conectado, ni JVM; y en Linux no existe iOS Simulator. La herramienta T3 `device_list` devuelve **cero dispositivos** y marca ambas plataformas como no disponibles.

Consecuencia: **los cinco criterios de aceptación de `TASK.md` quedan NOT COVERED por QA funcional**. La evidencia automatizada previa (harness desechable en `/tmp/opencode/mobile16-harness`, 27/27 PASS) es complementaria y, según `AGENTS.md`, **no sustituye** la validación de QA en runtime.

Este informe **no** acredita PASS ni FAIL de producto: acredita un **bloqueo de entorno** con evidencia reproducible y deja el plan QA-1..QA-5 listo para ejecutar en cuanto exista dispositivo/emulador.

---

## 2. PASO 0 — Descubrimiento de runtime (evidencia exacta)

### 2.1 Herramienta T3 `device_list`

```console
device_list({}) →
{
  "hostStatuses": {},
  "hosts": [
    {
      "id": "local",
      "label": "This machine",
      "platforms": [
        { "platform": "ios", "available": false,
          "reason": "iOS Simulators need macOS with Xcode." },
        { "platform": "android", "available": false,
          "reason": "Android SDK was not found. Install it with Android Studio or set ANDROID_HOME to your SDK directory." }
      ],
      "tools": {
        "hub":   { "requiredVersion": "0.22.1",  "installedVersions": [], "runningVersion": null },
        "agent": { "requiredVersion": "0.21.36", "installedVersions": [], "runningVersion": null }
      },
      "hubInstalled": false,
      "agentDeviceInstalled": false,
      "kind": "local"
    }
  ],
  "devices": [],
  "open": []
}
```

Interpretación: `devices: []` (cero simuladores/emuladores/dispositivos), `platforms[].available: false` en iOS y Android, y ni siquiera el tooling `agent-device`/`hub` está instalado.

### 2.2 Comprobaciones de shell (comandos y salidas literales)

Ejecutadas en `/home/mohsine/Proyectos/chatti-mobile` el 2026-11-18 12:05–12:06 CET:

| # | Comando | Salida literal | Exit |
|---|---------|----------------|------|
| 1 | `command -v adb` | *(sin salida)* | 1 |
| 2 | `command -v emulator` | *(sin salida)* | 1 |
| 3 | `command -v xcrun` | *(sin salida)* | 1 |
| 4 | `adb devices` | `zsh:1: command not found: adb` | 127 |
| 5 | `emulator -list-avds` | `zsh:1: command not found: emulator` | 127 |
| 6 | `echo "ANDROID_HOME=${ANDROID_HOME:-<unset>}"` | `ANDROID_HOME=<unset>` | 0 |
| 7 | `echo "ANDROID_SDK_ROOT=…"` | `ANDROID_SDK_ROOT=<unset>` | 0 |
| 8 | `echo "JAVA_HOME=…"` | `JAVA_HOME=<unset>` | 0 |
| 9 | `for d in ~/Android/Sdk /opt/android-sdk /usr/lib/android-sdk ~/.android/avd /opt/android-studio; do …` | `MISSING /home/mohsine/Android/Sdk`<br>`MISSING /opt/android-sdk`<br>`MISSING /usr/lib/android-sdk`<br>`MISSING /home/mohsine/.android/avd`<br>`MISSING /opt/android-studio` | 0 |
| 10 | `for c in adb emulator sdkmanager avdmanager xcrun java; do …` | `adb MISSING` · `emulator MISSING` · `sdkmanager MISSING` · `avdmanager MISSING` · `xcrun MISSING` · `java MISSING` | 0 |
| 11 | `uname -srm` / `/etc/os-release` | `Linux 7.2.15-1-omarchy x86_64` · `PRETTY_NAME="Omarchy"` `VERSION_ID="4.5.0"` | 0 |
| 12 | `ls -l /dev/kvm` | `crw-rw-rw- 1 root kvm 10, 232 nov 18 11:16 /dev/kvm` | 0 |
| 13 | `curl -sS -o /dev/null -w "HTTP %{http_code}" --max-time 5 http://localhost:8788/` | `curl: (7) Failed to connect to localhost:8788 after 0 ms: Could not connect to server` · `HTTP 000` | 7 |
| 14 | `for c in wrangler pnpm npx expo java; do …` | `wrangler: /home/mohsine/.local/bin/wrangler` · `pnpm: /usr/bin/pnpm` · `npx: /usr/bin/npx` · `expo: not found` · `java: not found` | 0 |

**Conclusión del PASO 0:** se **confirma** (no se refuta) la nota del CTO. Además se precisa el diagnóstico: `/dev/kvm` **sí existe y es accesible** (`crw-rw-rw- root kvm`), por lo que el host tiene aceleración de virtualización disponible; lo que falta es el **SDK/AVD toolchain y la JVM**, no capacidad de virtualización.

---

## 3. Estado del artefacto bajo QA

| Comprobación | Comando | Resultado exacto |
|---|---|---|
| Rama actual | `git branch --show-current` | `bugfix/mobile-16-session-reconnect` ✅ (rama correcta) |
| HEAD | `git rev-parse HEAD` | `dd3d72ce83d106a6aca806f7727595553baaef6b` |
| Base / divergencia | `git rev-parse origin/dev` · `git rev-list --count origin/dev..HEAD` | `dd3d72ce83d106a6aca806f7727595553baaef6b` · **`0`** → la rama **no tiene commits propios**; el fix sigue **sin commitear** en el árbol de trabajo |
| Diff bajo QA | `git diff --stat` | `.mece/cells/MOBILE-P0-PLAN/TASK.md \| 2 +-`<br>`src/services/ChatService.js \| 84 ++++++-----`<br>`2 files changed, 68 insertions(+), 18 deletions(-)` |
| Sintaxis del código bajo QA | `node --check src/services/ChatService.js` | `node --check: OK` (exit 0) |
| Huella del fichero | `md5sum src/services/ChatService.js` | `43f4ed1bdf53e27edc44f3f56694ceb6` |
| Dependencias móviles | `ls -d node_modules` | **no existe** (`node_modules missing`) |
| Nativo Android/iOS | `ls -d android ios` · `git ls-files --error-unmatch android ios` | directorios **inexistentes**; proyecto Expo *managed*, no hay `android/` ni `ios/` |
| Build instalable | `find . -maxdepth 3 \( -name "*.apk" -o -name "*.aab" -o -name "*.ipa" \)` | **sin resultados** — no hay build previo que instalar |
| Scripts móviles | `grep -n '"scripts"' -A 10 package.json` | `dev/start/android/ios/web` (Expo); **no hay** script `test` |
| URL de worker por defecto | `grep -rn "WORKER_URL" src/` | `src/screens/ChatScreen.js:26: const WORKER_URL = process.env.EXPO_PUBLIC_WORKER_URL \|\| 'http://localhost:8788';` |

**Lectura:** existe código candidato verificable sintácticamente, pero **no existe un artefacto ejecutable instalado en ningún runtime móvil**, y el fix ni siquiera está commiteado (esperado: la célula de implementación no debía commitear). Por tanto no se cumple el prerrequisito "build instalado" de `REPORT.md` §4.2.

```console
$ git status --short
 M .mece/cells/MOBILE-P0-PLAN/TASK.md
 M src/services/ChatService.js
?? .mece/WAVE-3.md
?? .mece/cells/MOBILE-16-RECONNECT/
```

(Estado idéntico al inicio de esta sesión de QA; el único añadido de esta célula es `?? .mece/cells/QA-MOBILE-16-RECONNECT/` con este informe.)

---

## 4. Prerrequisitos del QA — qué falta exactamente

`REPORT.md` §4.2 exige: dispositivo/emulador con dev build, logs de Metro/`adb logcat`, backend de salas accesible, y un segundo cliente web para contrastar `user_joined`. Estado real de cada uno:

| Prerrequisito | Estado | Detalle |
|---|---|---|
| Runtime Android (emulador o dispositivo físico) | ❌ **FALTA** | Sin SDK, sin `adb`, sin AVD, sin `emulator`, sin dispositivo USB. `adb devices` ni siquiera puede ejecutarse |
| Runtime iOS | ❌ **IMPOSIBLE en este host** | `xcrun` ausente y el host es Linux; requiere macOS + Xcode |
| Toolchain de build (JVM + Android SDK) | ❌ **FALTA** | `java`/`JAVA_HOME` ausentes; `sdkmanager`/`avdmanager` ausentes |
| Capacidad de virtualización | ✅ **OK** | `/dev/kvm` presente y accesible; el bloqueo es de software, no de hardware |
| Dependencias JS | ❌ **FALTA** | `node_modules/` ausente; `expo` no está en PATH (`npx expo` requeriría instalación previa) |
| Build/dev-client instalado en dispositivo | ❌ **FALTA** | No hay `.apk`/`.aab`/`.ipa` en el repo y no hay dispositivo donde instalar |
| Backend de salas accesible | ❌ **FALTA (local)** | `http://localhost:8788` no responde (curl exit 7 / HTTP 000); no hay `wrangler dev` corriendo |
| Segundo cliente web para contrastar `user_joined` | ⚠️ Depende del backend | Existe `web/` en el repo, pero sin backend levantado no hay sala que observar |

**Nota técnica para el desbloqueo (no ejecutada aquí):** en un emulador Android, `localhost:8788` apunta al propio emulador. Para alcanzar un backend en el host hay que usar `http://10.0.2.2:8788` como `EXPO_PUBLIC_WORKER_URL`, o `adb reverse tcp:8788 tcp:8788`. Sin esto, QA-1 fallaría por red y no por producto — hay que fijarlo antes de medir.

**Camino mínimo de desbloqueo (para el CTO/Staff):**
1. Instalar JDK 17 + Android command-line tools (`sdkmanager`, `platform-tools`, `emulator`) y un system image (p. ej. `system-images;android-34;google_apis;x86_64`); aceptar licencias; crear AVD con `avdmanager`; arrancar con `emulator -avd <name>`.
2. `pnpm install` en la raíz (o `npm install`) para tener `node_modules` y `npx expo`.
3. Levantar el backend de salas (`cd backend && pnpm install && pnpm dev`, o `wrangler dev`) y confirmar que responde en `:8788`.
4. Generar dev build con `npx expo run:android` sobre la rama `bugfix/mobile-16-session-reconnect` **con el árbol de trabajo que contiene el fix** (o, si el CTO crea commit candidato, sobre ese SHA — registrarlo).
5. Abrir `web/` como segundo cliente y tener `wrangler tail` / logs del worker visibles.
6. Registrar fecha, modelo de dispositivo, versión de Android, SHA del commit probado y `EXPO_PUBLIC_WORKER_URL` usado.

---

## 5. Cobertura de criterios de aceptación (`TASK.md`)

Ningún criterio se ha validado funcionalmente en esta sesión. Todos quedan **NOT COVERED** (no PASS, no FAIL):

| # | Criterio de aceptación (`TASK.md`) | QA funcional | Evidencia automatizada previa (complementaria) | Estado QA |
|---|---|---|---|---|
| 1 | Un reconnect reutiliza el mismo `userId` enviado en el `join` original | ❌ QA-1 no ejecutado | harness a1–a6 PASS | **NOT COVERED** |
| 2 | `disconnect()` manual impide tanto un timer pendiente como un `close` callback posterior | ❌ QA-2 y QA-3 no ejecutados | harness b1–b6 PASS | **NOT COVERED** |
| 3 | Un callback de socket obsoleto no puede reconectar tras una conexión más nueva | ❌ QA-4 no ejecutado | harness c1–c5 PASS | **NOT COVERED** |
| 4 | Compatibilidad de llamadas `connect(roomId, username, workerUrl, userId)` | ❌ QA-5 no ejecutado en app real | harness a1, d1–d5 PASS | **NOT COVERED** |
| 5 | Sin cambios de protocolo wire, de otro comportamiento móvil ni de ficheros web/shared | ❌ no verificado en runtime | harness a4, e1–e4 PASS; revisión CTO | **NOT COVERED** |
| 6 | Cobertura automatizada solo con harness existente; si no, procedimiento manual + gap explicado | ✅ **satisfecho como proceso** | `package.json` sin `test`; sin `__tests__` móviles | **COVERED (proceso)** |

> Los PASS del harness **no se promocionan** a PASS de QA: son ejecución en Node 26 con WebSocket simulado, no React Native. No prueban timing de dispositivo, códigos de `close()` durante `CONNECTING`, ni ciclo de vida de la app — precisamente lo que QA-1..QA-3 deben confirmar.

---

## 6. Plan QA-1..QA-5 — listo para ejecutar

Procedimiento autoritativo: `.mece/cells/MOBILE-16-RECONNECT/REPORT.md` §4.2. Checklist operativo para la sesión con dispositivo:

- [ ] **QA-1 — retry conserva `userId`** (criterio 1). Entrar en sala, enviar mensaje, capturar `userId A` en `📨 Received: user_joined`; cortar red 8–10 s → esperar `🔌 Disconnected … Code: 1006` + `Reconnecting... (attempt 1)`; restaurar red → el nuevo `user_joined` debe traer **el mismo `userId A`**. Repetir 2 veces; `reconnectAttempts` vuelve a 0 tras cada open.
- [ ] **QA-2 — `disconnect()` manual cancela el timer** (criterio 2). Cortar red hasta ver `attempt 1`, salir de la sala de inmediato, esperar 30 s con logs y `wrangler tail` abiertos → **cero** nuevos `Reconnecting...`, **cero** nuevos `join`/`user_joined`, **cero** nuevas conexiones WS; reconectar red y confirmar que sigue sin reconectar.
- [ ] **QA-3 — `close` tardío tras salida manual** (criterio 2, ruta callback). Entrar, salir limpio, apagar/encender red ~10 s → sin `Reconnecting...` y sin reingreso silencioso a la sala abandonada.
- [ ] **QA-4 — la conexión nueva gana a un socket viejo** (criterio 3). Entrar/salir/reentrar rápido (<2 s) dos veces → exactamente un `join` por entrada, un `user_joined` vivo, sin tormenta de reintentos, sin mensajes duplicados; además togglear avión durante conexión, recuperar, enviar mensaje y verificar que aparece **una sola vez**.
- [ ] **QA-5 — regresión de comportamiento normal** (criterios 4 y 5). Entrada limpia: join OK, indicador online, envío/recepción, typing indicator; salir → offline y sin reconexión. Con historial activado: `saved_history` carga **una vez** y tras reconexión automática la lista no se duplica ni reordena.
- [ ] **Evidencia a capturar:** capturas/vídeo por QA-1..QA-5; extractos crudos con timestamp de Metro/`adb logcat` y `wrangler tail` mostrando el `userId` antes/después y la ausencia de reintentos tras `disconnect()`; payloads `user_joined` del cliente web; ficha de entorno (modelo, OS, worker URL, SHA).
- [ ] **Criterio de salida:** los cinco procedimientos con el resultado esperado y la evidencia anterior, y sin errores de consola nuevos respecto a `dev`.

Sugerencia de rutas de evidencia para la sesión real (aún **no** creadas, no hay nada que capturar):
`.mece/cells/QA-MOBILE-16-RECONNECT/evidence/{qa1..qa5}-{log,screenshot}.*`

---

## 7. Bloqueo y decisión

**Estado: BLOCKED — QA funcional no ejecutada. Sin QA sign-off.**

- **Motivo único:** ausencia de runtime móvil en el host (Android SDK/emulador/dispositivo y JVM ausentes; iOS imposible por ser Linux), más ausencia de build instalado y de backend levantado.
- **Qué NO se ha hecho y no debe inferirse:** no se ha probado #16 en app real; no hay PASS ni FAIL de producto; no hay evidencia de dispositivo; no se ha validado ningún criterio 1–5 funcionalmente.
- **Qué falta para el QA sign-off:** los seis puntos del §4 (toolchain + AVD/dispositivo, `node_modules`, backend en `:8788`, dev build de la rama con el fix, cliente web de contraste, ficha de entorno) y ejecutar QA-1..QA-5 con la evidencia del §6.
- **Efecto en el proceso:** #16 permanece **OPEN / IN PROGRESS (QA blocked)**; no procede promoción, ni cierre de issue/Trello, ni merge. Según `AGENTS.md`, sin QA + CTO/Staff no hay DONE.
- **Recomendación:** repetir esta célula en un host con Android SDK (o dispositivo físico vía `device_open`) cuando el CTO/Staff lo habilite; el runbook §6 es ejecutable tal cual. Si el CTO crea antes el commit candidato y el PR draft (permitido por `WAVE-3.md`), el QA debe registrar el SHA probado y seguir dejando el PR sin merge.

---

## 8. Confirmación de alcance (no intervención)

- **Producto:** no modificado. `src/`, `App.js`, `index.js`, `app.json`, `eas.json` intactos; `md5sum src/services/ChatService.js` = `43f4ed1bdf53e27edc44f3f56694ceb6` y `node --check` OK, sin escrituras.
- **Config/dependencias:** no modificadas; no se instaló nada (`node_modules/` sigue ausente, no se ejecutó ningún instalador).
- **Git:** sin commit, sin push, sin PR, sin cambio de rama; estado del árbol idéntico al inicio (+ este informe).
- **GitHub/Trello:** solo lectura del issue #16; sin comentarios, labels ni cambios de estado.
- **Despliegues/infra:** ninguno. **Secretos:** ninguno leído ni usado.
- **Único fichero escrito:** `.mece/cells/QA-MOBILE-16-RECONNECT/REPORT.md`.

---

## 9. Trazabilidad

```text
STATUS delta — QA-MOBILE-16-RECONNECT (#16)
- QA funcional NO ejecutada: host Linux sin Android SDK/emulador/dispositivo, sin JVM y sin iOS Simulator; T3 device_list → devices: [].
- Sin QA sign-off. Criterios 1–5 de TASK.md quedan NOT COVERED (ni PASS ni FAIL). Criterio 6 (proceso) satisfecho.
- Bloqueo de entorno, no de producto: /dev/kvm disponible; faltan toolchain Android/JDK, node_modules, dev build, backend en :8788 y cliente web de contraste.
- Plan QA-1..QA-5 y ficha de evidencia listos en §6 para ejecutar con dispositivo.
- Sin QA no hay DONE: #16 sigue OPEN / IN PROGRESS (QA blocked). Sin cambios en producto, config, Git, GitHub/Trello ni despliegues.
```

- **Issue:** https://github.com/wz0un/chatti-mobile/issues/16
- **Informe de implementación de referencia:** `.mece/cells/MOBILE-16-RECONNECT/REPORT.md` (§4.2 = procedimiento QA)
- **T3 QA thread/run:** `mcp:f77df3ee-a65f-421d-88bc-64e611fee25e` / `run:thread:mcp%3Af77df3ee-a65f-421d-88bc-64e611fee25e:ordinal:1` ([T3 QA thread](https://app.t3.codes/threads/39965b4d-5f2a-4a0f-96a4-e78e93c02ef4/mcp%3Af77df3ee-a65f-421d-88bc-64e611fee25e)).

---

## 13. Sesión T3 Code 2026-11-18 13:23–13:38 CET — build QA local y bloqueo de instalación MIUI

**Veredicto:** el candidato **compila y el artefacto es correcto**, pero **no se pudo instalar** en el perfil XSpace (`999`). Los cuatro criterios siguen **NOT COVERED**; no hay QA sign-off y la tarea no se marca DONE. Sesión: `ses_e11642eb1ffeGmii7l7OsedY2z` (T3 Code / OpenCode harness). Dispositivo: Xiaomi `M2102J20SG`, Android 12; **serie omitida**. No se usaron `generate_tests`, `validate_test`, capturas, árboles de accesibilidad enviados a servicios remotos, credenciales reales ni el Worker de producción.

### 13.1 Estado y hash del diff bajo QA

| Comprobación | Resultado |
|---|---|
| Worktree | `/home/mohsine/.codex/worktrees/89b3/chatti-mobile` |
| Rama | `bugfix/mobile-16-session-reconnect-android-qa` |
| HEAD | `dd3d72ce83d106a6aca806f7727595553baaef6b` |
| `git diff HEAD \| sha256sum` | `317cd093bf653a7c8d75e1f16f2804dcae9a4bdb2cc2d872a54e4f72b1b33a42` |
| `src/services/ChatService.js` SHA-256 / MD5 | `8afac227d31073fb56db17c3459f49eef143fff9fde885ad1b49e240a339b6ec` / `43f4ed1bdf53e27edc44f3f56694ceb6` |
| Hash del árbol fuente relevante (`App.js`, `index.js`, `app.json`, `eas.json`, `package.json`, lockfile, `src/`, `assets/`) | `2faa861cfeed3a9ff1cec0ac2ddead31ca8cfefec3ef7ac48f28c5f399852ff7` |
| `pnpm-lock.yaml` SHA-256 (inalterado) | `a8462415ebc7cde827510b81aac750d0eeb31bef054abbc0b0f18b73be240e5b` |
| `git status --porcelain=v1` | `M .mece/cells/MOBILE-P0-PLAN/TASK.md`, `M src/services/ChatService.js`, `?? .mece/WAVE-3.md`, `?? .mece/cells/MOBILE-16-RECONNECT/`, `?? .mece/cells/QA-MOBILE-16-RECONNECT/` (sin cambios nuevos de producto; este informe es documentación) |

Diff SHA y hashes del candidato son idénticos a los del inicio de sesión: no se editó código fuente, manifests ni lockfiles. `git diff --exit-code` sobre `app.json`, `eas.json`, `package.json`, `pnpm-lock.yaml`, `backend/pnpm-lock.yaml`, `index.js`, `App.js`, `src/screens`, `src/navigation` y servicios distintos de `ChatService.js` dio OK.

### 13.2 Instalaciones user-local y dependencias

```console
env -u __MISE_SHIM mise install node@22.23.4
env -u __MISE_SHIM mise install java@temurin-17.0.21+9
SDK=$HOME/.local/share/android-sdk-qa
curl -sSL -o /tmp/opencode/qa-mobile16/cmdline-tools.zip \
  https://dl.google.com/android/repository/commandlinetools-linux-13114758_latest.zip
# descomprimido en $SDK/cmdline-tools/latest
yes | $SDK/cmdline-tools/latest/bin/sdkmanager --sdk_root=$SDK --licenses
$SDK/cmdline-tools/latest/bin/sdkmanager --sdk_root=$SDK \
  platform-tools 'platforms;android-36' 'build-tools;36.0.0'
```

`env -u __MISE_SHIM` fue necesario porque el AppImage T3 deja `__MISE_SHIM=1` y `mise` intentaba resolverse como shim de `T3-Code.AppImage`. No se instaló software global del sistema. Versiones efectivas: Node `v22.23.4` (exige `>=22.23.4 <23`, `.nvmrc` = `22.23.4`), Temurin `17.0.21+9`, SDK platform `android-36`, build-tools `36.0.0`, platform-tools `37.0.1`, Expo CLI `57.0.32`, Gradle `9.3.1`, Wrangler local `3.114.17`, ADB `1.0.41`.

Dependencias resueltas desde los lockfiles existentes, sin modificarlos:

```console
CI=1 pnpm install --frozen-lockfile            # copia aislada de la app en /tmp/opencode/qa-mobile16/app
CI=1 pnpm install --frozen-lockfile            # backend/ del repo (node_modules ignorado)
```

### 13.3 Backend local (sin secretos, sin deploy)

`backend/wrangler.toml` no requiere secretos para el flujo de sala: solo bindings de Durable Objects/KV y una variable no sensible; los secretos de Web Push son opcionales y degradan notificaciones, no el join/mensajería. No se imprimieron valores de vars ni secretos.

```console
./node_modules/.bin/wrangler dev --port 8788 --ip 127.0.0.1
curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:8788/          # 200
curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:8788/api/rooms # 200
```

La salida del Worker confirmó `Ready on http://127.0.0.1:8788` y, durante la preparación, `Room created: c263a9ze` y el registro de una cuenta **sintética** de QA. No se ejecutó `wrangler deploy` ni se contactó al Worker de producción en esta sesión.

### 13.4 Configuración Expo aislada, HTTP claro y build

La build se hizo **fuera del repo**, en `/tmp/opencode/qa-mobile16/app`, copiando únicamente `App.js`, `index.js`, `app.json`, `eas.json`, `package.json`, lockfile, `tsconfig.json`, `src/` y `assets/`. En esa copia se cambiaron nombre/slug y `expo.android.package` a `com.chatti.mobile.qa`; el `app.json` del repo quedó con hash `7ce27673751f3924d58cbb2f1fe522deb3c0dfcc2d2d88fa7c82104c9cf2968a` (idéntico a HEAD).

Expo SDK 57 **ya no traduce** `expo.android.usesCleartextTraffic` al manifiesto nativo. Para cumplir el requisito de `http://127.0.0.1:8788` con `adb reverse`, se usó un plugin Expo temporal local (`plugins/withCleartextTraffic.js`) solo en la copia aislada:

```console
CI=1 ./node_modules/.bin/expo prebuild --platform android --clean --no-install
# manifiesto generado: android:usesCleartextTraffic="true"
# a continuación se eliminaron la entrada del plugin, la clave temporal y el fichero del plugin
```

Tras el prebuild, la configuración temporal fue retirada; el proyecto nativo conservó el flag y el repo no recibió ningún fichero de configuración nueva. Se descartaron dos intentos de build anteriores (logs conservados en `gradle-assembleRelease.log` y `gradle-assembleRelease-2.log`) para aplicar primero la vía correcta del plugin; el build definitivo fue:

```console
export EXPO_PUBLIC_WORKER_URL=http://127.0.0.1:8788
./gradlew :app:assembleRelease --no-daemon
# BUILD SUCCESSFUL in 5m 38s — 675 actionable tasks
```

| Verificación del APK | Resultado |
|---|---|
| Ruta | `/tmp/opencode/qa-mobile16/app/android/app/build/outputs/apk/release/app-release.apk` |
| SHA-256 | `54a4325167107f51bf96973eb3e1bba0e5d4182ce0e0ddea0e8f794ec5004180` |
| Tamaño | `79.248.292` bytes |
| `aapt dump badging` | `package: name='com.chatti.mobile.qa'`, `versionName='1.0.0-qa16'`, `minSdk 24`, `targetSdk 36` |
| Manifiesto dentro del APK | `android:usesCleartextTraffic` = `true` (`0xffffffff`) |
| `assets/index.android.bundle` | Hermes v98, `1.874.228` bytes, SHA-256 `787daca36e747ab3b4b53c1ea90d942014f7ce68cb9bc7eaf4966a9030050830` |
| Marcadores del fix | `intentionalDisconnect`=1, `_socketGeneration`=1, `reconnectTimer`=1, `_autoReconnect`=1, `Error closing WebSocket`=1 |
| URL embebida | `http://127.0.0.1:8788` (una ocurrencia); **sin** `*.workers.dev` |

El bundle contiene el diff candidato, a diferencia del APK pre-fix analizado en §3.

### 13.5 Intento de instalación en el usuario 999 y bloqueo

```console
adb reverse tcp:8788 tcp:8788                       # confirmado en `adb reverse --list`
adb install --user 999 <apk>
# Failure [INSTALL_FAILED_USER_RESTRICTED: Install canceled by user]
adb push <apk> /data/local/tmp/qa16.apk
adb shell pm install --user 999 /data/local/tmp/qa16.apk
# Failure [INSTALL_FAILED_USER_RESTRICTED: Install canceled by user]
adb shell pm install --user 999 -i com.android.packageinstaller /data/local/tmp/qa16.apk
# Failure [INSTALL_FAILED_USER_RESTRICTED: Install canceled by user]
adb shell am start --user 999 -a android.intent.action.VIEW \
  -d file:///data/local/tmp/qa16.apk -t application/vnd.android.package-archive
# Error: Activity not started, unable to resolve Intent
```

No había diálogo de instalación pendiente (UI local solo, sin transmisión) y la pantalla estaba despierta. En MIUI/HyperOS este código exige el interruptor de desarrollador **“Install via USB”** (frecuentemente con cuenta Mi/SIM) y los perfiles secundarios pueden estar restringidos. **No se activó ese ajuste ni se hizo reboot/revoke**: Modificar la configuración del teléfono queda fuera de la autorización recibida.

Estado final verificado: `com.chatti.mobile.qa` **ausente** en usuarios `0` y `999`; `com.chatti.mobile` sigue instalado en ambos con la misma ruta y SHA-256 de dispositivo `26749e5a16780ca2a6f150c132cf983515119935da15ddf66d82fe8eac69f783` (idéntico antes y después). No hubo `pm clear`, desinstalación, toque al usuario 0, modo avión/Wi-Fi/datos ni reinicio. `adb reverse` se retiró al finalizar; el Worker local y la captura de logcat se detuvieron; sus logs permanecen en `/tmp/opencode/qa-mobile16/`.

### 13.6 Cobertura de criterios (sesión 13:23–13:38 CET; superada por §14)

| # | Criterio | Estado | Motivo |
|---|---|---|---|
| a | Un retry vuelve a unirse con el mismo `userId` del `join` inicial | **NOT COVERED** | Sin app instalada; no hubo ejecución runtime ni evento `user_joined` observable |
| b | `disconnect()` cancela retry pendiente y un `close` tardío no reinicia | **NOT COVERED** | Sin instalación; no se pudo provocar caída/reinicio del Worker con la app en sala |
| c | Un socket obsoleto no interfiere con una conexión nueva | **NOT COVERED** (con limitación registrada) | Sin runtime. Comprobación simulada local: los callbacks viejos se ignoran (`retryTimersAfterStaleClose=0`), pero un segundo `connect()` sobre un socket aún abierto **no cierra físicamente** el primero (`firstStateAtSecondConnect=1`, `firstCloseCalls=0`). La UI actual crea una nueva instancia de `ChatService` al reentrar, por lo que no expone esa llamada solapada; queda para revisión CTO |
| d | Entrada, reconexión, salida y mensajería sin duplicados | **NOT COVERED** | Sin app instalada; no se enviaron mensajes ni se contrastó el historial del Worker |

La comprobación de (c) usó una copia desechable del candidato en `/tmp/opencode/mobile16-harness` con WebSocket simulado; es **evidencia complementaria**, no QA funcional y no sustituye al dispositivo. No se modificó el fuente del repo.

### 13.7 Artefactos y trazabilidad

- Artefacto QA: `/tmp/opencode/qa-mobile16/app/android/app/build/outputs/apk/release/app-release.apk` (SHA-256 arriba). No se versionó.
- Logs conservados: `wrangler-dev.log`, `prebuild.log`, `prebuild-cleartext-plugin.log`, `gradle-assembleRelease.log`, `gradle-assembleRelease-2.log`, `gradle-final.log`, `logcat.txt` (vacío de eventos de app), `evidence.log`, `overlap-harness.out`; configuración temporal y fuente copiada bajo `/tmp/opencode/qa-mobile16/`.
- Configuración temporal dentro del repo: **ninguna**. Solo se actualizan este `REPORT.md` y `.mece/WAVE-3.md`.
- Sin commit, push, PR, deploy, cambios en GitHub/Trello ni lectura de secretos.

### 13.8 Decisión QA

- **QA sign-off: ❌ NO procede.** El fallo está en la instalación del dispositivo, no en el build; no hay evidencia funcional del candidato en runtime.
- **Criterios a–d: NOT COVERED.** El PASS de compilación/análisis de bundle **no** se promociona a PASS funcional.
- **Bloqueo B5:** se necesitaba autorización Staff/CTO para activar “Install via USB” en el dispositivo (o un runtime alternativo autorizado) y repetir la instalación solo en el usuario `999`. **Resuelto en §14** tras autorización expresa; el toggle ya estaba activo, no se modificó.
- **#16 permanece OPEN / IN PROGRESS (QA bloqueado).** No se marca DONE; siguen pendientes los sign-off de QA y CTO/Staff según `AGENTS.md`.

### 13.9 Comprobación de diálogo de confirmación en XSpace (misma sesión)

A petición del revisor, se comprobó **solo** si existía un diálogo de confirmación de la instalación ya autorizada para el usuario `999`, sin relanzar la instalación ni usar `pm install` u otros métodos de elusión:

```console
adb shell am get-current-user                       # 0
adb shell dumpsys activity activities | grep u999   # u999:[]
adb shell uiautomator dump /sdcard/qa16-dialog-check.xml
# volcado local: 81 nodos, sin nodos install/confirm/allow/qa16/package
adb shell ps -A | grep -i installer                 # sin procesos
```

Única actividad relaciónada: `com.miui.securitycore/...XSpaceSettingActivity` en usuario `0`, pausada y no visible (`visible=false`); **no es un diálogo de instalación**. No había ventana de `packageinstaller`, notificación de instalación pendiente ni actividad alguna en `u999`. Por tanto **no había nada que confirmar** y no se pulsó ningún control.

- **Mensaje exacto del fallo (sin cambios):** `Failure [INSTALL_FAILED_USER_RESTRICTED: Install canceled by user]` (devuelto por `adb install --user 999`, `pm install --user 999` y con installer explícito).
- **Paso que falta, fuera de esta autorización:** habilitar en el dispositivo el interruptor de desarrollador MIUI/HyperOS **“Install via USB”** (que puede exigir cuenta Mi/SIM) y/o permitir instalaciones en el perfil secundario XSpace, y entonces repetir **solo** la instalación ya autorizada en el usuario `999`. No se cambió ese ajuste ni política alguna; el estado sigue **BLOCKED / B5**, sin QA sign-off. **(Resuelto después, véase §14.)**

---

## 14. Sesión T3 Code 2026-11-18 13:44–13:53 CET — instalación autorizada y QA funcional

**Veredicto:** instalación completada en XSpace user `999` y **QA funcional PASS para los cuatro criterios (a–d)**. **QA sign-off otorgado; CTO/Staff sign-off pendiente. NO se marca DONE.** Thread actual: `mcp:a44600f1-7c75-44c1-a528-647793fc5aa6` ([T3 QA thread](https://app.t3.codes/threads/39965b4d-5f2a-4a0f-96a4-e78e93c02ef4/mcp%3Aa44600f1-7c75-44c1-a528-647793fc5aa6)); sesión `ses_e11642eb1ffeGmii7l7OsedY2z`. Dispositivo Xiaomi `M2102J20SG`, Android 12; serie omitida.

### 14.1 Toggle MIUI y límites de la autorización

Antes de cualquier cambio se registró **en privado** el estado original del toggle (registro local `/tmp/opencode/qa-mobile16/private-toggle-state.log`, no versionado):

```console
adb shell uiautomator dump /sdcard/qa16-devsettings.xml
# fila "Instalar vía USB" [71,702][385,761]
# CheckBox checkable=true checked=true bounds=[890,689][1009,823]
# ORIGINAL_STATE=ON
adb shell settings get secure install_non_market_apps   # 1
```

**Estaba ya activado**, por lo que **no se escribió en el ajuste**: estado final `install_non_market_apps=1`, idéntico al original. No se activó ninguna otra opción, no se requirió SIM/cuenta Mi, no se tocaron apps ni datos del usuario `0`, no se usó `pm install` en esta fase y no se eliminaron datos de la app. La instalación se realizó únicamente con el método aprobado:

```console
adb install --user 999 /tmp/opencode/qa-mobile16/app/android/app/build/outputs/apk/release/app-release.apk
# 2026-11-18 13:45:20 CET → Performing Streamed Install / Success
adb shell pm list packages --user 999 | grep com.chatti.mobile.qa   # 1
adb shell pm list packages --user 0   | grep com.chatti.mobile.qa   # 0
```

Para diagnosticar los rechazos anteriores se leyó logcat: `PKMSImpl: MIUILOG- assertCallerAndPackage: uid=2000, installerPkg=null, msg=Install canceled by user`. No explicaba el cambio de estado del toggle; con el toggle ya ON y sin modificar nada más, el mismo comando aprobado devolvió `Success`.

### 14.2 Entorno y preparación funcional

- APK bajo QA: SHA-256 `54a4325167107f51bf96973eb3e1bba0e5d4182ce0e0ddea0e8f794ec5004180` (idéntico al de §13). `app.json`, lockfiles y fuentes del repo sin cambios; `git diff HEAD | sha256sum` = `317cd093bf653a7c8d75e1f16f2804dcae9a4bdb2cc2d872a54e4f72b1b33a42`.
- Worker local: `./node_modules/.bin/wrangler dev --port 8788 --ip 127.0.0.1` desde `backend/`; `GET /` y `/api/rooms` → HTTP 200. Sin `wrangler deploy` ni contacto con el Worker de producción.
- `adb reverse tcp:8788 tcp:8788` activo durante la prueba y retirado al final.
- Captura local: `adb logcat -v time ReactNativeJS:V *:S > /tmp/opencode/qa-mobile16/logcat-qa.txt`. Sin capturas, árboles UI ni tráfico enviado a servicios remotos.
- Cuenta y sala **sintéticas** en el Worker local: `qa16tester#0002` (userId de login `user_1795006080299_9x8qy1lm3`; contraseña no documentada) y sala `c263a9ze` (`QA16-Reconnect-Local`).
- Lanzamiento en user 999 con `adb shell am start --user 999 -n com.chatti.mobile.qa/.MainActivity`. MIUI mostró un selector: la entrada normal intentó resolverse en user 0 (sin paquete QA) y falló sin efecto; se eligió **“Aplicación dual”**, que abrió `u999 com.chatti.mobile.qa/.MainActivity` (PID 9286). Login y entrada a la sala correctos.
- El `user_joined` inicial reportó `userId=user_1795006165433_nvw9cv938`: es el que genera `ChatService` al no recibir `userId` desde `ChatScreen`, y es el que debe conservar el retry. No coincide con el `userId` de login, tal como está diseñado el contrato.

### 14.3 Evidencia por criterio

| # | Criterio | Resultado | Evidencia (hora CET, logcat del PID 9286 / logs del Worker) |
|---|---|---|---|
| a | Un retry vuelve a unirse con el mismo `userId` del `join` inicial | **PASS** | Join inicial 13:49:25.466 `userId=user_1795006165433_nvw9cv938`. Se detuvo solo el proceso hijo de `wrangler dev`. `Reconnecting... (attempt 1)` 13:50:05.940, `attempt 2` 13:50:07.966, `attempt 3` 13:50:17.998; `✅ Connected` 13:50:18.026 y `user_joined` 13:50:18.035 con **`userId=user_1795006165433_nvw9cv938`** (idéntico). `User qa16tester#0002 joined room` en el Worker. |
| b | `disconnect()` cancela retry pendiente y un `close` tardío no reinicia | **PASS** | Worker detenido 13:50:55; `Disconnected. Code: 1006` 13:50:55.110 y `Reconnecting... (attempt 1)` programado. `BACK` a las 13:50:56 (el cleanup de `ChatScreen` llama `chatService.disconnect()`). Tras reiniciar el Worker y esperar 8 s: **0** eventos `Connecting to:`/`Connected`/`user_joined` posteriores a las 13:50:56. La UI volvió a la lista de salas. |
| c | Un socket obsoleto no interfiere con una conexión nueva | **PASS (ruta exercitada) con limitación** | Salida y reentrada rápidas 13:51:55–13:51:57: exactamente 2 `Connecting to:`, 2 `✅ Connected`, 2 `user_joined`, **0** `Reconnecting` y **0** `Disconnected` espurios; el Worker registró 2 joins. Los callbacks obsoletos fueron ignorados por la generación. **Limitación para CTO:** el chequeo simulado local sigue mostrando que un segundo `connect()` sobre un socket aún OPEN no cierra físicamente el anterior (`firstStateAtSecondConnect=1`, `firstCloseCalls=0`); la UI actual llama a `disconnect()` antes de reentrar, por lo que ese caso no es alcanzable desde la app. No se editó el fuente. |
| d | Entrada, reconexión, salida y mensajería sin duplicados | **PASS** | Envío de `qa16-ping-1` a las 13:53:18: **1** `📨 Received: message`, **1** `Message persisted and broadcast` en el Worker, **1** fila en `GET /api/room/c263a9ze/messages` (`id=1795006398783-tn0a8vvm9`), **1** ocurrencia en la UI. Sin duplicados. |

### 14.4 Limpieza y estado final

- Logcat y Worker local detenidos; `adb reverse` retirado (`adb reverse --list` vacío; `127.0.0.1:8788` ya no responde).
- Toggle MIUI sin cambios: `install_non_market_apps=1` (idéntico al original). Sin cambios de ajustes, SIM/cuenta Mi, políticas, ni usuario `0`.
- `com.chatti.mobile.qa`: presente solo en user `999`. `com.chatti.mobile` intacto en user `0` con SHA de dispositivo `26749e5a16780ca2a6f150c132cf983515119935da15ddf66d82fe8eac69f783` (idéntico antes y después). Sin `pm clear`, desinstalación ni reinicio.
- Recomprobación posterior (solo lectura): los rechazos de las 13:36–13:38 CET mostraron `PKMSImpl: MIUILOG- assertCallerAndPackage: uid=2000, installerPkg=null, msg=Install canceled by user`; con el toggle ya ON y **sin ningún ajuste adicional**, el mismo `adb install --user 999` devolvió `Success` a las 13:45:20 CET. No se repitió la instalación sobre la misma versión para no alterar el estado ya aprobado: `com.chatti.mobile.qa` 1.0.0-qa16 sigue instalado **solo en user 999** (user 0 = 0), `install_non_market_apps=1` (sin conmutar; `ORIGINAL_STATE=ON`, `FINAL_STATE=ON`) y `verifier_verify_adb_installs=0` (sin cambios).
- Repo: diff del candidato inalterado; sin commit, push, PR, deploy ni cambios en GitHub/Trello. Únicos cambios: este informe y `.mece/WAVE-3.md`.
- Artefactos locales conservados en `/tmp/opencode/qa-mobile16/`: `logcat-qa.txt`, `wrangler-dev-qa.log`, `wrangler-dev-qa2.log`, `wrangler-dev-qa3.log`, `install-final.out`, `evidence.log`, `overlap-harness.out`, volcados `ui-*.xml`, APK y bundle extraído.

### 14.5 Verificación posterior del alcance del selector (solo lectura, sin taps)

A petición del Staff, antes de cualquier nueva interacción se recomprobó que la sesión pertenece al usuario Android `999` y que la opción “Aplicación dual” elegida en el selector MIUI era la entrada de **XSpace**, no un clon “Dual App”:

```console
adb shell pm list users
# UserInfo{0:Propietario:c13} running
# UserInfo{999:XSpace:801010} running

adb shell dumpsys activity activities | grep com.chatti.mobile.qa
# mResumedActivity: ActivityRecord{4b0c38e u999 com.chatti.mobile.qa/.MainActivity t59}
# mFocusedApp=ActivityRecord{4b0c38e u999 com.chatti.mobile.qa/.MainActivity t59}
# Hist #0: el único registro de la tarea es esa misma actividad u999

adb shell ps -A | grep com.chatti.mobile
# u999_a241  9286  ...  com.chatti.mobile.qa        ← único proceso QA, UID de user 999

adb shell cmd package resolve-activity --brief --user 0 -n com.chatti.mobile.qa/.MainActivity
# No activity found
adb shell cmd package resolve-activity --brief --user 999 -n com.chatti.mobile.qa/.MainActivity
# com.chatti.mobile.qa/.MainActivity

adb shell pm list packages --user 999 | grep -c '^package:com.chatti.mobile.qa$'  # 1
adb shell pm list packages --user 0   | grep -c '^package:com.chatti.mobile.qa$'  # 0
adb shell pm list packages -u | grep -iE 'dual|clone|parallel|space'              # (vacío)
```

`am get-current-user` devuelve `0` porque describe al **llamador shell**, no a la actividad en primer plano; el dato relevante (`mResumedActivity`/`mFocusedApp`, el proceso `u999_a241` y el `resolve-activity` por usuario) coincide en `u999`. No existe ningún paquete Dual App/clon paralelo: el paquete QA solo está en XSpace `999` y en user `0` ni siquiera resuelve su actividad. Por tanto **toda la interacción y evidencia de §14.2–14.4 pertenece al user 999**; no se seleccionó ni generó una variante del perfil owner. No se realizaron taps nuevos.

### 14.6 Decisión QA

> **Nota de vigencia (2026-11-18 14:29 CET):** esta decisión es **histórica** y aplica únicamente al APK `54a4325167107f51bf96973eb3e1bba0e5d4182ce0e0ddea0e8f794ec5004180` / diff `317cd093…` (§14.2). **No cubre el fuente actual.** La decisión y el sign-off vigentes están en **§15**.

- **QA sign-off: ✅ OTORGADO** para los criterios a–d sobre el runtime indicado, con la limitación de (c) registrada como riesgo residual para revisión CTO.
- **CTO/Staff sign-off: ⏳ PENDIENTE.** Según `AGENTS.md`, la tarea **no está DONE** hasta que ambos sign-offs existan.
- **#16 permanece OPEN / IN PROGRESS (QA completada → revisión CTO).** No se promociona a `dev`, `master` ni producción; ninguna acción externa.

---

## 15. Seguimiento QA 2026-11-18 14:06–14:29 CET — nuevo candidato F1–F4 (APK reconstruido)

**Veredicto QA al cierre de esta ejecución (14:29 CET):** **PASS en los cuatro criterios (a–d)** sobre un APK reconstruido desde el fuente con F1–F4. QA otorgó sign-off para este artefacto, con la limitación de (c) registrada. El CTO estaba pendiente en ese momento; la revisión CTO posterior aprobó **solo fuente/diff**, no la evidencia QA ni el APK (§§15.7 y 15.10). #16 permanece OPEN / IN PROGRESS; no se marca DONE.

**Vigencia:** §14 es **histórico** y su sign-off aplica solo al APK `54a4325167107f51bf96973eb3e1bba0e5d4182ce0e0ddea0e8f794ec5004180` (diff `317cd093…`). Esta §15 contiene la evidencia QA vigente para el fuente `ddbc8af9…` / diff `4d1df4f3…` / APK `2868e8cb…`; el alcance real de la revisión CTO y lo que sigue pendiente está en §§15.7 y 15.10.

**Ejecución T3 (esta célula):** thread T3 **`mcp:81055c85-c0d9-4e23-a9f4-6aad77d9d16f`** (título “QA Android #16 final candidate: APK + XSpace 999”), run **`run:thread:mcp%3A81055c85-c0d9-4e23-a9f4-6aad77d9d16f:ordinal:7`**, provider `opencode`, modelo `opencode/big-pickle`; sesión OpenCode subyacente `ses_e113c2c9cffesVLIwo1xEFk62L`. Sin CLI de OpenCode, sin commit/push/PR, sin GitHub/Trello, sin deploy.

### 15.1 Fuente, rama y entorno (verificado antes de compilar)

```console
$ git rev-parse --abbrev-ref HEAD        # bugfix/mobile-16-session-reconnect-android-qa
$ git rev-parse HEAD                     # dd3d72ce83d106a6aca806f7727595553baaef6b
$ sha256sum src/services/ChatService.js  # ddbc8af979ce94491d80297e5d0024dbda98c9307f1406bc93d0b22d58b4c457
$ git diff -- src/services/ChatService.js | sha256sum
# 4d1df4f339f60f11ed8dc3d43dd578c0fc01814840127a711ff2a23c7a716986  (87 inserciones / 18 borrados)
$ git status --porcelain=v1
 M .mece/cells/MOBILE-P0-PLAN/TASK.md      # edición Staff pre-existente, no tocada
 M src/services/ChatService.js            # candidato, no tocado por esta sesión
?? .mece/WAVE-3.md
?? .mece/cells/MOBILE-16-RECONNECT/
?? .mece/cells/QA-MOBILE-16-RECONNECT/
```

- Dispositivo ADB `device` (no `unauthorized`/`offline`), Xiaomi `M2102J20SG`, Android **12**; serie omitida. `pm list users`: `UserInfo{0:Propietario} running`, `UserInfo{999:XSpace} running`.
- Paquete QA antes de la instalación: user `0` = **0** coincidencias, user `999` = **1**. Producción `com.chatti.mobile` user `0` = 1, `base.apk` SHA-256 **`26749e5a16780ca2a6f150c132cf983515119935da15ddf66d82fe8eac69f783`** (idéntico antes/después).
- Toggle MIUI “Instalar vía USB”: **solo lectura**, `settings get secure install_non_market_apps` = **1**; volcado local de Opciones de desarrollador: fila “Instalar vía USB” con `CheckBox checkable=true checked=true` → **ON**. **No se conmutó ni escribió ningún ajuste en esta sesión.** `verifier_verify_adb_installs` = **0** (sin cambios).

### 15.2 Build aislado y verificación del artefacto

Se reutilizó el scratch `/tmp/opencode/qa-mobile16/app` (applicationId `com.chatti.mobile.qa`, `versionName 1.0.0-qa16`, `EXPO_PUBLIC_WORKER_URL=http://127.0.0.1:8788`, cleartext solo en la copia aislada). Se copió **solo** `src/services/ChatService.js` desde el repo y se verificó igualdad byte a byte antes de compilar:

```console
$ sha256sum /tmp/opencode/qa-mobile16/app/src/services/ChatService.js
# ddbc8af979ce94491d80297e5d0024dbda98c9307f1406bc93d0b22d58b4c457  (== repo)
$ diff -q app/src/services/ChatService.js <repo>/src/services/ChatService.js   # IDENTICAL
$ EXPO_PUBLIC_WORKER_URL=http://127.0.0.1:8788 CI=1 \
  ./gradlew :app:assembleRelease --no-daemon
# Task :app:createBundleReleaseJsAndAssets (ejecutada, no UP-TO-DATE)
# BUILD SUCCESSFUL in 31s — 675 actionable tasks: 30 executed, 645 up-to-date
```

| Verificación del APK | Resultado |
|---|---|
| Ruta | `/tmp/opencode/qa-mobile16/app/android/app/build/outputs/apk/release/app-release.apk` |
| SHA-256 APK | **`2868e8cbaeb4b89288d1dc2577509f6044d5a69a0e32f89087c577cd29907c74`** |
| Tamaño | `79.248.400` bytes |
| Firma | `CN=Android Debug` (cert SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`) — **solo QA, no distribución** |
| `aapt2 dump badging` | `package='com.chatti.mobile.qa'`, `versionName='1.0.0-qa16'`, `minSdk 24`, `targetSdk 36` |
| Manifiesto | `android:usesCleartextTraffic=true` (solo build QA aislado) |
| Bundle | `assets/index.android.bundle` SHA-256 `5b96326ece96eb2e3caba46cfbb87a0d8f17684d5bfe58632e37059ccf726b08` (anterior: `787daca3…`) |
| SHA del APK instalado (pull de user 999) | **`2868e8cb…` = APK compilado** |

**El bundle contiene el código final (Hermes bytecode desensamblado con `hermesc -b -dump-bytecode`):**

- `NCFunction<_invalidateSocket>` incluye `clearTimeout(reconnectTimer)`, `_socketGeneration += 1`, `ws = null`, `close()` dentro de `try` con `Catch` → `console.error("Error closing Web…")`, y retorna la generación nueva.
- `NCFunction<disconnect>` invoca `_invalidateSocket` **antes** de guardar historial/limpiar cache.
- `NCFunction<connect>` evalúa `userId` explícito → (`_autoReconnect ? this.userId : null`) → `generateUserId()`, y llama a `_invalidateSocket` **antes** de `Construct WebSocket`; los handlers comparan la generación y el timer de retry lleva `retryGeneration`.
- El bundle anterior **no** contenía `_invalidateSocket` (0 ocurrencias); el nuevo sí (1 en la tabla de símbolos y referencias en `connect`/`disconnect`).

### 15.3 Instalación/actualización en user 999

```console
$ adb install -r --user 999 <apk>     # 14:12:22 → Failure [INSTALL_FAILED_USER_RESTRICTED: Install canceled by user]
# MIUI abrió com.miui.securitycenter/.../AdbInstallActivity y la canceló (PKMSImpl MIUILOG uid=2000 installerPkg=null)
$ adb install -r --user 999 <apk>     # 14:14:56, diálogo “¿Instalar esta aplicación vía USB?”
# → tap únicamente en “Instalar” (NO se tocó “Recordar mi elección”)
# Performing Streamed Install / Success
$ adb shell pm list packages --user 0   | grep -c '^package:com.chatti.mobile.qa$'   # 0
$ adb shell pm list packages --user 999 | grep -c '^package:com.chatti.mobile.qa$'   # 1
$ adb shell dumpsys package com.chatti.mobile.qa | grep lastUpdateTime
# lastUpdateTime=2026-11-18 14:14:56   (firstInstallTime=2026-11-18 13:45:19 → datos conservados)
```

- **Causa raíz del `INSTALL_FAILED_USER_RESTRICTED` (diagnóstico local, solo lectura):** no es el toggle. `AdbInstallActivity` (`com.miui.securitycenter`) se creó a las **14:12:25.449** y se cerró a las **14:12:37.431** (`wm_finish_activity … app-request`) sin confirmación, con `install msg : Failure [INSTALL_CANCELED_BY_USER]` / `PKMSImpl: MIUILOG- assertCallerAndPackage: uid=2000, installerPkg=null`. El diálogo muestra el contador `Denegar (10 → 2)` y caduca si no se pulsa **Instalar**: es una confirmación **por instalación**, no una política de desarrollador. En la sesión §14 ya ocurrió lo mismo y se resolvió confirmando el diálogo; el toggle “Instalar vía USB” estaba y sigue **ON**, sin escritura.
- **Alcance exacto del diálogo:** la actividad es el instalador del sistema (`AdbInstallActivity`, paquete `com.miui.securitycenter`) y la etiqueta mostrada es **`ChatTi QA16`** (nombre de `app.json` de la copia QA; producción es `Chat-Ti`). El comando fija `--user 999`; el resultado lo confirma el estado por usuario: `User 0: installed=false`, `User 999: installed=true`, y `SHA-256(base.apk de user 999)` = `2868e8cb…` (idéntico al build). No hubo diálogo para otro paquete ni para el perfil 0, y no quedan sesiones de instalación pendientes (`cmd package list staged-sessions` vacío).
- Se repitió el **mismo comando autorizado**; el único acto adicional fue confirmar el diálogo MIUI del propio instalador (autorización de instalación MIUI ya existente). **No** se activó/desactivó ningún toggle, no se usó otra vía de instalación, no se cambió SIM/cuenta Mi ni ajustes.
- **Reconciliación con la lectura independiente del host (2026-11-18 14:49 CET, solo lectura, sin taps):** la afirmación “el APK viejo sigue instalado en 999” **no se sostiene** con el estado del paquete. `SHA-256(base.apk de user 999)` = **`2868e8cb…`** (el build nuevo, no el histórico `54a43251…` de §14), `assets/index.android.bundle` = **`5b96326e…`** con marcador `_invalidateSocket` = 1, `lastUpdateTime=14:14:56` y `User 999: installed=true` / `User 0: installed=false`. Los dos `INSTALL_FAILED_USER_RESTRICTED` fueron los **intentos 1 y 2**; el **intento 3 (14:14:56) fue `Success`**. Por tanto **no existe update pendiente ni diálogo del package installer**: ahora mismo no hay `AdbInstallActivity`/`PackageInstaller` en actividades ni ventanas, `pm list staged-sessions` está vacío y la última destrucción de `AdbInstallActivity` es de **14:14:56.875** (logcat solo lectura). Foreground actual leído: `u999 com.chatti.mobile.qa/.MainActivity` (el host lo vio en el Launcher de `u0`; en cualquier caso no hay instalador en primer plano). **No se ejecutó ningún `adb install` nuevo, ni uninstall, ni `pm clear`, ni actualización de otro paquete.**
- Lanzamiento explícito con `adb shell am start --user 999 -n com.chatti.mobile.qa/.MainActivity`. MIUI mostró su selector “Seleccionar aplicación” (dos entradas `ChatTi QA16`, igual que §14); se eligió la entrada derecha (`android.miui:id/app2`) y se verificó **antes de cualquier interacción**:
  - `mResumedActivity: ActivityRecord{… u999 com.chatti.mobile.qa/.MainActivity}` y `mFocusedApp` = la misma actividad `u999`.
  - `ps -A`: `u999_a241 15587 … com.chatti.mobile.qa` (único proceso QA, UID del user 999).
- Backend: solo `wrangler dev --port 8788 --ip 127.0.0.1` desde `backend/` (`Ready on http://127.0.0.1:8788`, `GET /` y `/api/rooms` = 200). `adb reverse tcp:8788 tcp:8788` activo durante las pruebas. Sin `deploy` ni contacto con producción.
- **Corrección del procedimiento de parada (2026-11-18 14:50–14:52):** los `workerd` hijos se lanzan con `--socket-addr=entry=127.0.0.1:0` (puerto efímero) y un `--external-addr=loopback=…`; por eso un patrón basado en `:8788` no los alcanza. La versión corregida de `worker-ctl.sh` selecciona el árbol por `exe` + `cmdline` + `cwd` del backend QA, para con `SIGTERM` (wrapper, CLI y ambos `workerd`) y exige `RESIDUALES=` vacío antes de arrancar. El arranque usa `setsid` y espera la línea literal `Ready on http://127.0.0.1:8788`; si aparece `Address already in use`, aborta.
- Cuenta/sala **sintéticas**: `qa16tester#0002`, sala `c263a9ze` (`QA16-Reconnect-Local`); contraseña no documentada. Logcat local filtrado `ReactNativeJS:V *:S`.

### 15.4 Evidencia por criterio

| # | Criterio | Resultado | Evidencia (CET; logcat PID 15587 / logs del Worker) |
|---|---|---|---|
| a | Un retry vuelve a unirse con el **mismo `userId`** del join inicial | **PASS** (re-ejecutado 14:51 con parada correcta del árbol) | Join inicial **14:51:14.321** `userId=user_1795009874287_k8p2w6n9f` (Worker: 1 join). Parada con **SIGTERM al árbol exacto** `121026/121044/121088/121116` a las **14:51:25.177** (`RESIDUALES=` vacío; `ss` sin LISTEN; `curl` sin respuesta) → `Disconnected. Code: 1006` 14:51:25.248. Attempt 1 14:51:27.254 (aún sin listener), attempt 2 **14:51:31.282** → `✅ Connected` 14:51:31.308 y `user_joined` **14:51:31.358** con **`userId=user_1795009874287_k8p2w6n9f`** (idéntico). Worker nuevo `s15-a3b` (`Ready on` 14:51:30.342): **1** `101 Switching Protocols` + **1** join a las 14:51:31; el Worker anterior no registra actividad posterior. |
| b | `disconnect()` cancela el retry pendiente; un `close` tardío no reinicia | **PASS** | Secuencia exacta: Worker detenido **14:21:18.395**; último evento previo `Disconnected. Code: 1006` + `Reconnecting... (attempt 1)` a las **14:21:18.488** (el retry habría disparado ≈14:21:20.488). `BACK` a las **14:21:20.088** (400 ms antes del retry). Ventana vigilada **14:21:20.088 → 14:21:54.095** (30.007 s; Worker ya reiniciado a las 14:21:24.092 con `Ready on`): **0** `Connecting to:`, **0** `✅ Connected`, **0** `user_joined`, **0** `Reconnecting`. Log del Worker (líneas sin timestamp): contiene exactamente **2** `101 Switching Protocols` y **2** `joined room`; el logcat con timestamps los sitúa en **14:22:28.561** y **14:22:32.789**, ambos posteriores a la ventana, así que **dentro de la ventana: 0 upgrades y 0 joins**. A las **14:22:02.250** el dump sigue mostrando la lista de salas. La siguiente actividad es la **reentrada manual deliberada** (tap en la tarjeta `[59,401][1021,638]`, centro 540,519) a las **14:22:28.437** → `Connecting to:` **14:22:28.561** (+124 ms) y `user_joined` con **userId nuevo** `user_1795008148561_dutd2xec5`. **No es un retry:** no hubo intentos automáticos en 70 s y el id se genera en ese instante por el `connect()` manual. |
| c | Un socket obsoleto no interfiere con una conexión nueva (salida/reentrada rápida por UI) | **PASS (ruta de app real)** | Entrada 1 14:22:28.561/586/591; `BACK` 14:22:31.065; entrada 2 14:22:32.789/808/821: exactamente **2** `Connecting to:`, **2** `✅ Connected`, **2** `user_joined`; **0** `Reconnecting` y **0** `Disconnected` en la ventana. Worker: **2** `101 Switching Protocols` + **2** joins. Identidades nuevas por entrada (`…148561_dutd2xec5` y `…152789_qr3v35n2p`), consistente con F2 (un `connect()` manual sin `userId` no hereda el anterior). **Limitación:** el caso directo `connect()` sobre un socket aún OPEN no es alcanzable desde la UI; su cobertura es el harness de implementación **19/19** (§8.2), no esta prueba. |
| d | Mensajería normal sin duplicados | **PASS** | Envío 14:24:50 de `qa16-s15-ping-142439` (id `1795008290521-i20s7cg15`): **1** `📨 Received: message` en logcat, **1** `Message persisted and broadcast` en el Worker, **1** fila con ese id en `GET /api/room/c263a9ze/messages` (2 mensajes totales), **1** aparición en la UI. Sin duplicados. |

Nota de secuencia en (b) — **aclaración de la reentrada de 14:22:28:** ese `user_joined` **no** es un retry. Está precedido **124 ms** antes por el tap deliberado en la tarjeta de sala (`14:22:28.437`), y el dump `ui-after-back-s15.xml` de **14:22:02.250** confirma que la app seguía en la lista de salas. Entre el `BACK` (`14:21:20.088`) y ese tap transcurren **68.349 s** sin ningún `Connecting to:` / `user_joined` / `Reconnecting`. El retry pendiente (≈`14:21:20.488`) nunca disparó; además, un retry habría conservado la identidad de la sesión, mientras que aquí aparece `user_1795008148561_dutd2xec5`, generado a las 14:22:28.561 por el `connect()` manual sin `userId` (F2). Los **2** upgrades/joins del final de `s15-b.log` son esta reentrada manual y la de (c) (14:22:32.789), **no** actividad de (b). Si el join hubiera sido automático, (b) sería FAIL; la evidencia lo descarta.

Nota de método en (a) — **corregida**: la primera parada de esta sesión (14:27) usó un patrón que solo terminó el wrapper/CLI de `wrangler` y dejó **4 procesos `workerd` huérfanos** (PIDs `111415`, `111679`, `113062`, `113796`; todos con `cwd=backend/` y PGIDs de esta sesión QA). Esa evidencia queda **retirada** y sustituida por la re-ejecución de las 14:51. Verificación de la instancia antes de actuar: no existían los PIDs `109817/109833/109862/109891` citados en la inspección externa, `:8788` no tenía LISTEN (`ss`, `/proc/net/tcp`, `curl`), y los únicos residuos eran esos 4 `workerd`, detenidos con `SIGTERM` exacto. Para la prueba válida se usó `worker-ctl.sh`, que termina con **SIGTERM** únicamente el árbol del backend QA (node `wrangler dev --port 8788` + `workerd` con `cwd=backend/`), comprueba que no quedan PIDs, y valida el puerto con **tres métodos** (`ss -ltn`, `/proc/net/tcp` en estado `0A` LISTEN y `curl`). No se tocó red, modo avión, Wi-Fi ni datos móviles, ni se usó `pkill -f` amplio.

### 15.5 Limpieza y estado final

- Worker local detenido (re-verificación final **14:52:25.199**: `TERM` a `121497/121515/121546/121574`, `RESIDUALES=` vacío, `ss` sin LISTEN, `/proc/net/tcp` sin estado `0A` y `curl` sin respuesta → `PORT_FREE`). `adb reverse tcp:8788` retirado (`adb reverse --list` vacío). Logcat detenido. Sin procesos `wrangler`/`workerd` del backend QA en el host.
- Toggle MIUI **sin cambios**: `install_non_market_apps=1` (leído, nunca escrito), `verifier_verify_adb_installs=0`. Sin otros ajustes, SIM/cuenta Mi, ni cambios de red.
- `com.chatti.mobile.qa`: **solo** user `999` (user `0` = 0), `1.0.0-qa16`, `lastUpdateTime=14:14:56`; sin `pm clear`, sin desinstalar y sin borrar datos (el historial `qa16-ping-1` de 13:53 seguía visible).
- `com.chatti.mobile` intacto: user `0` presente, `base.apk` SHA-256 **`26749e5a…`** idéntico antes/después.
- Repo: `src/` sin cambios (`ddbc8af9…`, diff `4d1df4f3…`); sin commit/push/PR/deploy ni cambios en GitHub/Trello/`STATUS.md`/`WAVE-3.md`/informe de implementación. Único fichero editado por esta célula: este `REPORT.md`.
- Evidencia local (no versionada): `/tmp/opencode/qa-mobile16/s15/` (`gradle-s15.log`, `install-s15*.out`, `install-tap.log`, `logcat-s15.txt`, `logcat-s15-a2.txt`, **`logcat-a3.txt`**, `wrangler-s15-*.log`, **`s15-a3.log`/`s15-a3b.log`**, `hbc-new.txt`, `api-msgs-s15.json`, APK/instalado, **`qa-final-a3.apk`**, **`prod-base-final-a3.apk`**). Sin capturas de pantalla ni árboles enviados a servicios externos; volcados UI temporales del teléfono eliminados.
- **Cierre de sesión (2026-11-18 15:07:32 CET) — re-verificación final, solo lectura:** sin procesos `wrangler`/`workerd` del backend QA; `:8788` libre (`ss` sin LISTEN, `/proc/net/tcp` sin estado `0A`, `curl` → `000`); `adb reverse --list` vacío; logcat parado; sin temporales en `/sdcard`; sin sesiones de instalación pendientes. `install_non_market_apps=1` y `verifier_verify_adb_installs=0` (solo lectura, sin escritura). QA **solo** user `999` (`0` coincidencias en user `0`) con `2868e8cb…` y `lastUpdateTime=14:14:56`; producción user `0` presente con `base.apk` **`26749e5a…`** idéntico. Coincide con la comprobación independiente del host. No se ejecutó ningún cambio de estado, instalación ni desinstalación en este cierre.

### 15.6 Decisión QA vigente

- **Veredicto por criterio:**
  - **(a) PASS** — re-ejecutado 14:51 con `SIGTERM` al árbol completo y verificación triple de `:8788`; retry reúne con el **mismo** `userId` (`user_1795009874287_k8p2w6n9f`). Evidencia 14:27 retirada.
  - **(b) PASS** — ventana exacta `14:21:20.088 → 14:21:54.095` (30.007 s) sin `Connecting`/`user_joined`/`Reconnecting`; la actividad de 14:22:28 es reentrada **manual** (tap 124 ms antes), no retry.
  - **(c) PASS, con limitación** — ruta real de UI: 2 `Connecting` / 2 `Connected` / 2 `user_joined` y 0 eventos espurios. El sub-caso `connect()` directo sobre un socket aún OPEN no es alcanzable desde la UI; su cobertura es el harness de implementación **19/19**, no esta prueba.
  - **(d) PASS** — `qa16-s15-ping-142439` (id `1795008290521-i20s7cg15`): 1 recepción en logcat, 1 persistencia en Worker, 1 fila API, 1 aparición en UI; sin duplicados.
  - **NOT COVERED: ninguno** de los cuatro criterios.
- **QA sign-off: ✅ OTORGADO** para los criterios a–d, **exclusivamente** sobre:
  - fuente `src/services/ChatService.js` SHA-256 `ddbc8af979ce94491d80297e5d0024dbda98c9307f1406bc93d0b22d58b4c457`, diff `4d1df4f339f60f11ed8dc3d43dd578c0fc01814840127a711ff2a23c7a716986`;
  - APK `2868e8cbaeb4b89288d1dc2577509f6044d5a69a0e32f89087c577cd29907c74` (instalado y verificado por hash en user 999).
- **CTO/Staff sign-off al cerrar la sesión QA: ⏳ PENDIENTE en ese momento y todavía pendiente para QA/APK.** La revisión CTO posterior (run ordinal 1) aprobó **únicamente fuente/diff**; no cubrió la evidencia funcional ni el APK. La revisión de PR `PRR_kwDOQljQxc8AAAABY0tjdg` fue `REQUEST_CHANGES` (§§15.7 y 15.10).
- **Estado #16: OPEN / IN PROGRESS** (QA sign-off obtenido para el artefacto exacto; sign-off CTO de QA/APK pendiente; sin commit/push/PR ni cambio de estado externo por esta célula). No se promueve a `master`/producción; el merge a `dev` fue ejecutado por Staff (§15.9).

### 15.7 Addendum Staff — revisión CTO posterior (alcance corregido)

Después de la decisión QA de §15.6, una revisión CTO independiente, read-only y gestionada por T3 Code se registró en el hilo `mcp:ec582871-66d1-4ee5-acbc-d00f796d8189`, run `run:thread:mcp%3Aec582871-66d1-4ee5-acbc-d00f796d8189:ordinal:1` (**no** es el run QA final; véase §15.10).

- **Alcance real de esa aprobación:** technical sign-off **solo sobre fuente y diff**: fuente SHA-256 `ddbc8af979ce94491d80297e5d0024dbda98c9307f1406bc93d0b22d58b4c457` y diff SHA-256 `4d1df4f339f60f11ed8dc3d43dd578c0fc01814840127a711ff2a23c7a716986`. **No aprobó la evidencia QA (§15.4) ni el APK `2868e8cbaeb4b89288d1dc2577509f6044d5a69a0e32f89087c577cd29907c74`.** Las versiones anteriores de este addendum que afirmaban lo contrario quedan corregidas.
- Los hallazgos A2–A7 se registraron como no bloqueantes o de seguimiento/preexistencia; el detalle está en ese hilo T3. El hallazgo A1 (nombre de rama) se corrigió en `MOBILE-16-RECONNECT/TASK.md`; la autorización de entrega está en `.mece/cells/MOBILE-16-RECONNECT/TASK.md`.
- La revisión posterior de PR #66 `PRR_kwDOQljQxc8AAAABY0tjdg` terminó en **`REQUEST_CHANGES`**; por tanto **no** constituye aprobación CTO de QA/APK.
- **Pendiente:** revisión CTO/Staff de la evidencia QA corregida y del cotejo del APK. #16 queda OPEN / IN PROGRESS; no se declaró DONE ni se promovió a producción.

### 15.8 Addendum Staff — publicación de la rama y PR

- Commit `ea2f5a8ec6e1c432e1e230bb42a9d7b858c70588` publicado en `bugfix/mobile-16-session-reconnect-android-qa` desde la base `dev` `dd3d72ce83d106a6aca806f7727595553baaef6b`.
- [PR #66](https://github.com/wz0un/chatti-mobile/pull/66) abierto hacia `dev`. En la comprobación inicial no había workflow runs, checks ni reviews; queda pendiente la revisión del PR. **(Snapshot histórico, superado: la revisión `PRR_kwDOQljQxc8AAAABY0tjdg` quedó `REQUEST_CHANGES` y Staff mergeó el PR como `5a0e1ae57377a7fde1945f3252efc3b4391c4184`; véase §§15.9–15.10.)**
- El APK QA continúa instalado únicamente en XSpace user `999`; el Worker local está detenido, `adb reverse` está vacío, el APK de producción no cambió y el ajuste MIUI permanece como estaba.
- #16 sigue OPEN / IN PROGRESS. No se cerró el issue y no se cambió Trello. **(Snapshot histórico: en ese momento el PR aún no se había mergeado; el merge posterior a `dev` no cambia este estado.)**

### 15.9 Addendum QA — revisión del PR #66 y cotejo del artefacto (solo lectura)

Revisión posterior a la publicación, ejecutada el **2026-11-18 entre 17:20 y 17:30 CET** en T3 Code (hilo `mcp:81055c85-c0d9-4e23-a9f4-6aad77d9d16f`). Todo el trabajo fue **lectura**: `git` local, `gh`/API de GitHub y ADB en modo consulta. Sin commit, push, PR, deploy, instalación, desinstalación, `pm clear` ni cambios de ajustes.

**Estado del PR al revisarlo:** [PR #66](https://github.com/wz0un/chatti-mobile/pull/66) — `fix(mobile): stabilize room WebSocket reconnect (#16)` — está **MERGED** desde `2026-11-18T15:51:47Z` por `wz0un` (Staff), con merge commit **`5a0e1ae57377a7fde1945f3252efc3b4391c4184`** en `origin/dev`. Base `dev` `dd3d72ce83d106a6aca806f7727595553baaef6b`; head `bugfix/mobile-16-session-reconnect-android-qa` `0936f33f9d2c41097cae81137e1b99b8cf007b23` (`refs/pull/66/head`). 8 ficheros (`+1827/−23`): 6 de documentación/`.mece`, `docs/STATUS.md` y **solo** `src/services/ChatService.js` como código de app. Reviews en ese momento: **0** (snapshot de las 17:20 CET; la revisión posterior `PRR_kwDOQljQxc8AAAABY0tjdg` quedó `REQUEST_CHANGES`, §15.10). Checks: **2** `Workers Builds` (`chatti-workers` `SUCCESS` 14:02:53Z; `chatti-web` `SUCCESS` 14:03:57Z, ambos sobre `0936f33f`), disparados por el push de la rama; no son despliegues de la app móvil y esta célula no ejecutó ningún `deploy` (solo `wrangler dev` local en `127.0.0.1:8788` en la sesión anterior). Issue **#16: OPEN** (`updatedAt 2026-09-20T14:28:56Z`).

**Cotejo artefacto ↔ PR (17:24–17:27 CET):**

| Artefacto | Valor del QA sign-off (§15.6) | Comprobación de esta revisión | Resultado |
|---|---|---|---|
| Commit head / merge | `0936f33f…` / — | `0936f33f…`; merge `5a0e1ae…` en `origin/dev` | ✅ coincide |
| Fichero fuente | SHA-256 `ddbc8af9…` | `git cat-file -p 0936f33:src/services/ChatService.js \| sha256sum` = **`ddbc8af979ce94491d80297e5d0024dbda98c9307f1406bc93d0b22d58b4c457`** | ✅ coincide |
| Fuente leída desde GitHub | — | `gh api …/contents/src/services/ChatService.js?ref=0936f33…` → 10.425 bytes, blob `65251fe8…`, SHA-256 **`ddbc8af9…`** | ✅ coincide con el worktree |
| Blob git del fuente | — | `65251fe8672ebcc9a26865cd8642097fef52356a` en `0936f33`, en el worktree y en el merge `5a0e1ae` | ✅ idéntico |
| Diff del fuente | SHA-256 `4d1df4f3…` | reproducido con la invocación de abajo | ✅ coincide |
| APK QA instalado (user 999) | SHA-256 `2868e8cb…` | `adb pull` del `base.apk` de user `999` = **`2868e8cbaeb4b89288d1dc2577509f6044d5a69a0e32f89087c577cd29907c74`** | ✅ coincide |
| Bundle del APK | `5b96326e…` | `assets/index.android.bundle` = **`5b96326ece96eb2e3caba46cfbb87a0d8f17684d5bfe58632e37059ccf726b08`**; `_invalidateSocket`=1, `_socketGeneration`=1, `reconnectTimer`=1, `_autoReconnect`=1, `intentionalDisconnect`=1 | ✅ coincide |
| Producción (user 0) | `26749e5a…` | `base.apk` = **`26749e5a16780ca2a6f150c132cf983515119935da15ddf66d82fe8eac69f783`**; `master`/`origin/master` `c5610c9` con blob `b4677ac` (pre-fix) | ✅ sin cambios |

**Reproducción exacta del hash de diff `4d1df4f3…`** (el repo tiene `diff.mnemonicPrefix=true`, de ahí los prefijos `i/` y `w/`):

```console
$ git rev-parse 0936f33:src/services/ChatService.js
65251fe8672ebcc9a26865cd8642097fef52356a
$ git diff --no-color --src-prefix=i/ --dst-prefix=w/ \
    dd3d72ce83d106a6aca806f7727595553baaef6b \
    0936f33f9d2c41097cae81137e1b99b8cf007b23 \
    -- src/services/ChatService.js | sha256sum
4d1df4f339f60f11ed8dc3d43dd578c0fc01814840127a711ff2a23c7a716986  -
$ git diff --numstat dd3d72c 0936f33 -- src/services/ChatService.js
87	18	src/services/ChatService.js
```

- El mismo cambio con `a/`/`b/` da `2f0d02fc…` y con `--no-prefix` da `4cbc39ee…`: **el hash identifica artefacto + forma de invocación**, no un contenido distinto. El `4d1df4f3…` del sign-off se reproduce con la línea de arriba.
- La API de GitHub muestra el fichero como **`+88/−19`** frente a **`+87/−18`** de `git`: GitHub alinea como borrado+alta una línea en blanco que `git diff` mantiene como contexto. No es una discrepancia de contenido: el blob resultante es `65251fe8…` / `ddbc8af9…` en todos los lados.
- `retryGeneration` aparece **0** veces como cadena en el bundle porque es un `const` local de `connect()` (líneas 135–139 del fuente) que el minificador renombra; las guardas sí están presentes (`_socketGeneration`, `reconnectTimer`, `_invalidateSocket`, `_autoReconnect`) y su efecto se validó en (a) y (b). No hay divergencia de código.

**Estado del dispositivo y del entorno tras la revisión (17:27:48 CET, solo lectura):** sin procesos `wrangler`/`workerd`; `:8788` sin LISTEN; `adb reverse --list` vacío; QA **solo** en user `999` (`0` coincidencias en user `0`), `versionName=1.0.0-qa16`, `lastUpdateTime=14:14:56`; producción user `0` intacta con `26749e5a…`; `install_non_market_apps=1` y `verifier_verify_adb_installs=0` (leídos, nunca escritos). No se instaló, desinstaló ni limpió nada.

**Discrepancias y limitaciones:**

1. **`docs/STATUS.md` en `dev` quedó obsoleto tras el merge** (no afecta al artefacto ni al veredicto): sigue diciendo que el PR #66 está “abierto hacia `dev`, sin merge” (líneas 3, 110 y 164 de `docs/STATUS.md` en `5a0e1ae`), mientras que el merge ocurrió a las 15:51:47Z. Reproducción: `git show origin/dev:docs/STATUS.md | grep -n "PR #66"`. No hay ninguna afirmación de DONE ni de issue cerrado (correcto según el DoD). **Acción recomendada:** que Staff actualice `STATUS.md` en una rama `docs/*`/`chore/*` desde `dev`; esta célula QA no lo edita.
2. **La evidencia local ya no existe:** `/tmp/opencode/qa-mobile16/s15/` (logcat, logs del Worker, APKs de build, `hbc-new.txt`, `api-msgs-s15.json`) fue eliminada junto con el resto de `/tmp/opencode` (directorio vacío, `mtime 15:39 CET`). La traza primaria de §15.4 es la versión **commiteada en `0936f33`**; esta revisión re-verificó el estado del dispositivo y los hashes, no los logs crudos. Una recompilación permitiría repetir la validación funcional, pero **no** reproducir byte a byte el APK. No se re-ejecutaron las pruebas a–d. **En la ejecución documental del 2026-11-19 (§15.10) tampoco se accedió al dispositivo ni se reejecutó QA.**
3. **El merge no cambia el veredicto QA:** los criterios a–d se validaron sobre el mismo fuente/diff/APK que ahora está en `dev`; no hay re-testeo nuevo ni cambio de hash. La promoción a `master`/producción sigue pendiente y es decisión de Staff (PR aparte).

**Decisión de esta revisión:** el artefacto mergeado en `dev` es **idéntico** al que recibió QA sign-off (§15.6): fuente `ddbc8af9…`, diff `4d1df4f3…`, APK `2868e8cb…`. La revisión CTO de §15.7 cubrió **solo fuente/diff**, no QA/APK. El veredicto **(a) PASS, (b) PASS, (c) PASS con limitación, (d) PASS** se mantiene. **#16 sigue OPEN / IN PROGRESS**: no se declara DONE ni se cierra; el cierre y la promoción corresponden a Staff. Único fichero modificado por esta célula: este `REPORT.md` (sin commit).

### 15.10 Addendum QA — trazabilidad documental 2026-11-19 (solo documento)

**Ejecución T3 actual:** thread `mcp:81055c85-c0d9-4e23-a9f4-6aad77d9d16f`, run **`run:thread:mcp%3A81055c85-c0d9-4e23-a9f4-6aad77d9d16f:ordinal:9`**, provider `opencode`, modelo `opencode/big-pickle`, 2026-11-19 22:57 CET. El run QA final histórico sigue siendo `run:thread:mcp%3A81055c85-c0d9-4e23-a9f4-6aad77d9d16f:ordinal:7` (§15); el `ordinal:1` del hilo `mcp:ec582871-66d1-4ee5-acbc-d00f796d8189` pertenece a la revisión CTO, **no** al QA.

**Alcance:** solo ediciones puntuales y aditivas en este `REPORT.md` del worktree `/home/mohsine/.codex/worktrees/89b3/chatti-mobile`. Sin ADB/dispositivo, sin repetir pruebas, sin recompilar, reinstalar ni cambiar ajustes; sin tocar código, otros informes, GitHub/Trello, commits, pushes ni PRs. El worktree `/home/mohsine/.codex/worktrees/a7b8/chatti-mobile` **no se modificó**: antes de esta edición su diff sin commitear de este informe tenía SHA-256 `c7d3c69d4859557866b7ebd6cde588d2572cba2ad8d685e105af15006d779795` y el fichero `04e92729eba36090e696cc0747f87dbed60d85ebf98541226cdb7f411a9fe565`; permanece byte-idéntico.

**Qué se corrigió (sin cambiar veredictos ni hashes):**

1. **Atribución CTO:** la aprobación del run `mcp:ec582871-…:ordinal:1` era **solo fuente/diff** (`ddbc8af9…` / `4d1df4f3…`). Se eliminó toda afirmación de que aprobó la evidencia QA o el APK `2868e8cb…` (§§cabecera, 15, 15.6 y 15.7).
2. **Revisión de PR:** la revisión posterior `PRR_kwDOQljQxc8AAAABY0tjdg` de PR #66 terminó en **`REQUEST_CHANGES`**; no equivale a aprobación CTO de QA/APK. El “Reviews: 0” de §15.9 era un snapshot de las 17:20 CET y queda acotado como histórico.
3. **Run QA final:** se mantiene `...:ordinal:7` en el hilo `mcp:81055c85-…`; el `ordinal:1` citado en el pasado era del CTO. Esta ejecución se registra arriba con `ordinal:9`.
4. **Snapshots del PR:** los textos que decían “PR #66 abierto / sin merge” (§15.8 y `docs/STATUS.md` en `5a0e1ae`) quedan marcados como históricos; Staff lo fusionó a `dev` como **`5a0e1ae57377a7fde1945f3252efc3b4391c4184`**. #16 y Trello siguen **OPEN / IN PROGRESS**; no hay promoción a `master`/producción ni DONE.
5. **Disponibilidad de evidencia:** los logs crudos de `/tmp/opencode/qa-mobile16/s15/` ya no existen; no se reejecutó QA en esta ejecución ni en la revisión de §15.9. La evidencia funcional es la registrada en §15.4 y conservada en el commit `0936f33f…`.

**Evidencia histórica conservada:** bloqueos y diagnosis de §§1–13; PASS histórico de §14 sobre APK `54a43251…` (expresamente no vigente); preparación, hashes, ventanas y decisiones de §15.1–15.5; veredicto a–d de §15.6; cotejo PR/artefacto de §15.9. Nada se eliminó ni se reescribió en su totalidad.

**Revisión pendiente:** CTO/Staff debe revisar y aprobar explícitamente la **evidencia QA corregida y el APK `2868e8cb…`** (además de la fuente/diff ya aprobada). Hasta que ese sign-off exista, no se declara DONE, no se cierra #16/Trello y no se promueve a producción.

### 15.11 Addendum cronológico — cierre documental del estado QA (2026-11-19)

- **Ejecución de este addendum (solo documento):** T3 thread `mcp:81055c85-c0d9-4e23-a9f4-6aad77d9d16f`, run **`run:thread:mcp%3A81055c85-c0d9-4e23-a9f4-6aad77d9d16f:ordinal:10`**. Sin dispositivo, pruebas, rehash de APK, cambios de código ni trackers; sin commits, pushes ni PRs.
- **CTO follow-up que cierra la revisión pendiente de §15.10:** thread `mcp:ec582871-66d1-4ee5-acbc-d00f796d8189`, run ordinal **3** (`run:thread:mcp%3Aec582871-66d1-4ee5-acbc-d00f796d8189:ordinal:3`). Aprobó la **revisión documental y la evidencia QA histórica** para el artefacto exacto: fuente SHA-256 `ddbc8af979ce94491d80297e5d0024dbda98c9307f1406bc93d0b22d58b4c457`, diff SHA-256 `4d1df4f339f60f11ed8dc3d43dd578c0fc01814840127a711ff2a23c7a716986` y APK SHA-256 `2868e8cbaeb4b89288d1dc2577509f6044d5a69a0e32f89087c577cd29907c74`.
- **Informes aprobados en ese review (SHA-256):** QA-MOBILE-16-RECONNECT/REPORT.md `7400fdd0c1ad968daaa8111d11e7ef1a13b661d023d532a58c6f749dd58676aa`; MOBILE-16-RECONNECT/REPORT.md `49069d92a3f933558de43bc087c4ff1dc304c9cb5bcdd108990574da04b90bff`.
- **Alcance de la aprobación:** es **histórica y aplicable al snapshot QA/implementación previo** identificado por esos hashes. Los logs crudos de `/tmp/opencode/qa-mobile16/s15/` ya no existen; **no hubo reejecución de QA ni rehash fresco del APK** en este follow-up. La aprobación se apoya en la evidencia registrada, no en una nueva medición.
- **Estado vigente:** #16 y Trello permanecen **OPEN / IN PROGRESS**; **no DONE**, sin promoción a producción. Este addendum es una **actualización documental posterior**, no altera la evidencia, el QA funcional, el dispositivo ni otros archivos; deja satisfecho, por cronología, el sign-off pendiente registrado en §15.10 para ese snapshot histórico.
### 15.12 Addendum cronológico — snapshot 2026-11-22 tras el `REQUEST_CHANGES` del auditor (histórico; estado actual §15.13)

- **Ejecución de este addendum (solo documento):** T3 thread `mcp:81055c85-c0d9-4e23-a9f4-6aad77d9d16f`, run **`run:thread:mcp%3A81055c85-c0d9-4e23-a9f4-6aad77d9d16f:ordinal:12`**, 2026-11-22 19:40 CET. Sin dispositivo, ADB, pruebas, rehash de APK, cambios de código/trackers, commits, pushes ni PRs. No se reejecutó QA funcional.
- **Nota cronológica de atribución (borrador §15.12 run ordinal 12 → corrección run ordinal 13):** el borrador inicial de §15.12 (run ordinal 12) contenía una atribución equivocada: presentaba al CTO principal ordinal 4 como emisor del `REQUEST_CHANGES`. El `REQUEST_CHANGES` real provino del **auditor independiente T3** en el hilo `thread:delegated-task:command%3Amcp%3A2a912ee0-4d39-44c1-b6fc-1ec390bfded0%3Adelegate-task%3A071ea9d3-3786-4ea1-9c28-edd68dc134c1`, run ordinal **1** ([review thread](t3-thread://v2/39965b4d-5f2a-4a0f-96a4-e78e93c02ef4/thread:delegated-task:command%3Amcp%3A2a912ee0-4d39-44c1-b6fc-1ec390bfded0%3Adelegate-task%3A071ea9d3-3786-4ea1-9c28-edd68dc134c1)), sobre los snapshots QA SHA `1d817209347b1a0c5fa1fc91b88e51b1578410ef61943717b9c8160291cb3230` e implementación SHA `3675cd00e677e0a5770790856644b6984877781c16283f7ea69f7f0e8dfaf3cf` publicados en head `376b210`. Los CTO ordinales **3** y **4** (`mcp:ec582871-…`) se conservan como **PASS históricos con sus alcances originales, no revocados**; el ordinal 4 fue un PASS documental anterior sobre otros snapshots. En consecuencia, el encabezado/estado del 19-11 y los addenda §§15.10–15.11 pasan a ser **históricos** por ese review del auditor. El PASS funcional de a–d no se modifica. Esta corrección no reejecutó pruebas ni cambió artefactos.
- **PASS histórico (inalterado):** QA ordinal 7 (`run:thread:mcp%3A81055c85-c0d9-4e23-a9f4-6aad77d9d16f:ordinal:7`) otorgó PASS en **(a–d)** **únicamente** para fuente SHA-256 `ddbc8af979ce94491d80297e5d0024dbda98c9307f1406bc93d0b22d58b4c457`, diff SHA-256 `4d1df4f339f60f11ed8dc3d43dd578c0fc01814840127a711ff2a23c7a716986` y APK SHA-256 `2868e8cbaeb4b89288d1dc2577509f6044d5a69a0e32f89087c577cd29907c74`. No cubre otros artefactos ni una ejecución nueva.
- **Retest móvil ordinal 11: BLOCKED.** Run `run:thread:mcp%3A81055c85-c0d9-4e23-a9f4-6aad77d9d16f:ordinal:11`. `device_list` mostró solo el host `local`, Android `available: false` con el error exacto **`Android SDK was not found. Install it with Android Studio or set ANDROID_HOME to your SDK directory.`**, `hubInstalled: false`, `agentDeviceInstalled: false` (requeridos `hub 0.22.1` / `agent-device 0.21.36`) y `devices: []`. No hubo `device_open`, interacción de UI, ADB, taps ni capturas. **No fue PASS ni reejecución funcional** y no generó evidencia nueva.
- **Cloudflare / PR #68:** Staff confirmó que los eventos Cloudflare previos eran **esperados** y autorizó publicar #68. El bot de Cloudflare reportó `build/deployment successful` en **production** para el commit `376b210cc6c7c3342084d5b6f8ea3b6450f0e91d`:
  - `chatti-workers`: build `751d3736-3152-4ada-8482-4725f2ff0896`, **2026-11-22 18:29 UTC**, comentario https://github.com/wz0un/chatti-mobile/pull/68#issuecomment-7022204233
  - `chatti-web`: build `401e499c-1b2b-4e4b-843b-1d3f7c4d2ef4`, **2026-11-22 18:30 UTC**, comentario https://github.com/wz0un/chatti-mobile/pull/68#issuecomment-7023985372

  Esto es **el reporte del bot sobre la automatización tras el push**; no implica que QA haya probado producción, que alguien ejecutara manualmente un deploy ni que se verificara el runtime de forma independiente. Esta célula no desplegó ni verificó esos builds.
- **Estado vigente:** #16 y Trello siguen **OPEN / IN PROGRESS**; #67 queda **supersedido/cerrado**; #68 está **abierto y pendiente de review**. **No hay DONE ni promoción a `master`.** Sin cambios en trackers, código, dispositivo ni otros archivos.
- **Trazabilidad de limpieza (run ordinal 14):** hilo QA mcp:81055c85-c0d9-4e23-a9f4-6aad77d9d16f, run run:thread:mcp%3A81055c85-c0d9-4e23-a9f4-6aad77d9d16f:ordinal:14: se eliminó la contradicción literal en la atribución del REQUEST_CHANGES; se conservan las referencias a los runs 12/13 y al review independiente.

## 15.13 Addendum cronológico — re-review CTO del head 4ccc7cd (2026-11-22)

- **Review documental:** el re-review CTO T3 independiente en [su hilo](t3-thread://v2/39965b4d-5f2a-4a0f-96a4-e78e93c02ef4/thread:delegated-task:command%3Amcp%3A759110f6-0150-4522-ba7d-7f489adcb568%3Adelegate-task%3A828aa578-538a-4ab3-9fef-b0af599f2b50), run ordinal 1 (`run:thread:thread%3Adelegated-task%3Acommand%253Amcp%253A759110f6-0150-4522-ba7d-7f489adcb568%253Adelegate-task%253A828aa578-538a-4ab3-9fef-b0af599f2b50:ordinal:1`), revisó el head documental `4ccc7cd69c56f774500f8d68a8758daa30c7f442` y los snapshots QA SHA-256 `4d7dcc5743acec9f8ff5d26c5d3782a9cd8ef005f12f835bbac6d4e9e0ca4316` / implementación `d5bca89ebd98e45e04e57d382d1fd9a8e0dc23e85da50320020eb1dde5e40f37`. Dictamen: **REQUEST_CHANGES**.
- **Corrección 1:** los datos de rama/copia que antes parecían vigentes ahora se describen como procedencia histórica; esta copia documental está publicada en PR #68.
- **Corrección 2:** T3 QA run ordinal 15 sí modificó el informe QA: añadió una línea de trazabilidad a la limpieza del ordinal 14. El informe QA de la célula tras ese run tuvo SHA-256 `897526ccf1825cee378f1e66e28060c770789b4235447f475f194035e8e7e597`; esta copia del PR ahora registra explícitamente el run 15. No hubo nueva prueba funcional, cambio de evidencia ni rehash del APK.
- **Cloudflare:** tras la publicación de `4ccc7cd`, el bot reportó deployment successful en production para chatti-workers, build `d869b1ff-8ad5-4ce3-bbc8-63820e472af5` (2026-11-22 19:09 UTC; https://github.com/wz0un/chatti-mobile/pull/68#issuecomment-7022204233) y chatti-web, build `a116785f-301f-48ce-8f9d-7bf8b1043493` (19:10 UTC; https://github.com/wz0un/chatti-mobile/pull/68#issuecomment-7023985372). Staff había confirmado esperados los triggers previos y autorizado publicar #68. Son estados del bot; no hubo deploy manual ni verificación independiente de runtime.
- **Estado:** #16 y Trello continúan OPEN / IN PROGRESS; #67 supersedido/cerrado y #68 abierto. Este re-review no es sign-off funcional ni aprueba promoción: el retest móvil ordinal 11 sigue BLOCKED. No DONE, cierre ni promoción a `master`; nueva revisión documental pendiente tras estas correcciones.

## 15.14 Addendum cronológico — re-review CTO del head 6bd7113 (2026-11-22)

- **Review documental:** el re-review CTO T3 independiente en [su hilo](t3-thread://v2/39965b4d-5f2a-4a0f-96a4-e78e93c02ef4/thread:delegated-task:command%3Amcp%3Ada205b4e-d153-4d2b-9a7d-c1fefca6f7bd%3Adelegate-task%3A49551e1a-489c-443d-9a9a-187e26785c4f), run ordinal 1 (`run:thread:thread%3Adelegated-task%3Acommand%253Amcp%253Ada205b4e-d153-4d2b-9a7d-c1fefca6f7bd%253Adelegate-task%253A49551e1a-489c-443d-9a9a-187e26785c4f:ordinal:1`), revisó el head documental `6bd711374068b275a76a399a3facbdcfd77a54c5` y los snapshots QA SHA-256 `e4c63c664ef44f8cff20583d6be2844b13d21976053f0781f180042ea8d79335` / implementación `a8246ec93c4f6e86aa15637d970aa0f858982c29da6253529b8a4a496604d035`. Dictamen: **REQUEST_CHANGES**.
- **Hallazgo:** las dos correcciones del re-review anterior sí quedaron verificadas (procedencia marcada como histórica y traza del QA ordinal 15). El motivo del nuevo `REQUEST_CHANGES` fue distinto: los documentos seguían presentando como builds reportados los de `4ccc7cd` —WAVE-3 y STATUS incluidos— mientras los comentarios del bot ya mostraban los builds de `6bd7113`. Se pidió reconciliar ese estado post-push conservando que es reporte del bot y no verificación manual ni de runtime.
- **Corrección aplicada:** este snapshot registra un build por head documental y aclara que el bot **edita su comentario in place**, por lo que el enlace del comentario puede mostrar un build posterior al head citado en el texto. Builds reportados tras el push de `6bd7113`: `chatti-workers` `e71a1018-1d3b-48f9-9e91-be580ddec154` y `chatti-web` `bf67b333-26f5-4051-a032-363f4de5df05`, ambos el 2026-11-22 a las 22:06 UTC. Los builds de `4ccc7cd` (`d869b1ff-8ad5-4ce3-bbc8-63820e472af5` y `a116785f-301f-48ce-8f9d-7bf8b1043493`) quedan como snapshot anterior, no como el último reporte.
- **Alcance:** cambio exclusivamente documental; no hubo QA funcional nueva, rehash de APK, cambio de fuente, deploy manual ni verificación independiente de runtime. El PASS histórico de a–d (ordinal 7) sigue limitado a sus hashes exactos; el retest móvil ordinal 11 continúa BLOCKED.
- **Estado:** #16 y Trello continúan OPEN / IN PROGRESS; #67 supersedido/cerrado y #68 abierto. Sin DONE ni promoción a `master`; este snapshot requiere una nueva revisión documental.
