# AGENTS.md — Reglas vinculantes

Instrucciones de obligado cumplimiento para cualquier agente (CTO, FE, BE, QA, DevOps) que trabaje en este repositorio.

## Política de ramas (CRÍTICA — no negociable)

| Rama | Propósito | Reglas |
|------|-----------|--------|
| `master` | **SOLO PRODUCCIÓN** | Prohibido commitear directamente, prohibido push forzado, prohibido mergear ramas sin revisión. De esta rama salen los workers de producción ya publicados (`chatti-web`, build de la app móvil). **No se toca.**
| `dev` | **Desarrollo activo** | Rama por defecto para desarrollo. Todo trabajo de desarrollo se basa en `dev`. Se sincroniza con `master` solo vía PR revisado cuando un release se considera listo para producción. |
| `feature/*`, `bugfix/*`, `chore/*` | Trabajo temporal | Crear una rama desde `dev` por cada tarea. Fusionar a `dev` vía PR. Eliminar la rama al fusionar. |

### Reglas para agentes

1. **No se commitea directamente en `master`.** Ninguna excepción. El CTO comete el error histórico de haberlo hecho antes; a partir de ahora está prohibido.
2. **Antes de empezar cualquier trabajo:**
   - `git checkout dev && git pull` (o basar la feature branch en `dev`).
   - Verificar en qué rama estás; si algo te deja en `master`, cambia a `dev` antes de crear el commit.
3. **No rewritear historia publicada:** no usar `git reset`, `git rebase`, `git push --force` (salvo `--force-with-lease` explícitamente autorizado sobre ramas de trabajo propias).
4. **No se deploya a producción desde una rama de desarrollo.** Producción = `master`; staging = el worker `chatti-web-staging` (se puede publicar desde `dev` bajo QA).
5. **Merge a `master`** solo mediante PR revisado por el dueño del proyecto (Staff). Los workers de producción se construyen a partir de `master`.
6. Si un agente detecta que está a punto de commitear en `master`, debe detenerse y crear la rama/el merge adecuado; reportar antes que forzar nada.
7. Los agentes leen este archivo al inicio de cada sesión. Las instrucciones de `docs/*` y `.mece/*` están subordinadas a esta política.

## Alcance de edición

- La app móvil (`.expo/` excepciones aparte) `App.js`, `src/`, `index.js`, `app.json`, `eas.json` es **la fuente de producción**: no modificar sin aprobación explícita del Staff (solo correcciones de bugs documentados con sign-off).
- El web (`web/`), contratos compartidos (`shared/`), y docs se desarrollan en `dev`.
- Infra (workers, DNS, secretos) fuera del alcance de los agentes salvo tarea explícita: solo el Staff despliega y publica.

## Checklist al terminar una sesión

- [ ] Trabajo commiteado en `dev` o una feature/bugfix branch — nunca en `master`.
- [ ] Sin cambios sin commitear (o documentados) en el árbol de trabajo.
- [ ] Rama local publicada (push) en el remoto `origin`.
- [ ] PR abierto si corresponde fusionar algo a `dev` o `master`.
- [ ] Ninguna modificación a `master` sin que el Staff lo apruebe y lo fusione.