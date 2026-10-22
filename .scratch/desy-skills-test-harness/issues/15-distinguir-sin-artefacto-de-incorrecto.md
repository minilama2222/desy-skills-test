# 15: Distinguir «no hay artefacto» de «artefacto incorrecto»

**What to build:** Que el resultado de una Ejecución diga **por qué** dio lo que dio cuando no hay nada que graduar: si el SUT no produjo artefacto (y en qué punto del Flujo se paró) o si produjo un artefacto y no cumple los Checks. Hoy ambos casos colapsan en el mismo INACEPTABLE y no se pueden separar en el reporte.

**Blocked by:** 05, ADR-0006

**Status:** needs-triage

- [ ] El `ResultadoEjecucion` (o el `Grade`) expone si hubo artefacto graduable
- [ ] Una Ejecución sin artefacto no se cuenta igual que una con artefacto incorrecto (en el `detalle` o en un campo aparte)
- [ ] El reporte/scorecard puede agregar «no entregó» separado de «entregó mal»
- [ ] Tests con: (a) artefacto correcto, (b) artefacto incorrecto, (c) cero artefactos

## Contexto

El experimento de estabilidad v2 (`HALLAZGO-guards-macro-artefacto.md`) dejó tres Ejecuciones del mismo Caso con tres desenlaces **distintos** que hoy se reportan idénticos:

| # | Flujo observado | Artefacto | Qué pasó de verdad |
|---|---|---|---|
| 1 | preflight → implement | `src/boton-enviar.html` correcto | el harness lo suspendía por mirar el `dist/` (bug, ya arreglado en ADR-0006) |
| 2 | preflight → implement | ninguno | el SUT llegó al skill y no entregó |
| 3 | **solo preflight** | ninguno | el SUT **ni entró** al skill bajo test |

Los tres daban INACEPTABLE con el mismo aspecto. Con ADR-0006, #1 pasa a EXCELENTE, pero #2 y #3 siguen igual de indistinguibles entre sí — y significan cosas muy distintas: #3 no es "este skill está roto", es "el agente no llegó". Un INACEPTABLE ahí no evalúa el skill.

## Por qué importa para el criterio 5 del ticket 05

El criterio 5 («El resultado es estable entre Ejecuciones repetidas») no se puede decidir sobre un denominador sucio: si no separamos «no entregó» de «entregó mal», no sabemos si la inestabilidad es del SUT entregando (relevante para el skill) o del harness/agente no arrancando (no lo es). El denominador limpio del experimento v2 es **2 de 3**: una entregó y era correcta, dos no entregaron.

Relacionado con la política de N Ejecuciones: con esta distinción, la política puede ser "N entregas, descartando las que no llegan" en vez de "N Ejecuciones a secas".
