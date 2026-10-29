# 05: Pin local declarado como «local (sin commit)»

**What to build:** Que el runner pueda tomar los skills de un checkout local (fuera de `vendor/`) para iterar sin re-pinear por cada frase, y que el informe lo **declare** en lugar de fingir un commit.

**Blocked by:** 04

**Status:** ready-for-human

- [x] El runner acepta una ruta de skills local (opción de CLI o config; no editar `vendor/`)
- [x] El scorecard marca esa corrida como `local (sin commit)` en JSON y en el H1 del Markdown
- [x] Con un checkout local **no** se puede producir un scorecard que declare un commit
- [x] Un `bump-pin` sin cambios no destruye nada del usuario: el flujo local nunca escribe en `vendor/`
- [x] Tests: pin remoto ⇒ commit declarado; pin local ⇒ `local`; árbol local sucio ⇒ mismo guardarraíl del 04

## Notas

Canónico sigue siendo upstream por SHA (ADR-0003): el modo local es **comodidad declarada**, no una segunda vía de verdad. Con el hash del 04, una corrida local es perfectamente reportable y diffable.

## Notas de implementación

- **`--skills-local <ruta>`** (`run` y `suite`) mide `<ruta>/skills/` en vez de
  `vendor/desy-skills/skills/`. El Pin local es `{ ref: "local", commit: "local" }`
  —`local` no es un SHA a propósito— y se lee como `local (sin commit)` en el JSON,
  en el H1 del Markdown y en la línea de resumen por consola. Regla pura:
  `pinLocal` / `esPinLocal` / `etiquetaDelPin`; ADR-0015.
- **`runCaso` lee el Pin por primera vez.** De ahí sale de qué árbol copia los
  skills (`copySkills(origen?)`). Era el parámetro que se recibía y no se usaba: la
  causa del fallo 3 de la spec del bucle.
- **`npm run report` deja de re-etiquetar con `pin.json`.** El Pin del informe sale
  de las Ejecuciones (`ResultadoEjecucion` gana `fecha`); sin eso, un informe de una
  corrida local heredaría el commit de `pin.json` y volvería a mentir. Si no hay
  Ejecuciones, `report` falla con un mensaje en vez de escribir un scorecard vacío.
- **`ResultadoEjecucion` gana `salida: { stdout, stderr }`.** El transcript fusiona
  los dos canales para leer el Flujo, pero la prosa del SUT y el progreso del runner
  llegan a la suite por la misma tubería: quien cite la salida no puede fiarse de la
  fusión. Lo destapó el test de `--skills-local`, que necesitaba afirmar qué vio el
  SUT dentro de su sandbox.
- **Guardarraíl local:** un checkout con cambios sin commitear en `skills/` no se
  mide, igual que `vendor/`. `assets/catalog.json` sigue excluido (ticket 04); lo que
  cambia fuera de `skills/` no cuenta. La regla se reescribió para preguntar desde
  el **propio árbol** (`cwd` = el árbol, pathspec `.`): `git status <dir>` desde
  otro sitio no se limita a ese directorio —los tags no se filtran—, y así la misma
  regla sirve para el vendor y para un checkout.
- **Hallazgo, arreglado aquí: la ruta de skills del sandbox duplicaba `opencode`.**
  `skillsDirDeConfig` recibe la raíz de config (`home/.config`) y construye
  `opencode/skills`; el sandbox le pasaba el `configDir`, que ya termina en
  `opencode`, así que las skills aterrizaban en `…/opencode/opencode/skills` y V2
  —que escanea `XDG_CONFIG_HOME/opencode/skills`— no las veía. El `opencode.jsonc`
  declaraba la misma ruta mal, así que nada lo delataba: lo destapó el test de
  `--skills-local`, que mira qué ve el SUT en su `HOME`. Arreglado en el sandbox y
  fijado en `test/sandbox.test.ts` desde la raíz de config.
- **`copySkills` copia desde el directorio de skills, no desde el checkout.** Un
  `--skills-local` pasa la **raíz** del checkout y `runCaso` resuelve su `skills/`
  (`skillsDeCheckout`), que es lo que se copia: copiar la raíz dejaba un
  `skills/skills/` en el sandbox. Un checkout sin `skills/` es un error explícito,
  no un árbol vacío que se leería como «el SUT no entregó». Del origen sólo se
  copian subdirectorios: un `.git/` no es una skill.

## Lo que este ticket NO cierra

- **Versionar la corrida local.** El scorecard de la corrida sí lleva la ruta
  relativa del checkout; que un scorecard de **versión** se versione sin ella (y sin
  el resto de lo que no es medido) es el ticket 09, sobre esta misma forma.
- **Cerrar el bucle con un PASA sostenido.** `pasaSostenido` compara dos corridas y
  depende del versionado (ticket 09).

## Verificación

`npm run precommit` en verde. Los tests nuevos: `test/pin-local.test.ts` (regla del
Pin y del scorecard), `test/pin-local-guardarrail.test.ts` (git real, checkout
limpio/sucio/catálogo) y tres casos de proceso real en `test/suite-cli.test.ts`
(`--skills-local` limpio → `local (sin commit)` y vendor intacto; sucio → se niega;
inexistente → error explícito).
