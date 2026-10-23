# 08: Slice 2 — Caso-página contra Gold (patron-pagina-paso-1-nombre-nif)

**What to build:** El segundo camino vertical: un Caso-página que parte del Gold oficial `patron-pagina-paso-1-nombre-nif` (Gold-HTML + Captura de Gold al prompt) y se evalúa con encadenado, a11y de página y fidelidad estructural contra el Gold-HTML (ancho de container, escala tipográfica, gaps). Demuestra que el encadenado de skills funciona de punta a punta.

**Blocked by:** 02, 04, 06, 07

**Status:** done

- [x] El Gold-HTML y su Captura de Gold están como fixtures del Caso
- [x] El prompt del Caso incluye la Captura de Gold como referencia visual
- [x] Se valida el encadenado esperado (preflight → choose-page-template → implement-* → design-match → validate-accessibility)
- [x] Se validan guards de a11y y fidelidad estructural contra el Gold-HTML
- [x] El scorecard muestra guards OK + grade de calidad antes de escalar — **cerrado por el ticket 12**: `src/scorecard.ts` agrega por Caso `guards {ok,total}` y `gradeCalidad` (de la mejor Ejecución que alcanzó el skill) y el render los tabula.

## Cómo quedó

**El Caso** vive en `casos/implement-pattern/pagina/patron-pagina-paso-1-nombre-nif/`:
`input/prompt.md`, `input/gold.html` (el `patron-pagina-paso-1-nombre-nif.html`
oficial), `input/gold.png` (Captura de Gold, 1900px de viewport) con su manifiesto
`input/gold.captura.json`, `expected/checks.json` y `rubric.md`.

**Fidelidad estructural contra el Gold** (`src/fidelidad.ts`, puro): el artefacto
debe reproducir los hechos que fija el Gold-HTML, no una lista de clases escrita a
mano — el ancho del container (`container mx-auto`), la escala tipográfica del
`h1` del Gold (`c-h1`) y el gap/columnas de la rejilla (`grid-cols-2
lg:grid-cols-4 gap-lg`). Tres guards nuevos en el Framework (`fidelidad-container`,
`fidelidad-escala-h1`, `fidelidad-gap`); el grader recibe el Gold-HTML del Caso
(`grado(..., {tipo, checks, gold})`), que lee el orquestador para que el grader
siga puro.

**Encadenado**: el Caso declara un guard `flujo_canonico` con el Flujo canónico del
glosario (`preflight-check → choose-page-template → implement-* → design-match →
validate-accessibility`). El comodín `implement-*` ya existía (ticket 07).

**Gold-imagen al prompt**: el runner adjunta la Captura de Gold con
`opencode run --file` y añade al prompt una línea que la nombra como referencia
visual (`buildOpencodeArgs`, `runCaso`). La fixture se copia al sandbox; un
Caso-página sin captura revienta con un error claro.

**Artefacto = la página que el SUT escribió (ADR-0009)**: el `dist/` entero lo
genera el build y la caché limpia no lo trae, así que la línea base no separaba
la página del SUT de las ~20 del starter. Ahora el artefacto de un Caso-página es
el `dist/X.html` cuya fuente `src/X.html` cambió. Ver el hallazgo abajo.

**Asserts nuevos** (`src/caso.ts` + `src/grader.ts`): `fidelidad_estructural`
(container/escala_h1/gap contra el Gold) y `contiene_texto` (hecho de contenido
para el compilado, donde el macro ya se expandió).

## Evidencia de la Ejecución real (SUT, Pin `b523ca7`)

Una Ejecución del Caso por el SUT real (harness ya con el scoping de ADR-0009):

- **Artefacto**: un solo fichero, `dist/paso-1-datos-de-identidad.html` (la página
  que escribió el SUT; el starter no contamina). `entrega: con-artefacto`.
- **Flujo observado**: `preflight-check → choose-page-template →
  component-recognizer → styles-reference → implement-layout-patterns →
  implement-component → implement-pattern → design-match → agent-browser →
  validate-accessibility`. Contiene el Flujo canónico **en orden**: el guard
  `encadenado-canonico` pasa, y `design-match` + `validate-accessibility` cierran
  la cadena. **El encadenado funciona de punta a punta** (lo que el Slice 2 quería
  demostrar).
