# Rúbrica — styles-reference / token-espaciado (Caso-decisión, Bloque C)

Petición: «¿qué clases de utilidad para 16 px y 28 px (y a qué valor del sistema
equivalen)?».

`desy-styles-reference` es la **fuente de verdad de los tokens**: su salida es
una **decisión** (qué clase del sistema corresponde a cada medida), no HTML. Es
un **Caso-decisión**: el Artefacto es el texto del SUT y sus checks son de
decisión. El error histórico que el skill declara como típico es responder con
la **escala numérica de Tailwind** (`p-4`, `gap-7`) o un valor arbitrario en
lugar del token del proyecto.

## Guards (su fallo ⇒ INACEPTABLE)

- **token-base-16px**: el SUT declara `p-base` (la unidad base, 1rem) para los
  16 px. Cualquier otra respuesta (`p-4`) es la escala de Tailwind, que el
  sistema no tiene.
- **token-lg-28px**: el SUT declara `p-lg` (1.75rem) para los 28 px, el token de
  separación entre secciones.

El Guard es la **declaración positiva del token correcto** (ver
`CODING_STANDARDS.md`): si la decisión es errónea, el guard cae.

## Quality (puntúan hacia el Grade)

- **explica-la-unidad-base** (peso 2): la respuesta declara que la unidad base es
  `1rem` (el valor del token `base`), no un número de píxel suelto: es el hecho
  de contenido de la respuesta.
- **familia-gap-base** (peso 1): nombra la familia del gap (`gap-base`), no sólo
  el padding: el espaciado de bloques se aplica con `gap-*` además de `p-*`.

## Qué NO se mide

No hay HTML: el artefacto es la respuesta del SUT. Se juzga la **clase de token**
elegida, no el wording ni el formato de la explicación. **Nota**: la escala
numérica de Tailwind no se comprueba con un `no_declara_decision` negativo porque
el prompt **nombra** la escala al preguntar, y una respuesta correcta la repite al
descartarla; el no-negociable es el token positivo (el Guard).


## Anclaje en `desy-skills`

- Tokens de espaciado: `desy-styles-reference` → «Espaciado (escala de tokens
  del proyecto)» (`--spacing-base` 1rem, `--spacing-lg` 1.75rem).
- Tabla bueno/malo: `desy-styles-reference` → «`p-4` → `p-base`», «`gap-4` →
  `gap-base`».
- Valores arbitrarios: `desy-styles-reference` → «Prohíbe los valores
  arbitrarios (`[372px]`, `[3.375rem]`)».

## Qué NO se mide

No hay HTML: el artefacto es la respuesta del SUT. Se juzga la **clase de token**
elegida, no el wording ni el formato de la explicación.
