# desy-skills-test

Harness de tests de capacidad para los 12 skills de [`desy-skills`](https://github.com/minilama2222/desy-skills).

Cada **Caso** alimenta al SUT (agente `opencode run` headless) con una entrada y una tarea, y evalúa la salida contra una rúbrica declarativa de **Checks**. El resultado es un **Grade** por Caso y un **Scorecard** por Skill.

- Vocabulario del dominio: [`GLOSSARY.md`](./GLOSSARY.md)
- Decisiones: [`docs/adr/`](./docs/adr/)
- Spec y tickets: [`.scratch/desy-skills-test-harness/`](./.scratch/desy-skills-test-harness/)

## Uso

```bash
npm install
npm test          # corre los tests unitarios (vitest)
npm run typecheck # tsc --noEmit
npm run run -- --skill implement-component --case boton-primario  # ejecuta un Caso por el SUT y emite Evidencia + Grade
npm run grade     # puntúa un Check sobre Evidencia vacía (herramienta de autoría)
npm run load -- <ruta>  # carga un Caso desde su carpeta y muestra su JSON
npm run verificar-casos  # guardarraíl: todos los Casos de casos/ deben ser cargables
npm run verificar-mockup  # valida los mockup.png commiteados (sin navegador; --recapturar sí abre)
npm run capturar-gold -- --skill <skill> --case <caso>  # genera/valida la Captura de Gold
npm run capturar-mockup  # genera el mockup (input/mockup.png) de los Casos-decisión
npm run report    # agrega las Ejecuciones y renderiza el Scorecard (JSON + markdown)
npm run bump-pin <ref>  # actualiza vendor/ + pin.json al ref dado
```

## Casos

Los Casos viven en `casos/<skill>/<tipo>/<id>/`, con `input/prompt.md`,
`expected/checks.json` y `rubric.md`. El tipo (`componente` | `pagina` |
`decision`) determina el Framework de checks base que el grader combina con los
checks del Caso.

Hay cinco Casos:

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

Las **fixtures de imagen** (el Gold-imagen `input/gold.png` de un Caso-página y el
mockup `input/mockup.png` de un Caso-decisión) están **commiteadas** y sólo se
regeneran con `npm run capturar-gold` / `npm run capturar-mockup`, que abren un
navegador (`agent-browser`). Donde `agent-browser` no esté disponible, la fixture
commiteada es la que vale; un `mockup.png` de andamiaje es un wireframe válido, no
un error.

## Reporte

Cada `npm run run` persiste la Ejecución en `reports/ejecuciones/<skill>/<caso>/<n>.json`
(N Ejecuciones del mismo Caso quedan numeradas). `npm run report` las agrega por
Skill y Caso y escribe:

- `reports/scorecard.json` — la **fuente de verdad** (lo que consume CI): el Pin
  testeado y, por Skill, el veredicto de cada Caso.
- `reports/scorecard.md` — el Scorecard legible: una tabla por Skill con casos,
  veredicto, Grades y qué Check falló.

El veredicto de un Caso aplica el **ADR-0007**: se descartan las Ejecuciones que
no alcanzaron el skill (`flujoAlcanzoSkill: false`) y basta con que una de las que
quedan sea correcta. Si ninguna lo alcanzó, el Caso queda **INDETERMINADO** (no es
un suspenso). El Scorecard separa además «no entregó» (`sin-artefacto`) de
«entregó mal».

## Pin

El commit de `desy-skills` bajo test se registra en [`pin.json`](./pin.json) y se copia a `vendor/desy-skills/`. Cada reporte declara el Pin testeado.
