# Chatti QA — Regression Suite (Task 20)

**QA Agent:** · **Updated:** 2026-09-15
**Owner spec:** `docs/WEB-TASKS.md` → Task 20: *"QA regression suite: parity matrix checklist per release"*.

Este documento define la batería de regresión ejecutable de Chatti y su procedimiento por release. Sustituye el procedimiento ad-hoc de `docs/QA-REPORT.md` §10.

---

## 1. Suites (todo en `web/`)

| Comando | Qué valida | Offline/live | Arquitectos |
|---|---|---|---|
| `npm test` | Unit tests de `shared/` + `web/src/` | Offline | 6 ficheros · 85 tests |
| `npm run qa:interop` | Interop de cifrado web ⇄ móvil (código móvil REAL) | Offline | 1 fichero · 5 tests |
| `npm run qa:reconnect` | Regresión BUG-02 (los listeners sobreviven al reconnect) | Offline | 1 fichero · 2 tests |
| `npm run qa:regression` | **Las 3 suites anteriores encadenadas (92 tests)** | Offline | — |
| `npm run typecheck` | TypeScript estricto (`tsc -b --pretty false`) | Offline | — |
| `npm run lint` | ESLint estricto | Offline | — |
| `npm run build` | Build de producción Vite | Offline | — |
| `npm run smoke` | Smoke LIVE contra el worker real (`scripts/smoke.test.ts`), cuenta desechable auto-eliminada | Live | 4 tests |

> **`qa:regression` es el gate determinista de cada release.** `smoke` es el gate live (requiere backend arriba).

## 2. Procedimiento QA por release

1. **Determinista (bloqueante, sin backend):**
   ```bash
   cd web
   npm run qa:regression && npm run typecheck && npm run lint && npm run build
   ```

2. **Live (requiere worker arriba y estable):**
   ```bash
   npm run smoke        # register/login/session + endpoints + DM cifrado web⇄web
   ```
   Ejecutar **2 veces consecutivas** para descartar intermitencia (BUG-01).

3. **Parity checklist (manual, web app desplegada):** usar la matriz de `docs/WEB-PARITY.md` como lista de aceptación. Documentar desviaciones como bugs nuevos (numerar continuando la secuencia BUG-xx).

4. **Mobile regression:** `git diff HEAD -- src App.js index.js app.json eas.json` debe estar vacío. Si un release toca `shared/` (M4), correr además `expo export` y la interop (punto 1).

## 3. Infraestructura QA (reproducibilidad)

- **Shims en-repo** `web/scripts/shims/` (expo-crypto, async-storage, react-native-get-random-values). Los shims vivían en `/tmp/opencode/shims/` (fuera del repo) → **la suite interop no era reproducible en un clone limpio**; arreglado 2026-09-15.
- **Configs dedicados:** `scripts/interop.vitest.config.ts` (alias + inline del móvil), `scripts/reconnect.vitest.config.ts`, `vitest.smoke.config.ts`.
- **Advertencia:** `vitest.smoke.config.ts` debe incluir **solo** `scripts/smoke.test.ts`. Un glob `scripts/**/*.test.ts` rompe `npm run smoke` (integra interop/reconnect sin sus alias → error de parseo de `react-native`). Regresión de esto: ejecutar `git diff HEAD -- web/vitest.smoke.config.ts`.

## 4. Estado (2026-09-15)

| Gate | Resultado |
|---|---|
| Unit tests | ✅ 85/85 |
| Interop cifrado | ✅ 5/5 (reproducible post-fix de shims) |
| Reconnect (BUG-02) | ✅ 2/2 |
| `qa:regression` total | ✅ 92/92 |
| typecheck / lint / build | ✅ OK |
| Smoke live (backend) | ✅ 4/4 ×2 — **BUG-01 sin reproducir; backend estable en esta sesión** |
| Mobile regression | docs únicamente; no se tocó `src/` |

**Nota importante:** con el smoke 4/4 ×2 y el backend respondiendo, la puerta de auth de M1 deja de estar bloqueada por BUG-01. Pendiente de re-apertura formal cuando el Staff lo valide (merge de P0/P1) y QA corra el resto del ciclo M1/M2.