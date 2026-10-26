# Rúbrica — styles-reference / token-espaciado (Caso-decisión, Bloque C)

Petición: «¿qué clases de utilidad para 16 px y 28 px? ¿puedo usar `p-4` y
`gap-7`?».

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

- **no-escala-numerica** (peso 2): no cierra una respuesta *proponiendo* la
  escala numérica (`gap-7`). Va como **Quality** y no como Guard porque la
  salida correcta **nombra** `gap-7` al prohibirlo, y un `no_declara_decision`
  como Guard suspendería una respuesta correcta (ADR-0011).
- **no-valor-arbitrario** (peso 1): no propone un valor arbitrario
  (`p-[13px]`), que el skill prohíbe explícitamente.

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
