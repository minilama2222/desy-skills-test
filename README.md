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
npm run grade     # puntúa artefactos (pendiente de tickets 03+)
npm run report    # agrega resultados y renderiza el Scorecard
npm run bump-pin <ref>  # actualiza vendor/ + pin.json al ref dado
```

## Casos

Los Casos viven en `casos/<skill>/<tipo>/<id>/`, con `input/prompt.md`,
`expected/checks.json` y `rubric.md`. El tipo (`componente` | `pagina`) determina
el Framework de checks base que el grader combina con los checks del Caso.

El primer Caso es `casos/implement-component/componente/boton-primario/` (Slice 1):
un botón primario de tamaño estándar. Sus guards cubren el uso del macro
`componentButton`, la variante `c-button--primary` y la ausencia de props
inventadas; sus checks de quality cubren el tamaño base.

## Pin

El commit de `desy-skills` bajo test se registra en [`pin.json`](./pin.json) y se copia a `vendor/desy-skills/`. Cada reporte declara el Pin testeado.
