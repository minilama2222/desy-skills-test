# Legado — reports/estabilidad-v2/ejecucion-1-fuente.txt

> **Este directorio no se compara.** Se midió con otra regla y no es un Scorecard de
> versión: `npm run diff-versiones` no lo lee, y compararlo con una Versión de skills de
> hoy es comparar dos medidas que no dicen lo mismo (ticket 10).

- origen: `reports/estabilidad-v2/ejecucion-1-fuente.txt`
- fecha de la corrida: 2026-10-22
- qué es: Una captura en prosa de una Ejecución.
- regla de medida: **ADR-0007** — `docs/adr/0007-politica-de-n-ejecuciones.md`
- Pin: b523ca7df8594532f5fd47376894c16bc8f1b5df — **declarado** por la corrida, no comprobado contra el árbol medido

## Con qué regla se midió

El veredicto de un Caso se calcula sobre las Ejecuciones que **alcanzaron el skill** (`flujoAlcanzoSkill: true`). Las que lo alcanzaron y no entregaron no se separaban: contaban como dato y condenaban el Caso.

Entonces, un Caso que alcanzó el skill y **no entregó nada** era **SUSPENDE**.
Y **ninguna** Ejecución alcanzó el skill era INDETERMINADO: sin dato, no había juicio.

## Qué es

Este fichero no trae veredictos ni la medida de una Ejecución: es la evidencia en la que
se apoyó un HALLAZGO. No tiene SUSPENDE del que hablar; su valor es el contenido tal
cual, que se copió sin tocar.

## Qué se conserva y qué no

Se conserva el **porqué** del bucle de refinamiento —los dos HALLAZGOS y la tasa de
entrega que se midió—; sus diagnósticos están en
`.scratch/desy-skills-test-harness/issues/HALLAZGO-*.md`, que no se copian aquí. Lo que
se copia es la **evidencia** de esta corrida. No se conserva el **qué**: los veredictos
viejos como si fueran una línea base. La línea base arranca vacía en la primera corrida
con la regla nueva (`reports/versiones/`).
