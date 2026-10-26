# Rúbrica — design-match / afinado-paso-1 (Caso-decisión, Bloque C)

Petición: «medidas ya extraídas; dame la tabla de discrepancias con su categoría».

`desy-design-match` produce una **decisión**: la tabla de discrepancias con la
**categoría** de cada una (trivial / afinable / bloqueante), que es lo que
determina qué se arregla. No produce marcado: es un **Caso-decisión**.

El error que el skill declara como típico: **minimizar una desviación grande**
(«está suficientemente bien» con > 4 px), o aplicar un fix con un **valor
arbitrario** en lugar de un token.

## Guards (su fallo ⇒ INACEPTABLE)

- **marca-bloqueante-h1**: la fila de `h1.mb` clasifica su Δ (+20 px) como
  **bloqueante**. Es un hecho de la misma línea (el elemento y su veredicto), no
  basta con nombrar el elemento: `declara_fallo { hecho: "h1.mb", veredicto:
  "bloqueante" }`.
- **marca-bloqueante-gap**: la fila de `lead.mb` clasifica su Δ (+12 px) como
  **bloqueante**.

El Guard es la **clasificación positiva correcta** (ver `CODING_STANDARDS.md`):
si la decisión es errónea (clasificar de menos), el guard cae.

## Quality (puntúan hacia el Grade)

- **no-usa-valor-arbitrario** (peso 2): el fix propuesto no usa un valor
  arbitrario (`max-w-[372px]`), que el skill prohíbe («redondea al token, nunca
  al píxel»).
- **reporta-la-tabla** (peso 1): la respuesta incluye la categoría `trivial` en
  la tabla (la fila 3, que coincide y no es discrepancia): el informe está
  completo, no sólo con lo que falla.

## Anclaje en `desy-skills`

- Tabla de discrepancias y categorías: `desy-design-match` → «Paso 3 — Mide y
  reporta discrepancias» (`🔴 bloqueante` / `🟡 afinable` / `🟢 trivial`).
- Umbral de 4 px: `desy-design-match` → «"Está suficientemente bien" con > 4px
  de desviación».
- Redondeo al token: `desy-design-match` → «Paso 5 — Aplica el fix mínimo»
  («redondea al token, nunca al píxel»).

## Qué NO se mide

No se compara contra píxeles ni se abre navegador: la referencia y la
implementación vienen ya medidas en el prompt. Se juzga la **clasificación** de
las discrepancias, no el wording.
