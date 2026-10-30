# Historia y diff: el scorecard de cada versión, versionado por su hash

Una versión de los skills no sirve para nada si no se puede comparar con la
anterior: «¿el refactor mejoró o empeoró?» es la pregunta que cierra el bucle.
Hoy no hay historia que comparar: `reports/` está en `.gitignore` y cada
`npm run suite` **vacía** `reports/suite/ejecuciones` antes de empezar (ADR-0012,
a propósito). La user story 4 de la spec del harness pide comparar versiones y no
existe ninguna.

El ticket 09 añade dos cosas pequeñas, sin infraestructura nueva:

- **El scorecard de versión**, `reports/versiones/<arbolHash>.json`, que cada
  `suite` escribe.
- **Un diff** entre dos de ellos, `npm run diff-versiones [<a> <b>]`.

## Decisiones

- **El árbol de Ejecuciones sigue ignorado; se versiona la conclusión.** Un JSON
  de Ejecuciones pesa y ensucia el repo; el scorecard agregado es pequeño, es lo
  que se lee y lo que se diffea. `reports/` sigue en `.gitignore` y una línea
  `!reports/versiones/` reabre **solo** ese subdirectorio.
- **El nombre es el `arbolHash`**, no el commit ni la fecha (ticket 04): el hash,
  no el commit, es la identidad de la versión, porque una corrida local no tiene
  commit (ADR-0015) y un vendor sucio no se mide. Dos corridas del **mismo
  contenido** son la misma versión: la segunda **pisa** el fichero con sus cuentas
  nuevas en vez de dejar dos verdades del mismo hash.
- **El fichero de versión es el scorecard, sin re-envolver**: `arbolHash`, `pin` y
  `skills`, las mismas llaves que el `scorecard.json` de la corrida. Una forma por
  cosa: si hubiera dos, el diff compararía la que no se mide. El `pin` pierde su
  `repo`, que en una corrida local es la ruta del checkout del mantenedor
  (ADR-0015); quedan los hechos (`ref`, `commit`, `fecha`).
- **Se versiona en un directorio fijo del repo**, no bajo el `--reports` de la
  corrida: el diff busca por hash, y la suite se puede correr con `--reports` a
  cualquier parte. Los tests redirigen ese directorio con `DESY_VERSIONES_DIR`
  para no escribir en el árbol versionado.
- **El diff compara por Caso y por Skill**, y por cada uno da el **antes →
  después** del veredicto y de correctas / entregó-mal / sin-entregar. El
  veredicto solo esconde lo que importa: dos versiones PASA con distinta tasa de
  entrega **sí** cambian, y el diff lo dice. Un Caso o un Skill que solo existe
  en una de las dos se pinta con `—` en el otro lado, no como «sin cambios»:
  decir «no cambió» un Caso que no estaba sería un cero que miente.
- **Empieza vacío, y eso no es un error.** Con menos de dos versiones el comando
  lo dice y sale con `0`: la primera suite deja una sola, y escribir un diff
  contra nada inventaría una línea base. Cuando no se le dan argumentos toma las
  dos versiones **más recientes** (por la fecha de su Pin y, a igualdad, por la
  hora de escritura); con dos rutas o dos hashes compara esas.
- **Un Pin local se avisa, no se excluye.** Una versión medida con
  `--skills-local` (ADR-0015) es válida para iterar; el diff dice por stderr que
  B se midió sobre `local (sin commit)` y que no es lo que se medirá en CI. Es
  comodidad declarada, como el propio Pin local.
- **El legado queda fuera** (ticket 10): el diff no lee `reports/legado/`, porque
  esa evidencia se midió con otra regla y compararla es justo la comparación que
  no significa nada.
- **`npm run report` deja de re-etiquetar**, y esto es el otro lado del ticket:
  el Pin de un informe sale de **cada Ejecución**. Un árbol que mezcla corridas
  —las de `run`— no puede declarar el Pin de la primera como el de todas: sale
  como **`mixto`**, con la fecha de la más reciente, y el CLI lo avisa. Antes
  decía un Pin único que podía no ser el de ninguna, o el de una sola, y esa es
  la mentira que el ticket 04 quitó para la suite.

## Alternativas descartadas

- **Versionar el árbol de Ejecuciones.** Es lo que la misma spec deja fuera: pesa
  y hace ruido; el scorecard es la conclusión y el árbol se puede regenerar.
- **Un baseline fijo en git que se compare siempre contra él.** Un fichero que
  hay que mover a mano a cada versión, y que miente en cuanto nadie lo mueve. El
  diff contra las **dos últimas** versiones dice lo que acaba de cambiar; contra
  una concreta, se le pasan sus dos rutas.
- **Nombrar la versión por el commit.** Un commit no verifica que el `vendor/`
  coincida (ticket 04) y una corrida local no tiene commit: el hash ya resuelve
  las dos cosas.
- **Un `json-diff` genérico.** No entiende de Veredictos ni de entregas: diría
  que cambia el orden de las llaves y no que un Caso pasó de SUSPENDE a PASA.

## Consecuencias

- `pasaSostenido` (ADR-0014) ya tiene de dónde leer las dos corridas
  consecutivas: son dos versiones versionadas. La regla sigue donde estaba; el
  ticket 09 le da la historia que le faltaba.
- Un scorecard sin `arbolHash` —árbol de Ejecuciones anterior al ticket 04— no se
  versiona: no hay versión que nombrar. La suite lo dice por stderr y sigue.
- El diff es **puro** (`diffDeVersiones` en `src/versiones.ts`) y el adaptador
  (`scripts/diff-versiones.ts`) solo resuelve rutas: los tests lo fijan sobre
  dos JSON de fixture y, de punta a punta, sobre el proceso real.
