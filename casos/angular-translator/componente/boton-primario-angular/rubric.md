# Rúbrica — angular-translator / boton-primario-angular (Caso-componente, Bloque C)

Petición: «traduce este macro `componentButton` a `desy-angular`; target Angular
19».

`desy-angular-translator` produce **código** (TypeScript + template Angular), no
una decisión en prosa: es un **Caso-componente**. Su Artefacto es el **fuente**
que el SUT escribe en `src/` (ADR-0006), así que los guards miran el template
Angular resultante, no la prosa.

El componente elegido es del grupo **trivial** («macro → selector + `[binding]`»,
el patrón general del skill), el mismo que el skill declara validado. El error
que el skill declara como típico es **dejar el macro sin traducir** o buscar una
traducción 1:1 en un componente compuesto cuando no toca.

## Guards (su fallo ⇒ INACEPTABLE)

- **usa-selector-desy-button**: el template usa el selector Angular
  `<desy-button>`. Dejar el macro Nunjucks `{{ componentButton({...}) }}` sin
  traducir suspende. Es el hecho no-negociable: sin el selector no hay traducción.

## Quality (puntúan hacia el Grade)

- **conserva-la-variante-primaria** (peso 2): la variante CSS `c-button--primary`
  se conserva. En Angular es **el mismo nombre de clase** (`classes` es igual en
  ambas librerías), así que perderla es perder la variante.
- **traduce-el-binding-de-texto** (peso 1): la prop `text` se traduce a un
  `[text]` binding (propiedades del macro → inputs con binding).
- **no-deja-el-macro-nunjucks** (peso 1): el artefacto no deja la llamada al
  macro `componentButton`. Va como **Quality** y no como Guard porque el SUT
  puede **nombrar** el macro al explicar la equivalencia, y un
  `no_declara_decision` como Guard suspendería una respuesta correcta
  (ADR-0011).

## Anclaje en `desy-skills`

Por cada Check, una línea con su sección. La prosa de apoyo de abajo se queda.

- usa-selector-desy-button: desy-angular-translator → «Tabla de equivalencias por componente (15+ validados)»
- conserva-la-variante-primaria: desy-angular-translator → «Patrones generales de traducción»
- traduce-el-binding-de-texto: desy-angular-translator → «Parámetros que están en AMBAS librerías (con la misma semántica)»
- no-deja-el-macro-nunjucks: desy-angular-translator → «Tabla de equivalencias por componente (15+ validados)»

Prosa de apoyo: el patrón general (macro → selector, props → inputs con
`[binding]`) está en «Patrones generales de traducción»; la equivalencia
`<desy-button>` ≡ `{{ componentButton({...}) }}`, en «Tabla de equivalencias por
componente»; y la misma semántica de `classes` en ambas librerías, en
«Parámetros que están en AMBAS librerías».

## Qué NO se mide

No se compila con `ng build` (eso pediría un proyecto Angular, fuera de v1): se
gradúa el **fuente** que el SUT escribe. No se evalúa el wording de la
explicación, sólo el template traducido.
