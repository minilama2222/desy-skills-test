# Rúbrica — validate-accessibility / checklist-sin-servidor (Caso-decisión, Bloque C)

Petición: «valida esta página sin servidor (checklist de grep) y dime el
resultado de cada comprobación».

`desy-validate-accessibility` tiene un **Checklist sin servidor** que «se
ejecuta siempre, también en sesiones autónomas: solo lee ficheros». Su salida es
un **informe** con el veredicto de cada comprobación. No produce marcado: es un
**Caso-decisión**, graduado por **hechos de informe**.

El HTML de entrada tiene **cuatro** fallos deliberados: **2 `<h1>`**, un
`<fieldset>` **sin `<legend>`**, un `<input name="nif">` **sin `label for`** y
**sin skip-link**. El error típico del skill es **no ejecutar el checklist** y
declarar la página accesible.

## Guards (su fallo ⇒ INACEPTABLE)

- **detecta-h1-de-mas**: el informe declara que la comprobación `un-solo-h1`
  **falla** (`declara_fallo { hecho: "un-solo-h1" }`).
- **detecta-fieldset-sin-legend**: el informe declara que
  `fieldset-con-legend` **falla**.

El Guard es la **declaración positiva del hallazgo** (ver `CODING_STANDARDS.md`):
nombrar el check diciendo que está OK no lo satisface, porque el hecho y el
marcador de fallo han de convivir en la **misma línea** del informe.

## Quality (puntúan hacia el Grade)

- **detecta-label-sin-for** (peso 2): el informe declara que `labels-visibles`
  **falla** (el `input` sin `for`).
- **detecta-skip-link-ausente** (peso 1): el informe declara que `skip-link`
  **falla**.
- **no-inventa-un-pase** (peso 1): el informe no afirma «0 errores»: hay fallos.

Los dos primeros van como **Quality** y no como Guard porque el no-negociable
del Caso son los hechos estructurales (un `h1`, `fieldset`+`legend`); los otros
dos matizan el Grade.

## Anclaje en `desy-skills`

- Checklist sin servidor: `desy-validate-accessibility` → «Checklist sin servidor
  (sesiones autónomas)» (los cinco `grep`: un solo `h1`, `fieldset`/`legend`,
  labels, skip-link).
- Regla de agente: el mismo skill distingue este checklist (siempre) de los
  bloques axe-core/pa11y (reference templates, no automáticos).

## Qué NO se mide

No se abre navegador ni se corre axe-core (capa nightly, fuera de v1): la
validación es el checklist determinista sobre el HTML. Se juzga el **veredicto**
de cada comprobación, no el wording.
