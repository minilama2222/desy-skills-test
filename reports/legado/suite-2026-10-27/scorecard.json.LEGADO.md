# Legado — reports/suite/scorecard.json

> **Este directorio no se compara.** Se midió con otra regla y no es un Scorecard de
> versión: `npm run diff-versiones` no lo lee, y compararlo con una Versión de skills de
> hoy es comparar dos medidas que no dicen lo mismo (ticket 10).

- origen: `reports/suite/scorecard.json`
- fecha de la corrida: 2026-10-27
- qué es: El Scorecard de una corrida completa.
- regla de medida: **ADR-0007** — `docs/adr/0007-politica-de-n-ejecuciones.md`
- Pin: main · b523ca7df8594532f5fd47376894c16bc8f1b5df · 2026-10-20 — **declarado** por la corrida, no comprobado contra el árbol medido

## Con qué regla se midió

El veredicto de un Caso se calcula sobre las Ejecuciones que **alcanzaron el skill** (`flujoAlcanzoSkill: true`). Las que lo alcanzaron y no entregaron no se separaban: contaban como dato y condenaban el Caso.

Entonces, un Caso que alcanzó el skill y **no entregó nada** era **SUSPENDE**.
Y **ninguna** Ejecución alcanzó el skill era INDETERMINADO: sin dato, no había juicio.

## Lo que significan sus veredictos

Este fichero trae 1 Caso/s con veredicto: SUSPENDE.

**No** significan lo que significaría hoy un SUSPENDE. Con la regla del ticket 01, un
Caso en el que **ninguna** Ejecución entregó es **INDETERMINADO**, no SUSPENDE: no hay
nada que graduar, y llamarlo suspenso fabrica un rojo del skill que no lo es (ADR-0014).

Leer un SUSPENDE de aquí y tomarlo por un juicio del skill es el error que este archivo
existe para no repetir: lo que dice es «las Ejecuciones que llegaron no acertaron», no
«el skill está mal». La tasa de entrega que lo sostiene está en el `LEGADO.md` de la
corrida.

## Casos, como se guardaron

| Caso | Veredicto | entregas | intentos | correctas | entregó mal | sin entregar |
|---|---|---|---|---|---|---|
| boton-primario | SUSPENDE | — | 3 | 0 | 0 | 2 |

La columna `entregas` sale `—` cuando el fichero no las guardó: este Scorecard es
anterior al ticket 03, que separó entregas de intentos. Un `0` ahí diría «no entregó»,
y no es cierto.

La tasa de entrega de la corrida está en el `LEGADO.md` de su directorio.

## Qué se conserva y qué no

Se conserva el **porqué** del bucle de refinamiento —los dos HALLAZGOS y la tasa de
entrega que se midió—; sus diagnósticos están en
`.scratch/desy-skills-test-harness/issues/HALLAZGO-*.md`, que no se copian aquí. Lo que
se copia es la **evidencia** de esta corrida. No se conserva el **qué**: los veredictos
viejos como si fueran una línea base. La línea base arranca vacía en la primera corrida
con la regla nueva (`reports/versiones/`).
