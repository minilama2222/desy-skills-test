# 20: Ningún comando lee `pasaSostenido`

**What to build:** que la regla de cierre del bucle se pueda leer sin abrir el
JSON a mano. Hoy `pasaSostenido` existe en `src/scorecard.ts`, está testeada y
**no la llama nadie**: `grep -rn pasaSostenido src/ scripts/` sólo devuelve la
propia definición, un tipo en `versiones.ts` y los tests.

**Blocked by:** —

**Status:** ready-for-agent

- [ ] Un comando que lea `reports/versiones/*.json` y, por Caso, imprima las dos
      últimas corridas y si está refinado (`refinado` + `motivo` de la función,
      sin reinventar la regla)
- [ ] Sale con código ≠ 0 si algún Caso de la última corrida no está refinado
- [ ] Tests: una corrida sola, dos PASA, PASA+SUSPENDE, y un fichero viejo sin
      `corridas` (campo opcional, ticket 23)
- [ ] Decidir si se llama desde `npm run report` o es un comando aparte

## Por qué

El ciclo se cierra «con PASA sostenido», y hoy eso se comprueba a mano sobre el
campo `corridas` del fichero de versión — que es exactamente el tipo de paso que
se olvida o se lee mal. La función ya codifica la regla (dos últimas corridas,
las dos PASA; `INDETERMINADO` rompe la racha) y tiene tests; falta el cable.

**Fuera de alcance:** qué *significa* que un skill sea bueno. La regla de tasa
con intervalo y de umbral se decide en el ticket 41
(`bucle-de-refinamiento/41`). Este ticket sólo conecta la regla que ya existe.
