# Veredicto sobre las Ejecuciones que entregaron: cero entregas es INDETERMINADO

Un Caso se corre N veces (N = 3, ADR-0007), pero el **veredicto se decide sólo sobre
las Ejecuciones que entregaron Artefacto**:

1. Se descartan las Ejecuciones con `flujoAlcanzoSkill: false` (el agente no invocó
   el skill — ADR-0007, sin cambios).
2. **Se descartan también las que alcanzaron el skill y no entregaron Artefacto**
   (`entrega: "sin-artefacto"`). Siguen contándose y mostrándose en el scorecard,
   pero no entran en el veredicto.
3. De las que entregaron, **basta con que al menos una** sea correcta (Grade
   EXCELENTE), igual que hoy.
4. Si **ninguna** Ejecución entregó, el Caso queda **INDETERMINADO**, no suspendido.

En consecuencia, un Caso sólo **SUSPENDE** cuando hay al menos una entrega y
ninguna es correcta. Y sólo está **refinado** cuando pasa **PASA sostenido**: dos
corridas consecutivas PASA, con las entregas de cada corrida contadas por separado.

## Contexto

El ADR-0007 fijó el denominador limpio sobre `flujoAlcanzoSkill`. El ticket 15
añadió después el segundo eje (`entrega`) pero **no cambió el veredicto**: una
Ejecución que llega al skill y no escribe nada sigue contando como dato, y sólo
puede contribuir a SUSPENDE. Con la tasa de entrega medida (0 de 3 en
`reports/suite`; 1 de 3 en `estabilidad-v2`), tres corridas sin entrega producían un
rojo que no dice nada del skill.

Esto **no contradice** el ADR-0007, lo extiende: aquél se preguntó por las
Ejecuciones que no llegaban al skill, éste por las que llegan y no producen nada.
Son la misma clase de ruido del SUT — «no midió el skill» — y reciben la misma
respuesta: fuera del juicio.

## Alternativas descartadas

- **Dejarlo como está (todo lo que alcanza el skill cuenta).** Es el estado actual,
  y convierte un fallo del SUT en un suspenso del skill. Es el fallo que hizo
  desconfiar del scorecard.
- **Umbral de tolerancia** («hasta K no-entregas, SUSPENDE si ≥K+1 entregas son
  incorrectas»). Introduce dos parámetros (N, K) cuyo efecto nadie ha medido, y
  con N=3 cualquier K útil deja el criterio a medio camino entre «una basta» y «no
  basta ninguna». La versión simple — cero entregas, cero juicio — se explica en
  una frase.
- **Subir N para compensar la baja entrega.** Subir N sólo aumenta la probabilidad
  de que alguna entregue; no arregla el significado de «ninguna entregó». Además
  cada Ejecución cuesta 50–190 s.
- **Nudge en el prompt o cambio de modelo para subir la entrega.** Haría que el Caso
  mida un prompt inventado o un modelo distinto, no el skill. Ver el ticket 03.

## Consecuencias

- El veredicto vive en `veredictoDe` (`src/scorecard.ts`). El invariante de cuentas
  del ticket 15 se mantiene (`correctas + entregoMal + sinArtefacto ===
  alcanzaronSkill`); lo que cambia es **cuál** de esas cuentas alimenta la decisión.
- `entrega: "sin-artefacto"` deja de ser una vía de SUSPENDE. Un Caso con 0
  entregas es INDETERMINADO, y el ADR-0012 ya decidió que INDETERMINADO no bloquea
  el CI: no cambia el exit code, cambia la **frecuencia** con que se llega a él.
- **Cambian las expectativas de test, en dos sitios distintos**:
  `test/suite-cli.test.ts` ya fijaba el contrato del exit code sólo para el caso de
  «alcanzó el skill y **entregó mal**» (sigue bloqueando); faltaba el de «alcanzó y
  **no entregó**», que ahora sale con 0 e INDETERMINADO y se añadió. En el scorecard,
  ningún test fijaba «alcanzó, no entregó, sin entregas correctas ⇒ SUSPENDE», que
  es justo el comportamiento que este ADR cambia: se llena el hueco con los tests
  nuevos de `test/caso-veredicto-entregas.test.ts`.
- La política de intentos (ticket 03) es quien hace utilizable esta regla: sin un
  presupuesto que reintente hasta la entrega, N=3 corridas contra una tasa de
  entrega baja dan INDETERMINADO casi siempre. Por eso este ADR va antes que el 03.
- PASA sostenido no vive en el scorecard (que agrega **una** suite): es un criterio
  de cierre del bucle, comprobado comparando dos corridas, y por eso depende del
  versionado de scorecards (ticket 09).
