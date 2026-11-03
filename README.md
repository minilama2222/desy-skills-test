# desy-skills-test

Harness de tests de capacidad para los 12 skills de [`desy-skills`](https://bitbucket.org/sdaragon/desy-skills).

Cada **Caso** alimenta al SUT (agente `opencode run` headless) con una entrada y una tarea, y evalúa la salida contra una rúbrica declarativa de **Checks**. El resultado es un **Grade** por Caso y un **Scorecard** por Skill.

- Vocabulario del dominio: [`GLOSSARY.md`](./GLOSSARY.md)
- Decisiones: [`docs/adr/`](./docs/adr/)
- Spec y tickets: [`.scratch/desy-skills-test-harness/`](./.scratch/desy-skills-test-harness/)

## Uso

```bash
npm install
npm test          # corre los tests unitarios del harness (vitest)
npm run typecheck # tsc --noEmit
npm run suite     # corre TODOS los Casos por el SUT y emite JSON + Scorecard (comando de CI)
npm run suite -- --skill implement-component --case boton-primario --n 1  # un subconjunto
npm run run -- --skill implement-component --case boton-primario  # ejecuta un Caso por el SUT y emite Evidencia + Grade
npm run grade     # puntúa un Check sobre Evidencia vacía (herramienta de autoría)
npm run load -- <ruta>  # carga un Caso desde su carpeta y muestra su JSON
npm run verificar-casos  # guardarraíl: todos los Casos de casos/ deben ser cargables
npm run verificar-readme  # guardarraíl: el conteo de Casos del README coincide con el disco
npm run verificar-acentos  # guardarraíl: la prosa del repo no lleva palabras españolas sin tilde
npm run verificar-mockup  # valida los mockup.png commiteados (sin navegador; --recapturar sí abre)
npm run capturar-gold -- --skill <skill> --case <caso>  # genera/valida la Captura de Gold
npm run capturar-mockup  # genera el mockup (input/mockup.png) de los Casos-decisión
npm run report    # agrega las Ejecuciones de `run` y renderiza el Scorecard (JSON + markdown)
npm run diff-versiones  # diff entre las dos versiones más recientes (o `-- <a> <b>`)
npm run archivar-legado  # archiva la evidencia previa a la regla del ticket 01 en reports/legado
npm run bump-pin <ref>  # actualiza vendor/ + pin.json al ref dado
```

`npm test` y `npm run suite` no son lo mismo: `npm test` valida el harness
(grader, runner, agregado) sin modelo ni red; `npm run suite` ejercita los skills
a través del SUT y tarda ~1 min por Ejecución. Ver [Correr la suite](#correr-la-suite).

## Casos

Los Casos viven en `casos/<skill>/<tipo>/<id>/`, con `input/prompt.md`,
`expected/checks.json` y `rubric.md`. El tipo (`componente` | `pagina` |
`decision`) determina el Framework de checks base que el grader combina con los
checks del Caso.

Hay **14** Casos:

- `casos/implement-component/componente/boton-primario/` (**Caso-componente**,
  Slice 1): un botón primario de tamaño estándar. Sus guards cubren el uso del
  macro `componentButton`, la variante `c-button--primary` y la ausencia de props
  inventadas; sus checks de quality cubren el tamaño base.
- `casos/implement-pattern/pagina/patron-pagina-paso-1-nombre-nif/`
  (**Caso-página**, Slice 2): el paso 1 de un formulario por pasos a partir del
  Gold oficial (`input/gold.html` + `input/gold.png`). A los guards de a11y y de
  tokens se suman los de **fidelidad estructural** (container, escala del `h1`,
  gap de la rejilla, contra el Gold) y el del **encadenado** de skills.
- Tres **Casos-decisión** (Slice 3, Bloque A — reconocimiento y elección):
  `casos/component-recognizer/decision/reconocimiento-login/` (identifica los
  componentes de un login DESY contra el catálogo),
  `casos/choose-page-template/decision/404-portal-publico/` (elige la familia
  portal para un 404) y `casos/choose-library/decision/portal-turistico/`
  (recomienda `desy-html` para un portal público). No producen HTML: su artefacto
  es el texto de la decisión del SUT y sus checks son de **decisión**
  (`declara_decision` / `no_declara_decision` / `reconoce_componente`).
- Dos **Casos-componente** (Bloque B — implementación de patrones y layouts):
  `casos/implement-pattern/componente/politicas-privacidad/` (el patrón atómico
  «Aceptar políticas de privacidad» con el macro `componentCheckboxes`) y
  `casos/implement-layout-patterns/componente/fieldset-grid-acciones/`
  (`fieldset`+`legend` sr-only, rejilla responsive `lg:grid-cols-4` y acciones de
  página). Gradúan el **fuente** (`src/`) que el SUT escribe: guards de macro y de
  a11y (structure el layout), y un Quality de fidelidad de tokens.
- Seis Casos del **Bloque C — verificación y orquestación**: cinco
  **Casos-decisión** para los skills cuyo output no es HTML —
  `casos/design-match/decision/afinado-paso-1/` (clasifica las discrepancias
  trivial/afinable/bloqueante), `casos/validate-accessibility/decision/checklist-sin-servidor/`
  (el checklist de `grep` detecta los cuatro fallos del HTML, con el assert
  `declara_fallo`), `casos/styles-reference/decision/token-espaciado/` (devuelve
  el token del sistema y no el de Tailwind),
  `casos/preflight-check/decision/proyecto-no-existe/` (identifica
  `PROYECTO_NO_EXISTE` y bifurca al scaffold), `casos/preflight-check/decision/proyecto-ok-libreria-version/`
  (identifica la librería y la versión del `package.json`) y
  `casos/scaffold-project/decision/no-scaffoldea-sin-permiso/` (no ejecuta el
  clone: guard `no_declara_ejecucion`) — y un **Caso-componente** para
  `casos/angular-translator/componente/boton-primario-angular/` (traduce el macro
  `componentButton` al selector `<desy-button>`).

Las **fixtures de imagen** (el Gold-imagen `input/gold.png` de un Caso-página y el
mockup `input/mockup.png` de un Caso-decisión) están **commiteadas** y sólo se
regeneran con `npm run capturar-gold` / `npm run capturar-mockup`, que abren un
navegador (`agent-browser`). Donde `agent-browser` no esté disponible, la fixture
commiteada es la que vale; un `mockup.png` de andamiaje es un wireframe válido, no
un error.

## Correr la suite

`npm run suite` es el comando que corre la **suite entera** y sirve para CI:

```bash
npm run suite                                        # todos los Casos, 3 entregas cada uno
npm run suite -- --skill implement-component         # un skill
npm run suite -- --skill implement-component --case boton-primario   # un Caso
npm run suite -- --n 1                               # N entregas por Caso (por defecto 3)
npm run suite -- --tope 8                            # tope duro de intentos (por defecto N * 2)
npm run suite -- --reports reports/mi-corrida        # árbol de salida (por defecto reports/suite)
npm run suite -- --skills-local ../desy-skills        # mide los skills de un checkout local, no de vendor/
```

`--n` cuenta **entregas**, no Ejecuciones: un Caso se intenta hasta tener N Entregas
o agotar el tope duro de intentos (`N * 2` por defecto), lo que antes llegue. Una
corrida que llega al skill y no escribe nada consume intento y no entrega, así que
la misma N puede costar más Ejecuciones — y ahí el Scorecard dice **intentos** y
**entregas** por separado. Si no se llega a N entregas se para en el tope, y el
veredicto se calcula con lo que sí se entregó (cero entregas ⇒ INDETERMINADO).

Qué necesitas para que corra de verdad:

- el binario **`opencode`** en el `PATH`, en **versión 2** (el SUT, ver ADR-0013), y,
  en tu usuario, la cuenta del proveedor del modelo fijado conectada con
  `opencode auth login` (`deepinfra/deepseek-ai/DeepSeek-V4.1-Flash-1017`). El
  runner copia solo tu `auth.json` al sandbox; sin él V2 responde
  `Model unavailable`;
- el **scaffold cacheado** en `.scaffold-cache/desy-html-starter` (ver ADR-0005):
  `powershell -File scripts/preparar-scaffold.ps1` en Windows, o
  `sh scripts/preparar-scaffold.sh` en macOS/Linux;
- la **Captura de Gold** de cada Caso-página (`npm run capturar-gold`), aunque la
  fixture commiteada ya está en el repo.

Qué deja y qué devuelve:

- **`reports/suite/scorecard.json`** — la fuente de verdad para CI: el **Pin
  testeado** (`ref`, `commit`, `fecha`, `repo`) y, por Skill, el veredicto de cada
  Caso.
- **`reports/suite/scorecard.md`** — el Scorecard legible (también por stdout;
  las rutas y el progreso, por stderr).
- **`reports/suite/informe/<skill>/<caso>.md`** — el **informe por Caso**: por cada
  Check fallido, la aserción, la línea del artefacto que la tumba y la sección del
  skill de la que el Caso dice depender (ver [Informe por Caso](#informe-por-caso)).
- **`reports/versiones/<arbolHash>.json`** — el **Scorecard de versión**: la
  conclusión de la corrida, versionada en git y en un directorio **fijo** (no bajo
  `--reports`). Es lo que compara `npm run diff-versiones` (ver
  [Comparar dos versiones](#comparar-dos-versiones)).
- **`reports/legado/`** — la evidencia anterior a la regla del ticket 01, versionada
  pero **fuera** del diff, con la regla con la que se midió en su cabecera (ver
  [El legado queda fuera del diff](#el-legado-queda-fuera-del-diff)).
- Las Ejecuciones persistidas en `reports/suite/ejecuciones/<skill>/<caso>/<n>.json`
  (tantas como intentos costó llegar a las N entregas, o al tope).

El **exit code** es la señal que bloquea el merge:

| Situación | Exit code |
|---|---|
| Todos los Casos **PASA** | `0` |
| Algún Caso **SUSPENDE** (alcanzó el skill, ninguna Ejecución correcta) | `1` |
| Sólo Casos **INDETERMINADO** (el SUT no alcanzó el skill: no es suspenso, ADR-0007) | `0`, con aviso por stderr |
| Filtro que no casa con ningún Caso, o error de uso | `1` |

Un Caso INDETERMINADO no bloquea porque no mide el skill, pero el Scorecard lo
dice y la suite avisa por stderr: un verde de un Caso que el agente ni arrancó no
es un verde del skill. Y una suite vacía (filtro que no casa) sale con `1`: un
CI verde sin haber evaluado nada es peor que un rojo.

### Medir un checkout local

`--skills-local <ruta>` mide los skills de `<ruta>/skills/` en vez de
`vendor/desy-skills/skills/`, para iterar sobre un skill sin re-pinear por cada
frase:

```bash
npm run suite -- --skills-local ../desy-skills --skill implement-component --case boton-primario
```

- El Scorecard lo declara como **`local (sin commit)`** —en el JSON, en el H1 y
  por consola—: no hay commit que declarar, y fingir uno es lo que el Pin honesto
  quitó. Lo medido se identifica por su `arbolHash`.
- El árbol que se mide pasa por el **mismo guardarraíl de árbol sucio** que
  `vendor/`: un checkout con cambios sin commitear en `skills/` no se mide. Lo que
  cambie fuera de `skills/` no cuenta.
- No escribe ni toca `vendor/`, y no cambia `pin.json`. Canónico sigue siendo
  upstream por SHA (ADR-0003): esto es comodidad declarada.

Cada `npm run suite` escribe en su propio árbol y vacía el anterior, así que el
veredicto no mezcla Ejecuciones de corridas distintas. Las corridas sueltas de
`npm run run` siguen en `reports/ejecuciones/` y su reporte es `npm run report`.

## Comparar dos versiones

`reports/` está ignorado por git **salvo** `reports/versiones/` y `reports/legado/`.
En `versiones/`, cada `npm run suite` deja el scorecard de la versión que midió,
nombrado por su `arbolHash` (el hash del contenido de los skills, no el commit —
ADR-0016). Dos de esos JSON se comparan con:

```bash
npm run diff-versiones                       # las dos versiones más recientes
npm run diff-versiones -- <a> <b>            # dos hashes, o dos rutas a JSON
```

Da, por Caso, el antes → después del veredicto y de **correctas / entregó mal /
sin entregar**, y por Skill el reparto PASA / SUSPENDE / INDETERMINADO. Cambia
también cuando el veredicto sigue igual y lo que cambió fue la tasa de entrega
(«sin cambios» es que la medida es la misma, no que el skill esté bien). Un Caso
que solo existe en una versión se pinta con `—`, no como «no cambió».

**Empieza vacío**: con menos de dos versiones el comando lo dice y sale con `0`.
Medir el mismo contenido dos veces pisa el fichero de su hash: es la misma
versión. Una versión medida con `--skills-local` se avisa como tal (no es lo que
se medirá en CI).

### El legado queda fuera del diff

`reports/legado/` guarda la evidencia anterior a la regla del ticket 01 (la que
declara INDETERMINADO un Caso sin entregas), con la regla con la que se midió
escrita en su cabecera. Se versiona, pero **no se compara**: el diff sólo lee
`reports/versiones/`, y ninguno de sus ficheros declara `arbolHash`, así que ni
pasado a mano se puede tomar por una versión. Lo que hay y por qué su `SUSPENDE`
no significa lo de hoy: [`reports/legado/README.md`](reports/legado/README.md).

```bash
npm run archivar-legado                      # una vez, a mano: no se re-genera
```

## Reporte

Cada `npm run run` persiste la Ejecución en `reports/ejecuciones/<skill>/<caso>/<n>.json`
(N Ejecuciones del mismo Caso quedan numeradas). `npm run report` las agrega por
Skill y Caso y escribe:

- `reports/scorecard.json` — la **fuente de verdad** (lo que consume CI): el Pin
  testeado y, por Skill, el veredicto de cada Caso.
- `reports/scorecard.md` — el Scorecard legible: una tabla por Skill con casos,
  veredicto, Grades y qué Check falló.
- `reports/informe/<skill>/<caso>.md` — el informe por Caso (ver abajo).

El veredicto de un Caso aplica el **ADR-0007** y el **ADR-0014**: se descartan las
Ejecuciones que no alcanzaron el skill (`flujoAlcanzoSkill: false`) y también las
que alcanzaron y no entregaron Artefacto (`entrega: "sin-artefacto"`); basta con
que una de las que entregaron sea correcta. Si ninguna entregó, el Caso queda
**INDETERMINADO** (no es un suspenso): no hay nada que graduar. Son las mismas
Ejecuciones las que llenan el presupuesto de entregas: un Artefacto EXCELENTE
entregado **sin invocar el skill** es un hallazgo de trigger, no una entrega del
Caso, así que no cierra el presupuesto ni aprueba. El Scorecard separa además «no
entregó» de «entregó mal», cuenta intentos junto a entregas y declara el
`arbolHash` de los skills medidos. El Pin que declara sale de las **Ejecuciones**
(nunca de `pin.json` del momento); si el árbol mezcla corridas con Pins distintos,
declara **`mixto`** y lo avisa, en vez de re-etiquetar con el de la primera.

## Informe por Caso

Junto al Scorecard, `npm run suite` y `npm run report` escriben
`informe/<skill>/<caso>.md`: el documento con el que se decide **si el rojo es del
skill o del check**. Por cada Ejecución y cada Check, pone lado a lado:

- la **aserción** del Check (`Exige:` / `Tumba:`), sacada de su propio `assert`;
- la **línea del artefacto** que la tumba, con su número, o —si el Check falla por
  **ausencia**— la línea donde debería estar lo que exige. Es una **pista**, no un
  veredicto: se busca el valor que la aserción nombra, así que en un Check de
  tokens (`p-4`, un color no-token) señala las líneas que lo contienen, y puede
  señalar una que no sea la que rompe la regla; y
- la **sección del skill** de la que el Caso dice depender, citada **por su
  título** (nunca por número de línea) y con su texto.

El texto de la sección se lee **al escribir el informe**, del árbol de skills que
el Pin de las Ejecuciones identifica: el `vendor/` versionado en un Pin remoto, y
el `<checkout>/skills` de un Pin local. No es una foto del sandbox de la corrida:
si `vendor/` ha avanzado desde entonces, la sección citada es la de ahora, no la
que el SUT leyó. Para situarlo, el informe **no** repite el Pin ni el `arbolHash`:
siguen en el Scorecard de la misma corrida.

El informe **presenta, no adivina**: no emite veredicto de culpa del skill ni del
check. El Caso declara de qué sección depende cada Check en su `rubric.md`, bajo
el epígrafe `## Anclaje en desy-skills`:

```markdown
- variante-primaria: desy-styles-reference → «Componentes con `c-*` (bloques UI completos)»
```

`npm run verificar-casos` comprueba, contra `vendor/desy-skills/`, que ese título
existe en el `SKILL.md` del skill citado y —cuando el Caso carga— que el id existe
en el Caso. Es el árbol canónico a propósito: el ancla es una claim del repo y debe
valer contra lo versionado, no contra el checkout de turno. Un Check sin ancla (los
del Framework, por ejemplo) se presenta diciendo que no declara sección; una
Ejecución que no invocó ningún skill **no cita la sección** aunque el skill exista
en el árbol, y lo dice; un Check del Flujo dice por qué no hay línea que citar.

El guardarraíl exige que **cada** Check del Caso tenga su ancla; un Caso nuevo sin
anclar rompe el build. Los Casos anteriores al anclaje por Check están en
`PENDIENTES_DE_ANCLAR` (`src/guardarrail-casos.ts`), con el ticket que los anclará:
`verificar-casos` los enumera al pasar y falla si la lista nombra un Caso que no
existe o que ya está anclado. Es deuda declarada, no una excepción silenciosa.


## Pin

El commit de `desy-skills` bajo test se registra en [`pin.json`](./pin.json) y se copia a `vendor/desy-skills/`. Cada reporte declara el Pin testeado, pero su identidad real es el `arbolHash` de lo que se copió al sandbox: el commit no verifica que `vendor/` coincida con él.

`npm run suite` se niega a medir un `vendor/desy-skills/` con cambios sin commitear. Para iterar sobre un skill sin tocar el vendor, `--skills-local <ruta>` mide un checkout propio y lo declara como `local (sin commit)` (ver «Medir un checkout local» y el ADR-0015).
