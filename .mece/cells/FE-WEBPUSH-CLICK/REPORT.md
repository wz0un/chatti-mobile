# FE-WEBPUSH-CLICK REPORT

## Root cause & evidence (previo)
sw.js anterior usaba comparación exacta `client.url === target.href`. Eso fallaba cuando la ventana estaba en la URL objetivo con trailing slash o query distinta, y abortaba el handler si `navigate()` rechazaba o no existía (cliente no controlado), sin fallback a `openWindow`. Evidencia: el harness `web/src/lib/swNotificationClick.test.ts` ejecutado contra el sw.js anterior reproducía: no se llamaba `openWindow` en el caso uncontrolled/reject; la ventana en `/room/r1/` no se reconocía como target.

## Regla definitiva query/hash
- Si target.search o target.hash están vacíos, basta igualdad de pathname (tolerando slash final).
- Si son no vacíos, deben coincidir exactamente.
Motivo: evitar considerar "ya en target" cuando el deep link lleva parámetros que la ventana no tiene.

## Changed paths
- web/public/sw.js
- web/src/lib/swNotificationClick.test.ts
- docs/WEB-PUSH.md

## Commands (2026-11-02)
- typecheck: PASS
- lint: PASS
- test: 119/119 PASS
- build: PASS; dist/sw.js contiene sw-2

## Manual steps (Chrome/Firefox)
1. DevTools > Application > Service Workers > Update; confirmar versión activa responde ping con sw-2.
2. Enviar push de prueba.
3. Click y verificar URL esperada:
   - sin ventana: abre nueva en target.
   - otra ruta: navega a target.
   - misma ruta: foco sin navegación.
   - uncontrolled: fallback openWindow.
PASS/FAIL por caso.

## Entorno/fecha
2026-11-02, web/ (pnpm 11, Node 22). Riesgos residuales: QA manual y Staff sign-off pendientes; #45 y Task 22 no marcados done.

## PR
https://github.com/wz0un/chatti-mobile/pull/57
Session id: wave2-fe-webpush-click
