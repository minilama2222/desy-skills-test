# Rúbrica — choose-page-template / 404-portal-publico

Un **404 de un portal público** ("Portal de Salud"). La decisión correcta es la
familia **portal** (header-advanced de 3 bandas), NO la familia webapp.

La trampa del skill: elegir la plantilla por la **cabecera visible** en lugar de
por la **familia**. Un 404 de portal se parece a una página suelta, pero su
familia es portal.

## Guards (su fallo ⇒ INACEPTABLE)

- **familia-portal**: el SUT elige la plantilla de la familia portal
  (`with-header-advanced`). Cualquier otra familia (webapp `logged-out`, edición,
  `home` del starter) es una decisión errónea.

## Quality

- **cabecera-advanced** (peso 1): nombra la cabecera coherente con la familia.
- **no-inventa-plantilla** (peso 1): no se inventa una plantilla nueva (p. ej.
  `not-found-layout`) en lugar de usar una de las 10 de la tabla oficial.

## Anclaje en `desy-skills`

Por cada Check, el skill y la sección de su `SKILL.md` donde vive la regla. El
informe por Caso cita esa sección **por título**, no por número de línea, y
`npm run verificar-casos` comprueba que el título existe en el `SKILL.md`.

- familia-portal: desy-choose-page-template → «Tabla de selección»
- cabecera-advanced: desy-choose-page-template → «Tabla de selección»
- no-inventa-plantilla: desy-choose-page-template → «Anti-patrones (errores frecuentes)»

Prosa de apoyo: la «Tabla de selección» pone el **404** en la fila de portal
(`_template.with-header-advanced.njk`, `header-advanced`) y los «Anti-patrones»
prohíben inventar una plantilla fuera de las diez de la tabla y confundir la
cabecera visible con la familia.

## Qué NO se mide

No hay HTML: el artefacto es la recomendación del SUT. Se juzga la **familia**
elegida, no el wording.
