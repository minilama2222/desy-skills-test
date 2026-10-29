# Exit code de la suite: sólo un Caso SUSPENDE bloquea el merge

`npm run suite` (el comando de CI, ticket 13) sale con **código ≠ 0 si algún Caso
SUSPENDE**, y con **0 en cualquier otro caso**, con una excepción: una suite que
corrió **cero** Casos también sale con ≠ 0.

Lo que **no** bloquea, y por qué:

- **Caso INDETERMINADO** (el SUT no alcanzó el skill, o lo alcanzó y no entregó
  Artefacto — ADR-0014): no es un suspenso —el
  ADR-0007 lo declara un tercer estado—, y no hay dato para juzgar el skill. Un
  CI rojo por una corrida en la que el agente no arrancó no mide el skill, mide
  al agente, y con este SUT eso pasa a menudo; convertir cada no-arranque en un
  merge bloqueado haría inútil la señal. El Caso queda en el Scorecard con su
  veredicto y la suite **avisa por stderr** de cuántos quedaron indeterminados,
  para que nadie los lea como verdes.
- **Un Grade por Ejecución distinto de EXCELENTE**: no bloquea por sí solo. La
  política de N (ADR-0007) dice que basta con que **una** Ejecución que alcanzó el
  skill sea EXCELENTE; lo que decide es el veredicto del Caso, no el Grade de una
  Ejecución.

Alternativas descartadas:

- **Bloquear también con INDETERMINADO.** Convierte el flakiness del agente
  (no arrancar) en un fallo del skill y hace que el CI sea rojo sin que nadie
  pueda arreglar un skill. Si se quisiera «no dejar pasar una corrida indeterminada
  en silencio», el sitio es un umbral anunciado (p. ej. «más de la mitad de los
  Casos indeterminados ⇒ fallo»), que hoy no está medido: no hay datos de cuántos
  Casos quedan indeterminados en una suite completa.
- **Exit 0 con una suite vacía.** Un filtro mal escrito (`--skill implement-componet`)
  daría un verde sin haber evaluado nada. La suite falla, nombra el filtro y lista
  los skills que sí tienen Casos.

## Contexto

El ticket 13 pide «exit code distinto de cero si algún Caso es INACEPTABLE». Hay
dos agregados distintos que podrían llamarse así: el **Grade de una Ejecución**
(INACEPTABLE / ACEPTABLE / BUENO / EXCELENTE) y el **Veredicto del Caso** (PASA /
SUSPENDE / INDETERMINADO). Con el ADR-0007 ya vigente, lo que decide un merge es
el veredicto del Caso —`src/scorecard.ts`— y no el Grade de una Ejecución, así
que el exit code se define sobre el veredicto. Leer el criterio literal («algún
INACEPTABLE») sobre los Grades haría que un Caso que PASA por la regla de N
bloqueara el merge, anulando el ADR-0007.

## Consecuencias

- La política es una función pura, `pasarCaso` / `exitCodeDe` en `src/suite.ts`,
  y se prueba sin SUT (`test/suite.test.ts`); que el **proceso** devuelva ese
  código lo fija `test/suite-cli.test.ts`, que corre la CLI con un `opencode` falso.
- El veredicto se decide sobre las Ejecuciones que la suite acaba de correr: cada
  `npm run suite` escribe en su propio árbol (`reports/suite/`) y vacía el anterior,
  de modo que el código de salida no depende de Ejecuciones de otra fecha.
- Cambiar la política (p. ej. añadir el umbral de indeterminados) es tocar
  `exitCodeDe` y este ADR, no el agregado del Scorecard.
