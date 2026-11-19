# Rúbrica — patron-pagina-paso-1-nombre-nif (Caso-página, Slice 2)

Petición: «Maqueta esta página DESY a partir de la referencia visual» (el paso 1
de un formulario por pasos: identidad con nombre y NIF, checkbox de privacidad y
acciones de página).

El artefacto que se gradúa es el **compilado** de la página que el SUT escribió
(el `dist/X.html` cuya fuente `src/X.html` cambió): lo que se juzga es la página
renderizada (HTML y a11y), y eso sólo existe compilado. Ver ADR-0006 y ADR-0009.

El Gold del Caso es el `patron-pagina-paso-1-nombre-nif.html` oficial
(`input/gold.html`), y su Captura de Gold (`input/gold.png`) viaja al prompt como
referencia visual.

## Guards heredados del Framework de Caso-página

Su fallo ⇒ INACEPTABLE. El Caso no los declara: los aporta el Framework.

- **un-solo-h1** / **skip-link** / **fieldset-con-legend** / **labels-visibles**:
  la a11y de página del ticket 07 (un `h1`, skip-link presente, cada `fieldset`
  con su `legend`, cada control con su `label`).
- **fidelidad-container** / **fidelidad-escala-h1** / **fidelidad-gap**: la
  fidelidad estructural contra el **Gold-HTML** (ticket 08). El artefacto debe
  reproducir, **sobre el mismo elemento**, los hechos de estructura que fija el
  Gold: el ancho del container de su `<main>`, la escala tipográfica de su `h1` y
  el gap y columnas de su rejilla principal. La verdad la fija el Gold, no una
  clase escrita a mano: ver `src/fidelidad.ts` (no se listan aquí las clases, para
  que no envejezcan si el Gold cambia).
- **tokens-del-sistema**: ni escala numérica de Tailwind ni valores arbitrarios.
  En este Caso se **eximen las utilidades que usa el Gold** (`mr-2`, `pt-0.5`…): un
  SUT que reproduce el Gold las hereda y eso es fidelidad, no invención. Un valor
  que el Gold **no** use (un `p-4` inventado) sigue suspendiendo. Ver ADR-0010.

## Guards propios del Caso

- **encadenado-canonico**: el Flujo observado contiene, en orden, el Flujo
  canónico del glosario — `preflight-check → choose-page-template →
  implement-* → design-match → validate-accessibility`. Salta un paso obligatorio
  (p. ej. no afinar con `design-match`, o no validar a11y) ⇒ INACEPTABLE. Es la
  razón de ser del Slice 2: probar que el **encadenado** funciona de punta a punta.

## Quality (puntúan hacia el Grade)

Reproducen la página de la referencia: sus dos campos, la casilla legal y sus
acciones. Se miden como hechos estructurales sobre el compilado (el texto está),
no como comparación literal del documento.

- **campo-nombre**: la página tiene el campo «Nombre y apellidos». Peso 1.
- **campo-nif**: la página tiene el campo «NIF o NIE». Peso 1.
- **checkbox-rgpd**: la página tiene la casilla de «política de privacidad». Peso 1.
- **accion-siguiente**: la página tiene la acción «Siguiente paso». Peso 1.
- **accion-volver**: la página tiene la acción «Volver». Peso 1.

## Anclaje en `desy-skills`

Por cada Check, una línea con su sección. La prosa de apoyo de abajo se
queda **literal**: el ancla se suma, no sustituye.

- encadenado-canonico: desy-preflight-check → «Posición en el workflow DESY»
- campo-nombre: desy-implement-pattern → «Cómo pedimos información (7 patrones)»
- campo-nif: desy-implement-pattern → «Cómo pedimos información (7 patrones)»
- checkbox-rgpd: desy-implement-layout-patterns → «Patrón de un único checkbox (privacidad, términos)»
- accion-siguiente: desy-implement-layout-patterns → «Acciones de página al final del form»
- accion-volver: desy-implement-layout-patterns → «Acciones de página al final del form»

- Encadenado y checklist de salida: `desy-preflight-check` → «Posición en el
  workflow DESY» (los 5 pasos) y «Checklist de salida».
- Anchos, tipografía y gaps del Gold: `desy-design-match` → «Medidas canónicas»
  y «Paso 3 — Mide y reporta discrepancias» (container, escala, `gap-lg`).
- a11y: `desy-validate-accessibility` (checklist de grep).
- Plantilla de página: `desy-choose-page-template`.

## Fuera de alcance de este Caso

No se compara pixel a pixel contra el Gold-imagen (capa nightly, fuera de v1): la
verificación visual es determinista contra el Gold-HTML. No se agrega el scorecard
(ticket 12): el Caso reporta su propio JSON con guards OK + Grade.
