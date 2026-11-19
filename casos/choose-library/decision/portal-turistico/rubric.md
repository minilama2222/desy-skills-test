# Rúbrica — choose-library / portal-turistico

**Portal público con SEO crítico**, equipo de maquetadores sin Angular, sin
autenticación. La decisión correcta es **desy-html** (portal estático, ligero,
indexable); **desy-angular**/`desy-ionic` son la decisión errónea (overhead de
framework para un sitio que no lo necesita).

## Guards (su fallo ⇒ INACEPTABLE)

- **libreria-desy-html**: la recomendación es `desy-html`. Recomendar
  `desy-angular` o `desy-ionic` para un portal estático es el antipatrón que el
  skill existe para evitar.

## Quality

- **starter-correcto** (peso 1): parte del starter oficial
  (`desy-html-starter`), no de `npm install desy-html` en un proyecto vacío.
- **cabecera-advanced** (peso 1): la cabecera recomendada es `header-advanced`
  (3 bandas), coherente con la familia portal.

## Anclaje en `desy-skills`

Por cada Check, el skill y la sección de su `SKILL.md` donde vive la regla. El
informe por Caso cita esa sección **por título**, no por número de línea, y
`npm run verificar-casos` comprueba que el título existe en el `SKILL.md`.

- libreria-desy-html: desy-choose-library → «Decision framework (3 preguntas)»
- starter-correcto: desy-choose-library → «Regla fundamental (lee esto antes de recomendar)»
- cabecera-advanced: desy-choose-library → «Pregunta 1: ¿Qué tipo de producto?»

Prosa de apoyo: la tabla de «Decision framework (3 preguntas)» empareja
**sitio web / portal** con `desy-html` y `header-advanced`; la «Regla
fundamental» es la que hace del starter (`desy-html-starter`) la forma de usar la
librería. El «Output esperado» recoge los tres hechos en la recomendación.

## Qué NO se mide

No hay HTML: el artefacto es la recomendación del SUT. Se juzga la **librería**
elegida y, con menos peso, el starter y la cabecera.

El guard `libreria-desy-html` es un assert **positivo**: comprueba que `desy-html`
aparece como decisión. Es el gate no-negociable (una recomendación de
`desy-angular` sin `desy-html` lo suspende). Su límite conocido: un output que
mencione `desy-html` de pasada *y* recomiende `desy-angular` no lo suspende por
esta vía — cubierto por el propio texto del skill, que exige una recomendación
única y clara.
