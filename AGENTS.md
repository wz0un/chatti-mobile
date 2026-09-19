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


## Definition of Done — QA + CTO (CRÍTICA — no negociable)

Una tarea **NO está terminada** por el hecho de que el código esté implementado, compile, pase CI, tenga tests automatizados en verde o haya sido mergeada a `dev`.

Para poder marcar una task como **DONE / COMPLETED** deben existir los dos sign-offs:

1. **QA:** validación funcional de los criterios de aceptación, incluyendo pruebas manuales/funcionales cuando corresponda y evidencia de los resultados.
2. **CTO/Staff:** revisión y aprobación técnica del resultado y de la evidencia de QA.

Hasta que ambos estén confirmados, la task debe permanecer abierta (por ejemplo, `IN PROGRESS`, `QA` o `BLOCKED`) y **no debe presentarse como completada en Trello, GitHub, STATUS.md ni en los reportes de avance**.

Los tests automatizados son evidencia complementaria; **no sustituyen la validación de QA ni el sign-off del CTO/Staff**.

## Política de ramas por tipo de trabajo

Cada desarrollo debe comenzar en una **rama nueva y específica**, creada desde la base correcta:

| Tipo | Rama | Base |
|------|------|------|
| Nueva funcionalidad | `feature/<nombre>` | `dev` |
| Bug de desarrollo | `bugfix/<nombre>` | `dev` |
| Refactor/mantenimiento | `chore/<nombre>` | `dev` |
| Hotfix de producción | `hotfix/<nombre>` | `master` |
| Documentación/proceso | `docs/<nombre>` o `chore/<nombre>` | `dev` |

**No se debe trabajar directamente sobre `dev` para una tarea nueva.** La rama de trabajo se fusiona a `dev` mediante PR después de completar la revisión correspondiente. Los hotfix de producción son la excepción controlada: nacen de `master`, se validan, y vuelven a `master` mediante PR; después deben sincronizarse de vuelta a `dev` para evitar divergencia.

## Trazabilidad y documentación (CRÍTICA)

Todo cambio relevante debe quedar trazado en la documentación del repositorio, siguiendo el patrón existente. Como mínimo, cuando aplique, actualizar:

- `STATUS.md` para estado/progreso y bloqueos.
- Documentación específica de la feature o QA en `docs/*`.
- Evidencia de pruebas: qué se probó, resultado, entorno y fecha.
- PR/commit vinculados a la tarea.
- Trello con el estado real y los criterios de salida.

**No se considera trazado un cambio únicamente porque exista el commit.** La documentación debe permitir reconstruir qué se hizo, por qué, qué se validó, quién dio el sign-off y qué queda pendiente.

### Regla de promoción

El flujo normal es:

`feature/bugfix/chore/docs -> dev -> QA -> CTO/Staff -> PR dev -> master -> producción`

Nunca se debe saltar QA/CTO para declarar una tarea terminada o promocionarla a producción. Un PR verde significa que los checks técnicos pasan; **no significa automáticamente que la tarea esté aprobada funcionalmente**.

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