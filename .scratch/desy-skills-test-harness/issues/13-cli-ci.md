# 13: CLI + salida apta para CI

**What to build:** El cierre de la Fase 4: una CLI que corre la suite entera, emite el JSON y el Scorecard, y devuelve un exit code que bloquea el merge si algún Caso es INACEPTABLE. Con todos los bloques cubiertos, `npm test` ejecuta la suite completa.

**Blocked by:** 12, 09, 10, 11

**Status:** done

- [x] Un comando corre todos los Casos y produce JSON + Scorecard
- [x] El exit code es distinto de cero si algún Caso es INACEPTABLE
- [x] Se puede correr un subconjunto por skill o por Caso
- [x] El reporte declara siempre el Pin testeado
- [x] Documentado en README cómo correr la suite localmente

## Cómo quedó

- **`npm run suite`** (`src/cli.ts`, subcomando `suite`): corre todos los Casos
  —o el subconjunto `--skill` / `--case`— **N=3 veces** cada uno (ADR-0007,
  `--n` lo cambia), agrega el Scorecard y escribe
  `reports/suite/scorecard.json` (fuente de verdad, con el **Pin** siempre:
  ref + commit + fecha + repo) y `reports/suite/scorecard.md` (también por
  stdout; progreso y rutas por stderr).
- **Exit code** = ADR-0012 (`pasarCaso` / `exitCodeDe`, puro en `src/suite.ts`):
  `≠ 0` si algún Caso **SUSPENDE** —alguna Ejecución alcanzó el skill y ninguna
  es correcta—; `0` si los que quedan PASA (el veredicto del Caso aplica la regla
  de N, así que un Grade INACEPTABLE en una Ejecución no bloquea si otra PASA);
  un Caso **INDETERMINADO** no bloquea (no mide el skill) pero se anuncia por
  stderr. Un filtro que no casa con ningún Caso **falla** en vez de dar una
  suite vacía en verde.
- **El exit code es de verdad el del proceso**: `main()` es `async` y espera la
  suite; antes `run` se lanzaba con `void` y el proceso podía salir con 0 antes
  de terminar.
- **Árbol propio** (`reports/suite/`): cada suite vacía el anterior, así que el
  veredicto no mezcla Ejecuciones de otras corridas. `npm run run` sigue
  guardando en `reports/ejecuciones/` y `npm run report [--reports <dir>]` lee
  cualquiera de los dos.
- **README**: nueva sección «Correr la suite» (requisitos: `opencode`, scaffold
  cacheado, Gold; qué deja en disco; tabla de exit codes) y `npm run suite` en el
  bloque de uso.
- **Tests** (`test/suite.test.ts`, 15; `test/suite-cli.test.ts`, 5;
  `test/cli-scripts.test.ts`, 2): la política pura (selección por skill/Caso, N,
  exit code por veredicto, Pin en el reporte, resumen) y la **CLI de verdad**,
  lanzada como proceso, con un SUT falso (exit 0 con entrega correcta, ≠ 0 con
  las N malas, 0 cuando una de las N es correcta, ≠ 0 con filtro inexistente).
- **SUT falso por preludio, no por `PATH`** (aprendido con el precommit en rojo
  tres veces): en Windows `spawn` sólo lee la clave **`Path`** —un `PATH`
  inyectado se ignora y responde el `opencode` real, que da todas las entregas
  buenas—, un `.exe` vecino gana a un `.cmd` y un `.cmd` por ruta absoluta no lo
  lanza `spawn` sin `shell`. La vía portable es un preludio (`--require` vía
  `NODE_OPTIONS`) que envuelve `child_process.spawn` sólo para `opencode`. El
  guion deja una **marca por Ejecución** que el test comprueba: un verde sin la
  marca es un verde del test, no de la suite.
- **`createSandbox` copia el starter con `robocopy` en Windows** (~3-6 s) en vez
  de `cpSync` sobre 85 MB / 5.260 ficheros (~15 s por sandbox). No es del ticket,
  pero lo destapó: el precommit bajó de 637 s a 78 s y los tests de scaffold de
  40 s a <10 s. El código de salida de `robocopy` se interpreta bien: <8 es éxito.

## Notas

- **`npm test` NO es la suite de Casos.** El cuerpo del ticket dice «con todos
  los bloques cubiertos, `npm test` ejecuta la suite completa»; eso **no** se ha
  hecho, y se dejó escrito en vez de dar por cumplido en silencio. `npm test` es
  la suite de **tests del harness** (vitest, sin modelo ni red) y `npm run suite`
  es la de los Casos. Que `npm test` invocara `opencode` convertiría cada
  `npm test` local y cada pre-commit en ~15 min de API y red, y rompería el
  determinismo que el spec pone como criterio de los tests del harness. Si se
  quiere, un alias `npm run ci` que corra ambos es una línea de `package.json`;
  la decisión queda para quien mantenga el pipeline (que el spec deja fuera de
  v1).

## Comments

- **Retro (al cerrar el ticket 13):** el cuerpo del ticket pedía «`npm test`
  ejecuta la suite completa». No se hizo así y conviene que el tracker no lo
  esconda: `npm test` queda para el harness y la suite de Casos es
  `npm run suite`. Si alguien quiere el alias, que lo decida en el ticket del
  pipeline de CI, donde el spec sitúa el work de verdad.

