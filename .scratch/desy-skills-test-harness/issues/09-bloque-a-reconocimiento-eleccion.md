# 09: Bloque A — reconocimiento y elección

**What to build:** Casos para los skills de la capa de reconocimiento y elección: `component-recognizer` (con verificación contra el linter del catálogo), `choose-page-template` y `choose-library`. Cubren que el agente identifique componentes/variantes y elija librería y plantilla correctas.

**Blocked by:** 05, 08

**Status:** done

- [x] Caso de `component-recognizer` que valida las identificaciones contra el catálogo/linter
- [x] Caso de `choose-page-template` que valida la plantilla elegida por familia, no por cabecera visible
- [x] Caso de `choose-library` que valida la recomendación de librería según caso de uso
- [x] Cada Caso declara sus guards y quality en `checks.json`
- [x] Hay al menos un guard por Caso que hunda el Grade si la decisión es claramente errónea

## Cómo quedó

Los tres skills de este bloque **no producen HTML**: su salida es una decisión en
texto (una tabla de componentes, una plantilla, una recomendación de librería). El
harness de v1 sólo graduaba HTML, así que este ticket añade un **tercer tipo de
Caso** (ver ADR-0011).

**Caso-decisión** (`src/caso.ts`, `src/caso-loader.ts`, `src/grader.ts`): sin
Gold ni HTML, Framework de checks **vacío** (no hay guards comunes de a11y ni de
tokens que aplicar), y dos asserts **de decisión** nuevos:

- `declara_decision` — el SUT declara un valor de dominio (un componente del
  catálogo, una plantilla, una librería).
- `no_declara_decision` — el valor prohibido **no** aparece.

La búsqueda normaliza mayúsculas, tildes y espacios (`logged-selector` ==
`LOGGED-SELECTOR`) y se ancla por límites de palabra (para que `alert` no case
dentro de `alerting`). Es un hecho de decisión, no comparación literal de prosa.

**Artefacto de un Caso-decisión**: el **texto** que emitió el SUT (prosa de
`stdout` + Invocaciones de `stderr`). El runner lo captura como `salida.md`
(`dirArtefactoDeCaso` devuelve `null`); antes la prosa se descartaba. Un Caso con
mockup (`component-recognizer`) adjunta `input/mockup.png` al prompt con `--file`,
igual que la Captura de Gold de un Caso-página.

**Convención de robustez**: un `no_declara_decision` que el SUT pueda *mencionar*
al descartarlo («no es un `header-advanced`») va como **Quality**, no como Guard:
si fuera Guard hundiría un output correcto. El Guard no-negociable de un
Caso-decisión es el **positivo**. (En el Caso de `component-recognizer` el
`header-advanced` quedó como Quality por esto; hay un test que lo fija.)

## Los tres Casos

| Caso | Guard (hunde el Grade) | Quality |
|---|---|---|
| `component-recognizer/decision/reconocimiento-login` | `reconoce-input-group`, `reconoce-header-mini`, `reconoce-accion-primaria` (button + `primario`) | `reconoce-footer`, no inventar `header-advanced` |
| `choose-page-template/decision/404-portal-publico` | `familia-portal` (`with-header-advanced`) | `header-advanced`, no inventar plantilla |
| `choose-library/decision/portal-turistico` | `libreria-desy-html` | `desy-html-starter`, `header-advanced` |

«Contra el catálogo/linter» (criterio 1) se cumple con el assert
**`reconoce_componente`**: no compara cadenas escritas a mano, sino que consulta
`assets/catalog.json` (`componenteEnCatalogo` / `varianteEnCatalogo` en
`src/catalogo.ts`). El componente declarado ha de existir en el catálogo y, si se
pide variante, ha de ser un **ejemplo documentado** de ese componente, con la
normalización español↔inglés del `linter.py` del skill (`primario` ≡ `primary`).
La fila del componente se lee de la tabla de identificación, así que una variante
válida asignada a **otro** componente no cuela. El `linter.py` sigue siendo la
herramienta *del SUT* (su paso de verificación); el harness valida contra la misma
fuente (el catálogo) sin ejecutar el linter del skill.

## Mockup del recognizer

El mockup es una **fixture versionada**: vive como `input/mockup.png` y su fuente
`input/mockup.html`. Se regenera con `npm run capturar-mockup` (misma mecánica que
la Captura de Gold, ADR-0008). En este entorno `agent-browser` no alcanzó su
backend, así que el `mockup.png` commiteado es un **wireframe placeholder válido**
(1280×900, generado sin navegador); el PNG real se genera con el script donde
`agent-browser` funcione.

## Tests

- `test/caso-decision.test.ts`: el tipo, los dos asserts de decisión (presencia,
  ausencia, insensibilidad, pesos), el Framework vacío y el parseo de `checks.json`.
- `test/casos-bloque-a.test.ts`: aceptación de los tres Casos — una decisión
  correcta da EXCELENTE y una decisión claramente errónea da INACEPTABLE; el
  `header-advanced` mencionado al descartar no hunde el Grade.
- `test/runner.test.ts`: el artefacto de un Caso-decisión es el texto del SUT, y
  el mockup se adjunta al prompt.
- `test/caso-loader.test.ts`: un Caso-decisión carga sin Gold ni HTML.
