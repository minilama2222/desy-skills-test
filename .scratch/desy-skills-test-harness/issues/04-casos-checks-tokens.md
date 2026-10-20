# 04: Soporte de Casos y checks.json + librería de tokens DESY

**What to build:** La carga declarativa de un Caso (carpeta con `input/`, `expected/checks.json`, `rubric.md`), el Framework de checks por tipo de Caso (Caso-componente / Caso-página), y la librería de tokens DESY (escala 8/16/28/32, familias de color, `c-h*`, `c-paragraph-*`) que los checks usan para validar sin inventar valores.

**Blocked by:** 03

**Status:** done

- [x] Se cargan Casos desde su carpeta con `input/`, `expected/checks.json` y `rubric.md`
- [x] Existen Frameworks de checks base para Caso-componente y Caso-página
- [x] Los tokens DESY viven en módulo propio y los checks los consultan
- [x] Un `checks.json` malformado produce un error claro
- [x] Tests unitarios de la carga y de la combinación Framework+caso

## Comments

Cerrado en la rama `integrate/02-03` (commit `175cb80`).

- **Librería de tokens** en `src/tokens.ts`: escala canónica (`ESCALA_ESPACIADO`), familias de color (`FAMILIAS_COLOR`), clases tipográficas (`c-h*`, `c-paragraph-*`), y detectores `esUtilityTokenValido` / `esUtilityTailwindPorDefecto` / `esUtilityArbitraria` / `esColorDelSistema`.
- **Asserts que consultan tokens** añadidos al modelo (`sin_utility_por_defecto`, `espaciado_del_sistema`, `color_del_sistema`, `usa_clase_tipografica`) y evaluados en `src/grader.ts`; el Framework de ambos tipos de Caso incluye el guard `tokens-del-sistema`.
- **Carga declarativa** en `src/caso-loader.ts`: `cargarCaso(<skill>/<tipo>/<id>)` y `cargarCasos(root)`; valida `input/prompt.md`, `rubric.md`, `expected/checks.json` y, para Caso-página, `input/gold.html`; errores claros con la ruta implicada. CLI `npm run load <ruta>`.
- 105 tests en verde; `tsc --noEmit` limpio. Pasó `code-review` (se atendieron los hallazgos: color del sistema consultado por los checks, `esEspaciadoDesconocido` eliminado, test de checks.json estructuralmente inválido).


