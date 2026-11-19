# 08: Tier rápido — replay del grader y checklist skill → Casos

**What to build:** Dos artefactos baratos que contestan preguntas distintas: (a) «¿derivó el grader?», (b) «¿qué Casos dependen de lo que acabo de editar?».

**Blocked by:** 04

**Status:** done

- [x] (a) Replay: los artefactos de una Ejecución guardada pasan por `grader.ts` y dan el mismo Grade (un `scripts/`, no un test de `test/`)
- [x] (b) Checklist: para cada Caso, las afirmaciones sobre el contenido de `SKILL.md` de las que depende
- [x] (b) dice qué Casos re-correr tras editar una sección, sin bloquear
- [x] (b) incluye al menos: tabla de tokens de `desy-styles-reference`, el `gap-x-4` legacy de `implement-layout-patterns`, y la instrucción de copiar la página de prueba (afirmada en negativo: la petición está sin aplicar, ver notas)
- [x] Los dos se lanzan con `npm run` y acaban en segundos
- [x] Ninguno abre navegador ni proceso externo (cumple `verificar-tests` si vive en `test/`; prefiere `scripts/`)

## Notas

(a) y (b) no son lo mismo: (a) protege el grader, (b) detecta que el skill se ha movido de debajo del Caso. (b) fallará cada vez que se mejore un skill legítimo: es una checklist, no un gate. Nunca en `precommit`.

## Notas de implementación

- **`src/tier-rapido.ts`** (puro): las dos reglas. `replayDeEjecucion` re-gradúa y
  compara con el Grade guardado; `checklist` contrasta el texto de una sección con
  lo que un Caso afirma. Los adaptadores que leen disco y escriben son
  `scripts/replay-grader.ts` y `scripts/checklist-casos.ts`.
- **El replay re-gradúa con los Checks del Caso, no con los de la Ejecución**, y
  esto es una decisión, no un atajo: `DetalleCheck` **no guarda el peso**, y el Grade
  de calidad se calcula con él (`src/grader.ts:645-648`). Forzar `weight: 1` cambiaba
  el Grade de un Caso con pesos distintos —medido: un `BUENO` de pesos 1/5 se leía
  `ACEPTABLE`— y el replay acusaba al grader de una deriva que era suya. Se resuelve
  con el Caso del disco y el aviso por Ejecución lo **declara**. El día que la
  Ejecución persista el peso, `checksDeLaEjecucion` empieza a devolver sus Checks y
  el replay deja de mirar `casos/`.
- **`npm run replay-grader`** mira `--reports` (por defecto `reports/suite`) y exige
  el mismo Grade. Corre en el **precommit**, pero sólo con Evidencia guardada: en un
  clon limpio no hay árbol y sale verde diciéndolo. Un fichero que no tiene forma de
  Ejecución se salta; uno que la tiene pero no carga, o cuya Ejecución no se puede
  re-graduar (su Caso ya no está en `casos/`), es **rojo** con el nombre del fichero.
- **Lo que una Ejecución no trae se dice, no se calla**: sin `exitCode` o `arbolHash`
  (anteriores a los tickets 02/04) el aviso lo nombra. El **Gold** no vive en la
  Ejecución: para un Caso-página con guards de fidelidad el adaptador lo lee del
  Caso, porque sin él esos guards no reproducen nunca.
- **`npm run checklist-casos`** es lo contrario: **no es un gate**, nunca está en
  `precommit`, y sale con `1` cuando hay algo que re-correr (su resultado normal
  mientras se itera). Contesta con el árbol que se va a medir (`vendor/` o
  `--skills-local`) y da el `npm run run` exacto por Caso.
- **El hecho de la página de prueba se afirmó en negativo a propósito**, porque
  `peticiones/peticion-copiar-pagina-prueba.md` está **sin aplicar**: el Skill no
  dice que se copie, y el Caso depende hoy de que siga sin decirlo. Cuando se
  aplique, la lista de hechos lo delata y dice qué Caso re-correr. Afirmar lo
  contrario habría dejado la checklist en rojo desde el día uno.
- **El guardarraíl de la lista es la lista, y sólo la lista.**
  `test/tier-rapido.test.ts` contrasta contra el árbol canónico lo que no depende del
  texto del Skill: la sección citada existe en el `SKILL.md` del `vendor/` y el Caso
  existe en `casos/`. El **texto** de la sección (el `gap-x-4`, el «página de
  prueba») se prueba con un fixture, **no** contra `vendor/`: con el árbol real, cada
  mejora legítima de un Skill ponía rojo `npm test`, que es justo lo que el ticket
  dice que (b) no debe ser.
- Probado en su caso de fallo, no sólo en verde: con la sección «Grid responsivo del
  formulario» migrada de `gap-x-4` a `gap-base` en un `--skills-local`, la checklist
  sale con `1` y nombra `implement-layout-patterns/fieldset-grid-acciones`; el árbol
  de `vendor/` no se tocó. Los tests de «se lee la sección, no el fichero» y de «los
  pesos son los del Caso» se vieron en rojo contra el código roto.
- +21 tests (`test/tier-rapido.test.ts`). `npm run precommit` en verde.

## Revisión (dos ejes): lo que se corrigió

El `/code-review` del commit encontró en la primera versión tres cosas que ya están
arregladas aquí, y una cuarta que queda como límite honesto:

- **Bug: el replay perdía el peso** y podía acusar al grader de una deriva suya. Ahora
  re-gradúa con los Checks del Caso y lo declara (ver arriba).
- **Claim falsa**: el ticket decía que «un fichero con forma de Ejecución y sin Grade
  es rojo (`SIN GRADE`)». No existía: `esEjecucion` ya exige `grade`, así que la rama
  era inalcanzable. Estaba en el código y en esta misma página; las dos se corrigieron.
- **`test/tier-rapido.test.ts` dependía de `vendor/`**: afirmaba que los hechos siguen
  vigentes en el árbol real, así que una mejora legítima de un Skill rompía
  `npm test`. Ahora el árbol sólo responde por lo que no es texto (la sección existe,
  el Caso existe) y el texto se prueba con un fixture.
- **«Ejecución commiteada» no es posible**: `reports/` está ignorado por git. La
  casilla (a) dice ahora «guardada», que es lo que el comando hace; el límite de CI
  sigue en «Lo que este ticket NO cierra». **Corregido en la redacción, no en el
  alcance**: no hay Evidencia versionada y no la hay sin el ticket 14.

Quedan como **juicio** (no bloquean, están anotados para quien siga): `carpetaDe` del
adaptador y del test re-implementan la búsqueda de `src/caso-loader.ts`, y el
`lectorDeSkillMd` copia la caché de `lectorDeSecciones`; las dos son candidatas a
extraer cuando haya un tercer lector.

## Lo que este ticket NO cierra

- **En CI, el replay del grader no mide nada**: `reports/` está ignorado, no hay
  Evidencia que re-graduar y sale verde diciéndolo. Lo que protege es la Evidencia
  del mantenedor; llevarlo a CI pide Evidencia versionada o el nightly, y ni una ni
  otra está hecha (ticket 14).
- **Una Ejecución nunca se re-gradúa con los Checks con los que se graduó**: el peso
  no se persiste. El aviso por Ejecución lo declara; arreglarlo pide tocar
  `DetalleCheck`, y eso es un cambio de la Evidencia, no del tier rápido.
- **La checklist sólo cubre lo que un Caso mide por el texto de una sección**: el
  catálogo tiene su propio guardarraíl y la prosa de un Skill sin Caso no entra. Es
  la misma frontera que la deuda de anclaje del ticket 12.
