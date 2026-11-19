# Rúbrica — design-match / afinado-paso-1 (Caso-decisión, Bloque C)

Petición: «medidas ya extraídas; dame la tabla de discrepancias con su categoría».

`desy-design-match` produce una **decisión**: la tabla de discrepancias con la
**categoría** de cada una (trivial / afinable / bloqueante), que es lo que
determina qué se arregla. No produce marcado: es un **Caso-decisión**.

El error que el skill declara como típico: **minimizar una desviación grande**
(«está suficientemente bien» con > 4 px), o aplicar un fix con un **valor
arbitrario** en lugar de un token.

## Guards (su fallo ⇒ INACEPTABLE)

- **reporta-la-fila-h1**: la tabla incluye la fila de `h1.mb` (el elemento con su
  discrepancia). Es el hecho no-negociable: omitir la fila de un elemento con
  desviación es no reportar el hallazgo.
- **reporta-la-fila-lead**: la tabla incluye la fila de `lead.mb`.

## Quality (puntúan hacia el Grade)

- **marca-bloqueante-h1** (peso 2): la fila de `h1.mb` clasifica su Δ (+20 px)
  como **bloqueante** (`declara_fallo { hecho: "h1.mb", veredicto: "bloqueante" }`).
- **marca-bloqueante-gap** (peso 2): la fila de `lead.mb` clasifica su Δ (+12 px)
  como **bloqueante**.
- **no-usa-valor-arbitrario** (peso 1): el fix propuesto no usa un valor
  arbitrario (`max-w-[372px]`), que el skill prohíbe («redondea al token, nunca
  al píxel»).

La **categoría** va como Quality y no como Guard: `bloqueante` es una **etiqueta
de vocabulario** del skill (que además la escribe con emoji, `🔴 bloqueante`), y
`CODING_STANDARDS.md` prohíbe un Guard que dependa de la etiqueta. El veredicto sí
tolera el **formato** (el emoji del skill vale por su palabra), pero no se exige
como no-negociable. El hecho no-negociable es **reportar la fila**.

## Anclaje en `desy-skills`

Por cada Check, una línea con su sección. La prosa de apoyo de abajo se queda.

- reporta-la-fila-h1: desy-design-match → «Paso 3 — Mide y reporta discrepancias»
- reporta-la-fila-lead: desy-design-match → «Paso 3 — Mide y reporta discrepancias»
- marca-bloqueante-h1: desy-design-match → «Paso 3 — Mide y reporta discrepancias»
- marca-bloqueante-gap: desy-design-match → «Paso 3 — Mide y reporta discrepancias»
- no-usa-valor-arbitrario: desy-design-match → «Paso 5 — Aplica el fix mínimo»

Prosa de apoyo: la tabla de discrepancias y sus categorías
(`🔴 bloqueante` / `🟡 afinable` / `🟢 trivial`) están en «Paso 3 — Mide y reporta
discrepancias»; el umbral de 4 px, en «"Está suficientemente bien" con > 4px de
desviación»; y el redondeo al token («redondea al token, nunca al píxel»), en
«Paso 5 — Aplica el fix mínimo».

## Qué NO se mide

No se compara contra píxeles ni se abre navegador: la referencia y la
implementación vienen ya medidas en el prompt. Se juzga la **clasificación** de
las discrepancias, no el wording.
