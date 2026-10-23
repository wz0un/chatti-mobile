# Markdown, agentes, skills y tareas: mapa del repositorio

Este documento define dónde debe vivir cada tipo de Markdown en `chatti-mobile` y evita mezclar instrucciones operativas, tareas activas y documentación de producto.

## Clasificación actual

| Tipo | Ubicación | Qué contiene | Regla |
| --- | --- | --- | --- |
| Instrucciones generales para agentes | `AGENTS.md` | Política de ramas, guardrails y definición de terminado | Mantener como punto de entrada en la raíz; no duplicar estas reglas en documentos independientes. |
| Coordinación de la wave MECE | `.mece/WAVE.md` | Estado de la wave, ownership, secuencia y límites de trabajo | Es un artefacto operativo activo, no documentación general. |
| Tareas por célula | `.mece/cells/<CELL-ID>/TASK.md` | Encargo, alcance y criterios de una célula | Mantener junto a la célula correspondiente mientras la wave esté activa. |
| Evidencia e informes de células | `.mece/cells/<CELL-ID>/REPORT.md` | Resultados y evidencia de trabajo | Mantener junto a su tarea; no convertirlos en instrucciones globales. |
| Síntesis de la wave | `.mece/SYNTHESIS.md` | Síntesis coordinada por Staff | Mantener bajo ownership de Staff. |
| Documentación del proyecto | `docs/*.md` | Estado, roadmap, paridad, QA, despliegue y operaciones | Son documentos de referencia; no son tareas ejecutables por sí mismos. Respetar los paths autoritativos mencionados en la wave activa. |
| Documentación de componentes | `backend/README.md` y documentación próxima a cada componente | Uso y contexto local de ese componente | Mantener cerca del componente si solo aplica a él. |
| Agentes dedicados | `.github/agents/` (convención propuesta, no inventario confirmado) | Definiciones de agentes específicos del repositorio, si se incorporan | No crear duplicados de `AGENTS.md`; cada archivo debe tener responsabilidad y ámbito claros. |
| Skills reutilizables | `skills/<skill-name>/SKILL.md` (convención propuesta, no inventario confirmado) | Procedimientos reutilizables invocables por agentes | Una skill por directorio, con nombre, propósito, disparadores, pasos y límites. No guardar aquí tareas de una wave. |

## Documentos de referencia identificados

- `AGENTS.md`: políticas vinculantes para agentes.
- `.mece/WAVE.md`: coordinación y guardrails de la wave activa.
- `.mece/cells/DEVOPS-STAGING-DEPLOY/TASK.md` y `.mece/cells/DEVOPS-STAGING-DEPLOY/REPORT.md`: tarea e informe de esa célula.
- `docs/STATUS.md`, `docs/WEB-TASKS.md`, `docs/WEB-PARITY.md` y `docs/WEB-ROADMAP.md`: documentos que la wave declara que deben sincronizarse por Staff.
- Otros documentos bajo `docs/` cubren QA, despliegue y operaciones; su nombre y ruta actual deben preservarse hasta comprobar y actualizar sus referencias.

La búsqueda del inventario inicial no encontró archivos llamados `SKILL.md`; por tanto, las rutas de skills y agentes dedicados arriba son convenciones propuestas, no una afirmación de que ya existan.

## Reglas para futuras reorganizaciones

1. **No mover las tareas activas de `.mece/cells/`** mientras `.mece/WAVE.md` las referencie como instrucciones y ownership de la wave.
2. **No mover ni renombrar los cuatro documentos de estado/roadmap** indicados por la wave sin actualizar todas sus referencias y obtener la revisión de Staff.
3. **No archivar documentos solo por parecer antiguos.** La wave advierte que hay documentos de roadmap/QA desactualizados; deben etiquetarse o archivarse solo después de confirmar que no son fuente de evidencia ni tienen referencias activas.
4. **No duplicar instrucciones.** `AGENTS.md` es el punto de entrada global; las skills deben enlazarlo y añadir solo procedimientos específicos.
5. **Cada movimiento debe ser trazable.** Buscar referencias Markdown, enlaces relativos, workflows y automatizaciones antes de renombrar. Actualizar enlaces en el mismo PR.
6. **Separar por responsabilidad, no solo por extensión.** La ubicación debe distinguir reglas globales, procedimientos reutilizables, tareas temporales, informes y documentación de producto.
7. **Mantener el alcance no funcional.** Este mapa no autoriza cambios en la aplicación móvil ni en archivos de producto.

## Siguiente paso recomendado

Hacer una migración física en PRs pequeños, después de obtener un inventario completo de archivos Markdown y referencias:
- primero, confirmar qué documentos son instrucciones globales frente a procedimientos reutilizables;
- después, introducir `.github/agents/` o `skills/` únicamente si hay definiciones reales que separar;
- por último, archivar o reubicar documentos obsoletos con actualización de enlaces y validación de QA.

Este PR establece el mapa y las reglas de clasificación. No mueve archivos operativos porque la wave activa impone rutas y ownership explícitos.
