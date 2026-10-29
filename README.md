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
npm run verificar-mockup  # valida los mockup.png commiteados (sin navegador; --recapturar sí abre)
npm run capturar-gold -- --skill <skill> --case <caso>  # genera/valida la Captura de Gold
npm run capturar-mockup  # genera el mockup (input/mockup.png) de los Casos-decisión
npm run report    # agrega las Ejecuciones de `run` y renderiza el Scorecard (JSON + markdown)
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
npm run suite                                        # todos los Casos, 3 Ejecuciones cada uno
npm run suite -- --skill implement-component         # un skill
npm run suite -- --skill implement-component --case boton-primario   # un Caso
npm run suite -- --n 1                               # N Ejecuciones por Caso (por defecto 3)
npm run suite -- --reports reports/mi-corrida        # árbol de salida (por defecto reports/suite)
```

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
- Las N Ejecuciones persistidas en `reports/suite/ejecuciones/<skill>/<caso>/<n>.json`.

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

Cada `npm run suite` escribe en su propio árbol y vacía el anterior, así que el
veredicto no mezcla Ejecuciones de corridas distintas. Las corridas sueltas de
`npm run run` siguen en `reports/ejecuciones/` y su reporte es `npm run report`.

## Reporte

Cada `npm run run` persiste la Ejecución en `reports/ejecuciones/<skill>/<caso>/<n>.json`
(N Ejecuciones del mismo Caso quedan numeradas). `npm run report` las agrega por
Skill y Caso y escribe:

- `reports/scorecard.json` — la **fuente de verdad** (lo que consume CI): el Pin
  testeado y, por Skill, el veredicto de cada Caso.
- `reports/scorecard.md` — el Scorecard legible: una tabla por Skill con casos,
  veredicto, Grades y qué Check falló.

El veredicto de un Caso aplica el **ADR-0007** y el **ADR-0014**: se descartan las
Ejecuciones que no alcanzaron el skill (`flujoAlcanzoSkill: false`) y también las
que alcanzaron y no entregaron Artefacto (`entrega: "sin-artefacto"`); basta con
que una de las que entregaron sea correcta. Si ninguna entregó, el Caso queda
**INDETERMINADO** (no es un suspenso): no hay nada que graduar. El Scorecard separa
además «no entregó» de «entregó mal», y declara el `arbolHash` de los skills
medidos.

## Pin

El commit de `desy-skills` bajo test se registra en [`pin.json`](./pin.json) y se copia a `vendor/desy-skills/`. Cada reporte declara el Pin testeado.