- **Grade: INACEPTABLE**, por el guard `fidelidad-gap`: el SUT usó
  `grid lg:grid-cols-4 gap-x-base` en vez del `grid grid-cols-2 lg:grid-cols-4
  gap-lg` del Gold — fidelidad de gap incorrecta (fallo real del SUT). El
  `tokens-del-sistema` que también fallaba (por `pt-0.5` heredado del Gold) dejó de
  fallar con la decisión de abajo.

El harness determinista está probado aparte: `test/caso-pagina-paso-1.test.ts`
fija que la página del Gold **tal cual** (la Evidencia dorada del Caso) da
**EXCELENTE** por el camino completo, y que romper container/escala/gap/encadenado
la hunde a INACEPTABLE.

## Decisión tomada: el guard de tokens tolera las clases legadas del Gold (ADR-0010)

El `patron-pagina-paso-1-nombre-nif.html` oficial usa clases de la escala numérica
de Tailwind que `desy-styles-reference` prohíbe (`mr-2`, `pt-0.5`, `py-2`, `ml-4`…),
más `mb-0` y `border-black` (que sí son legítimos). Decisión del mantenedor:
**tolerarlas cuando vienen del Gold**. El guard de tokens exime las utilidades que
el Gold del Caso usa (`utilidadesDelGold`), y sigue suspendiendo un valor que el
Gold no use (un `p-4` inventado). Es relativo al Gold: el SUT deja de suspender
por reproducir fielmente la referencia.

De paso se arregló un **bug del detector de color**: marcaba `text-center`,
`text-sm`, `border-b`, `border-t`, `border-r`, `border-l`, `text-right` y
`text-base` como colores fuera del sistema. Son modificadores, no paletas. El Gold
dejó de suspender por 8 clases que ni eran valores inventados.

Evidencia:
- Gold tal cual → **EXCELENTE** (antes INACEPTABLE por tokens).
- SUT que hereda `pt-0.5` del Gold → pasa `tokens-del-sistema`.
- `p-4` inventado (no está en el Gold) → sigue suspendiendo.

## Criterio 5 (scorecard) — cerrado por el ticket 12

El scorecard **agregado** era el ticket 12 y ya está construido. El criterio «el
scorecard muestra guards OK + grade de calidad» queda cerrado: `src/scorecard.ts`
agrega por Caso `guards {ok,total}` y `gradeCalidad` (de la mejor Ejecución que
alcanzó el skill) y `renderScorecard` los tabula. Lo que este ticket entrega es el
resultado de un Caso con su detalle por Check — guards (a11y + fidelidad +
encadenado + tokens) y el Grade de calidad — que es exactamente lo que el scorecard
consume.

## Hallazgo colateral arreglado: `EBUSY` en la limpieza del sandbox

En Windows, los procesos que el SUT deja vivos (esbuild/node de su build) retienen
un instante el `work` del sandbox; quitarlo en ese hueco daba `EBUSY` y tumbaba la
Ejecución antes de emitir la Evidencia. La limpieza reintenta unos ms y no
propaga el fallo (`borrarConReintento`).

## Tests

- `test/caso-pagina-paso-1.test.ts`: el Caso y su Evidencia dorada (la página del
  Gold **tal cual** da EXCELENTE por el camino completo; romper
  container/escala/gap/encadenado la hunde a INACEPTABLE; los guards miran su
  elemento, no «en cualquier parte»; el guard de tokens exime lo que el Gold usa y
  suspende lo inventado).
- `test/fidelidad.test.ts`: las funciones puras de `src/fidelidad.ts`, incluida
  `utilidadesDelGold`.
- `test/runner.test.ts`: adjunto de la Captura de Gold (`--file` + prompt) y error
  claro sin captura.
- `test/scaffold.test.ts`: el scoping `dist`→`src` del artefacto de página.
- `test/tokens.test.ts`: resets a cero, neutros black/white, y el arreglo del
  detector de color (los modificadores no son colores).

En su momento quedó en 273 tests en verde, `tsc --noEmit` limpio y guardarraíl de
navegador OK. La 08 pasó `code-review` (scoping de los guards de fidelidad a su
elemento, el `container` sólo del `<main>`, un único origen para
`HECHOS_ESTRUCTURALES`, un predicado `esCasoPagina` compartido) y una segunda ronda
tras la decisión del mantenedor (tolerancia al Gold + arreglo del detector de
color, ADR-0010). El criterio 5 lo cerró después el scorecard del ticket 12.
