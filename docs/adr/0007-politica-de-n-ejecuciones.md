# Política de N Ejecuciones: 3, descartando las que no alcanzan el skill

Un Caso se corre **3 veces** (N = 3) y el veredicto se decide solo sobre las Ejecuciones que **alcanzaron el skill bajo test**:

1. Se descartan las Ejecuciones con `flujoAlcanzoSkill: false` (el agente no llegó a invocar el skill — no evalúan el skill, evalúan al agente).
2. De las que quedan, **basta con que al menos una** esté correcta. El Caso mide si el skill **sabe** hacerlo, no si el agente lo hace siempre.
3. Si **ninguna** Ejecución alcanzó el skill, el Caso queda **indeterminado**, no suspendido: no hay dato para juzgar el skill.

Alternativas descartadas: **una sola Ejecución** (el SUT es flaky: en la medición de validación 1 de 3 entregaba bien, así que un solo intento da un veredicto al azar); **N Ejecuciones y deben pasar todas** (con este SUT nunca pasaría, aunque el skill fuera perfecto, porque el agente a menudo no arranca); **N Ejecuciones y pasa si alguna acierta sin descartar los no-arranques** (mezcla la pereza del agente con la calidad del skill, que es justo lo que el ticket 15 separó); **exigir la mayoría de las que arrancan** (con N=3 el denominador limpio se queda en 2, y "mayoría de 2" es 2 — casi tan exigente como "todas", así que reintroduce la alternativa descartada por la puerta de atrás; se midió y descartó en la validación del ADR).

## Contexto

El criterio 5 del ticket 05 («el resultado es estable entre Ejecuciones repetidas») no se podía decidir antes del ticket 15: una Ejecución donde el agente no arrancaba el skill daba el mismo INACEPTABLE que una donde el skill producía un output incorrecto, así que no se sabía si la inestabilidad era del skill o del agente. El ticket 15 expuso `entrega` y `flujoAlcanzoSkill`, que hacen el denominador limpio. Evidencia en `.scratch/desy-skills-test-harness/issues/HALLAZGO-guards-macro-artefacto.md`.

Es una **política de aceptación**, no una feature: no requiere que `run` corra N veces por sí solo. Mientras el scorecard (ticket 12) no existía, se aplicaba en el experimento de estabilidad y a mano sobre varias Ejecuciones.

La regla de «al menos una» se fijó **con datos**: en la primera medición de validación (3 Ejecuciones), el denominador limpio fue 2 (una no arrancó) y solo 1 era correcta. Exigir mayoría sobre un denominador de 2 condenaba el skill con evidencia insuficiente, así que la regla se corrigió antes de cerrar el criterio.

## Consecuencias

- El veredicto de un Caso **no es el Grade de una Ejecución**, sino la agregación de 3. El Grade de una Ejecución sigue siendo INACEPTABLE/ACEPTABLE/BUENO/EXCELENTE; la política vive **por encima** de él.
- Un Caso puede quedar **indeterminado**, que no es lo mismo que suspendido: sin ninguna Ejecución que alcance el skill, no hay juicio. El scorecard debe poder representar ese tercer estado.
- La regla se apoya en `flujoAlcanzoSkill` (ticket 15), que a su vez se apoya en `pasoCoincide` (el mismo que usa el guard `flujo_canonico`): «¿es este el paso del skill?» tiene una sola definición.
- N = 3 es una decisión de comodidad (cada Ejecución tardó 50–190 s); subirlo a 5 es un cambio de constante, no de política. Con «al menos una», subir N solo aumenta la confianza, nunca endurece el criterio.
- El **consumidor** de esta política es el scorecard (`src/scorecard.ts`, ticket 12): `agregarScorecard` implementa `veredictoDe` sobre el denominador limpio y representa el estado indeterminado.

