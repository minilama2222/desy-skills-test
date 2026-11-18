# 08: Tier rápido — replay del grader y checklist skill → Casos

**What to build:** Dos artefactos baratos que contestan preguntas distintas: (a) «¿derivó el grader?», (b) «¿qué Casos dependen de lo que acabo de editar?».

**Blocked by:** 04

**Status:** done

- [x] (a) Replay: los artefactos de una Ejecución commiteada pasan por `grader.ts` y dan el mismo Grade (un `scripts/`, no un test de `test/`)
- [x] (b) Checklist: para cada Caso, las afirmaciones sobre el contenido de `SKILL.md` de las que depende
- [x] (b) dice qué Casos re-correr tras editar una sección, sin bloquear
- [x] (b) incluye al menos: tabla de tokens de `desy-styles-reference`, el `gap-x-4` legacy de `implement-layout-patterns`, y la instrucción de copiar la página de prueba (afirmada en negativo: la petición está sin aplicar, ver notas)
- [x] Los dos se lanzan con `npm run` y acaban en segundos
- [x] Ninguno abre navegador ni proceso externo (cumple `verificar-tests` si vive en `test/`; prefiere `scripts/`)

## Notas

(a) y (b) no son lo mismo: (a) protege el grader, (b) detecta que el skill se ha movido de debajo del Caso. (b) fallará cada vez que se mejore un skill legítimo: es una checklist, no un gate. Nunca en `precommit`.

## Notas de implementación

- **`src/tier-rapido.ts`** (puro): las dos reglas. `replayDeEjecucion` re-gradúa con
  los `assert` que trae la Ejecución (ticket 06) y el Gold que le pasa el adaptador;
  `checklist` contrasta el texto de una sección con lo que un Caso afirma. Los
  adaptadores que leen disco y escriben son `scripts/replay-grader.ts` y
  `scripts/checklist-casos.ts`.
- **`npm run replay-grader`** mira `--reports` (por defecto `reports/suite`) y exige
  el mismo Grade. Corre en el **precommit**, pero sólo con Evidencia guardada: en un
  clon limpio no hay árbol y sale verde diciéndolo. Un fichero con forma de
  Ejecución y sin Grade es rojo (`SIN GRADE`), no un verde silencioso: no se
  inventa lo que no se puede comparar.
- **Lo que una Ejecución no trae se dice, no se calla.** Sin `assert` por Check
  (anterior al ticket 06) se re-gradúa con los Checks del Caso y un aviso lo nombra;
  sin `exitCode` o `arbolHash` (anteriores al 02/04), también. El **Gold** no vive
  en la Ejecución: para un Caso-página con guards de fidelidad el adaptador lo lee
  del Caso, porque sin él esos guards no reproducen nunca y el replay daría deriva
  por un hecho que es suyo.
- **`npm run checklist-casos`** es lo contrario: **no es un gate**, nunca está en
  `precommit`, y sale con `1` cuando hay algo que re-correr (su resultado normal
  mientras se itera). Contesta con el árbol que se va a medir (`vendor/` o
  `--skills-local`) y da el `npm run run` exacto por Caso.
- **El hecho de la página de prueba se afirmó en negativo a propósito**, porque
  `peticiones/peticion-copiar-pagina-prueba.md` está **sin aplicar**: el Skill no
  dice que se copie, y el Caso depende hoy de que siga sin decirlo. Cuando se
  aplique, la lista de hechos lo delata y dice qué Caso re-correr. Afirmar lo
  contrario habría dejado la checklist en rojo desde el día uno.
- **El guardarraíl de la lista es la lista**: `test/tier-rapido.test.ts` contrasta
  cada hecho contra el árbol canónico (la sección existe en el `SKILL.md` del
  `vendor/`, el Caso existe en `casos/`), como `verificar-casos` con las anclas. Un
  hecho que nombra una sección fantasma haría que la checklist dijera «re-correr X»
  sobre un Caso que nadie midió.
- Probado en su caso de fallo, no sólo en verde: con la sección «Grid responsivo del
  formulario» migrada de `gap-x-4` a `gap-base` en un `--skills-local`, la checklist
  sale con `1` y nombra `implement-layout-patterns/fieldset-grid-acciones`; el árbol
  de `vendor/` no se tocó. Los tests de «se lee la sección, no el fichero» y de
  «sin `assert` se re-gradúa con el Caso» se vieron en rojo contra el código roto.
- +22 tests (`test/tier-rapido.test.ts`). `npm run precommit` en verde.

## Lo que este ticket NO cierra

- **En CI, el replay del grader no mide nada**: `reports/` está ignorado, no hay
  Evidencia que re-graduar y sale verde diciéndolo. Lo que protege es la Evidencia
  del mantenedor; llevarlo a CI pide Evidencia versionada o el nightly, y ni una ni
  otra está hecha (ticket 14).
- **Una Ejecución anterior al ticket 06 se re-gradúa con los Checks de hoy**, no con
  los que se graduó: el aviso lo dice, y el arreglo (persistir los Checks, no sólo el
  `assert` por Check) no está en el alcance del ticket.
- **La checklist sólo cubre lo que un Caso mide por el texto de una sección**: el
  catálogo tiene su propio guardarraíl y la prosa de un Skill sin Caso no entra. Es
  la misma frontera que la deuda de anclaje del ticket 12.
