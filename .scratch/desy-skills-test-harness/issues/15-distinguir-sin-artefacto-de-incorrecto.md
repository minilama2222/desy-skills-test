# 15: Distinguir «no hay artefacto» de «artefacto incorrecto»

**What to build:** Que el resultado de una Ejecución diga **por qué** dio lo que dio cuando no hay nada que graduar: si el SUT no produjo artefacto (y en qué punto del Flujo se paró) o si produjo un artefacto y no cumple los Checks. Hoy ambos casos colapsan en el mismo INACEPTABLE y no se pueden separar en el reporte.

**Blocked by:** 05, ADR-0006

**Status:** done

- [x] El `ResultadoEjecucion` (o el `Grade`) expone si hubo artefacto graduable
- [x] Una Ejecución sin artefacto no se cuenta igual que una con artefacto incorrecto (en el `detalle` o en un campo aparte)
- [x] El reporte/scorecard puede agregar «no entregó» separado de «entregó mal» — **cerrado por el ticket 12**
- [x] Tests con: (a) artefacto correcto, (b) artefacto incorrecto, (c) cero artefactos

## Notas de implementación

- **Forma elegida: campos aparte**, no un `Grade` nuevo. `ResultadoEjecucion`
  expone **dos ejes ortogonales**:
  - `entrega`: `"con-artefacto" | "sin-artefacto"` — ¿produjo Artefacto?
  - `flujoAlcanzoSkill`: ¿el Flujo observado contiene el paso del skill bajo test?
  El `Grade` responde «cuánto de bien»; estos dos, «qué pasó». Mezclarlos rompía
  el scorecard (que promedia notas). Vocabulario en el glosario.
- **Por qué dos ejes y no un `sin-artefacto` subdividido**: «¿llegó?» y
  «¿entregó?» son hechos independientes (se puede llegar y no entregar, o no
  llegar siquiera), así que meter el flujo dentro de la Entrega repetiría el
  error de mezclar Grade y Entrega. El scorecard querrá contarlos por separado:
  las Ejecuciones que ni arrancan el skill contaminan el denominador.
- **Reglas aisladas** (funciones puras en `src/ejecutar.ts`):
  `entregaDeArtefactos(artefactos)` y `alcanzoSkill(flujo, skill)`. La segunda
  reutiliza `pasoCoincide` (exportado desde `grader.ts`) para no discrepar del
  guard `flujo_canonico` sobre qué es «este paso».
- **Frontera de `entrega`**: cuenta como entrega que exista **algún** Artefacto;
  un fichero vacío sigue siendo entrega (y fallará los Checks). Confundir «no
  produjo nada» con «produjo algo malo» es justo el bug del ticket.
- **No se cambió la forma de `DetalleCheck`** ni el `Grade`: una Ejecución sin
  Artefacto sigue dando INACEPTABLE. Lo que cambia es que la **causa** ahora es
  distinguible en el resultado.
- Las costuras se probaron por separado: `ejecutarCaso` (campos propagados por el
  camino real), las dos reglas puras (bordes y comodín), y las composiciones
  («mismo Grade, distinta entrega»; «llegar al skill no implica entregar»).
  +19 tests (207 en total).
- `scripts/experimento-estabilidad.ts` ahora registra `entrega` y
  `flujoAlcanzoSkill`, para que la próxima medición de estabilidad separe los
  «no entregó» de los «entregó mal» y los «ni arrancó».

## Criterio 3: cerrado por el ticket 12

El criterio 3 pide que **el reporte/scorecard** agregue «no entregó» separado de
«entregó mal». Este ticket aportó **la entrada** que ese agregado necesita (los
dos campos del resultado); el agregado en sí lo construyó el **ticket 12**
(`src/scorecard.ts`): cada Caso lleva `sinArtefacto` y `entregoMal` como cuentas
distintas, y el Scorecard renderiza ambas columnas. Con eso el `Status` pasa a
`done`.


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
