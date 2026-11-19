# Legado — reports/suite/scorecard.json

> **Este directorio no se compara.** Se midió con otra regla y no es un Scorecard de
> versión: `npm run diff-versiones` no lo lee, y compararlo con una Versión de skills de
> hoy es comparar dos medidas que no dicen lo mismo (ticket 10).

- origen: `reports/suite/scorecard.json`
- copiado de: `reports/suite/ejecuciones/implement-component/boton-primario/1.json`, `reports/suite/ejecuciones/implement-component/boton-primario/2.json`, `reports/suite/scorecard.json`
- fecha de la corrida: 2026-11-18
- qué es: El Scorecard de una corrida completa.
- regla de medida: **ADR-0014** — `docs/adr/0014-veredicto-sobre-las-entregas.md`
- Pin: main · b523ca7df8594532f5fd47376894c16bc8f1b5df · 2026-10-28 (comprobado)

## Cómo se leyó, y qué no se puede afirmar

**Esta corrida no se puede re-graduar.** Su Scorecard se escribió con un árbol de
skills y unos Checks que no se conservaron con él, así que ningún Grade de aquí se
puede volver a producir: lo único que queda es cómo se leyó el fichero en su momento.

- Se calibró con: El Veredicto de un Caso se calcula sobre las Ejecuciones que **entregaron** Artefacto; cero entregas es INDETERMINADO. El fichero lo dice con esas palabras (ADR-0014).
- No se puede afirmar: **qué Grade produjo esta corrida y si sus Ejecuciones entregaron.** El árbol de skills que se midió no está en el repo: hoy `vendor/` mide otro contenido. Además, `npm run replay-grader` re-gradúa con los Checks de hoy —la Evidencia no guarda sus pesos—, así que mover un Grade puede ser la trampa del macro comentado o cualquier cambio posterior. Las huellas de lo medido: `c75f7fe9…` en el Scorecard, frente a `a9722412…` que mide el `vendor/` de hoy. El detalle está en el ticket 18.

Se guarda **tal cual se escribió**, para que el hecho de que el guard leyera el
artefacto equivocado no se pierda. No se guarda como medida: lo medido no se puede
reconstruir (ver el ticket 18).

## Casos, como se guardaron

| Caso | Veredicto | entregas | intentos | correctas | entregó mal | sin entregar |
|---|---|---|---|---|---|---|
| boton-primario | INDETERMINADO | 0 | 2 | 0 | 0 | 0 |

**Las cuentas de esta tabla las calculó el Scorecard al escribirse, no se han
rehecho.** Que este Caso salga con `0` entregas e `INDETERMINADO` es lo que el
fichero dice; si lo decía bien no se puede comprobar, porque las Ejecuciones se
re-gradúan con los Checks de hoy y su árbol no se conservó.

La tasa de entrega de la corrida está en el `LEGADO.md` de su directorio.

## Qué se conserva y qué no

Se conserva el **porqué** del bucle de refinamiento —los dos HALLAZGOS y la tasa de
entrega que se midió—; sus diagnósticos están en
`.scratch/desy-skills-test-harness/issues/HALLAZGO-*.md`, que no se copian aquí. Lo que
se copia es la **evidencia** de esta corrida. No se conserva el **qué**: los veredictos
viejos como si fueran una línea base. La línea base arranca vacía en la primera corrida
con la regla nueva (`reports/versiones/`).
