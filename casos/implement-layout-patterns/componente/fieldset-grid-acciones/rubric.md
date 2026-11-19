# Rúbrica — fieldset-grid-acciones (Caso-componente, Bloque B)

Petición: «Estructura un grupo de formulario DESY con
`desy-implement-layout-patterns`» (un fieldset semántico con la rejilla
responsiva del formulario y las acciones de página al final).

Es un **Caso-componente** (fragmento, sin Gold). El artefacto es el **fuente** que
el SUT escribe en `src/`. A diferencia del patrón basado en macro, este Caso se
mide sobre **HTML estructural**: el skill `desy-implement-layout-patterns` define
la maquetación como marcado (`<fieldset>`, grids, `<section>` de acciones), no
como una llamada a macro.

## Guards (su fallo ⇒ INACEPTABLE)

- **fieldset-con-legend** (a11y): todo `<fieldset>` lleva su `<legend>`. El
  `legend` es lo que anuncia el grupo a un screen reader al entrar; sin él se
  pierde la agrupación semántica (WCAG 2.2 AA). El `legend` va oculto con
  `sr-only` cuando el título visible vive fuera del `fieldset`.
- **labels-visibles** (a11y): cada `input`, `select` y `textarea` con su `label`
  asociado por `for`/`id`. Es el checklist determinista de
  `desy-validate-accessibility`.
- **estructura-grid** (estructura): el artefacto declara una rejilla responsiva
  con `lg:grid-cols-4` **sobre el mismo elemento** que es rejilla (`grid`). El
  hecho estructural es «hay una rejilla que en desktop reparte en 4 columnas»,
  no la lista literal de clases: un `lg:grid-cols-4` suelto en un `div` que no es
  rejilla no layouta nada. En mobile no se fijan columnas (`grid-cols-*`), cada
  item ocupa su fila.

## Quality (puntúan hacia el Grade)

- **acciones-en-section** (peso 1): las acciones declaran su encabezado «Acciones de
  página» (el landmark de la sección de acciones), que el skill monta en una
  `<section>` con `<h2 class="sr-only">`.
- **accion-transparente** (peso 1): la acción secundaria —«Volver»— se monta con
  el botón **transparente** (`c-button--transparent`), no como
  `<a class="c-link">`. Es el error típico que el skill declara.
- **espaciado-del-sistema** (peso 2): **fidelidad de tokens**. El ritmo entre
  bloques usa la escala canónica de DESY (`gap-x-base`, `mt-base mb-base lg:mt-0
  lg:mb-0`, `gap-sm`), no la escala numérica de Tailwind ni valores arbitrarios. El
  caso que el skill **arrastra en su propio ejemplo** —`gap-x-4`— es justo el que
  `desy-styles-reference` manda corregir a `gap-x-base` (1rem): el guard lo
  suspende, que es su trabajo. El guard de tokens del Framework
  (`tokens-del-sistema`) sigue cazando además utilidades por defecto y valores
  arbitrarios.

## Anclaje en `desy-skills`

- fieldset-con-legend: desy-implement-layout-patterns → «Fieldset+legend sr-only para grupos semánticos»
- labels-visibles: desy-validate-accessibility → «Checklist sin servidor (sesiones autónomas)»
- estructura-grid: desy-implement-layout-patterns → «Grid responsivo del formulario»
- acciones-en-section: desy-implement-layout-patterns → «Acciones de página al final del form»
- accion-transparente: desy-implement-layout-patterns → «Acciones de página al final del form»
- espaciado-del-sistema: desy-styles-reference → «Espaciado (escala de tokens del proyecto)»

## El skill contradice este Check

- espaciado-del-sistema: desy-implement-layout-patterns → «Grid responsivo del formulario» — el skill dice «`gap-x-4`» (1rem horizontal); el Check exige la escala de tokens (`gap-x-base`)

El bloque de código de `desy-implement-layout-patterns` usa `gap-x-4` en la rejilla
(«Grid responsivo del formulario»), pero `desy-styles-reference` es explícita: la
escala numérica de Tailwind **no** es la de DESY y `gap-x-4` se corrige a
`gap-x-base` (1rem, su equivalente). El harness toma la referencia de tokens como
autoridad, así que un SUT que copie `gap-x-4` literal pierde el Quality. Es una
incoherencia del corpus de skills, y este Caso la mide en el sentido que fija
`desy-styles-reference`. El informe por Caso y el Scorecard la sacan a la cabecera
en cada corrida; cambiar el skill o el Check lo decide una persona.

## Fuera de alcance de este Caso

No se compara contra un Gold (es un Caso-componente, sin Gold) ni se evalúa el
encadenado de skills. La fidelidad estructural contra un Gold-HTML (ancho de
container, escala tipográfica, gap del Gold) es propia de un Caso-página y ya se
cubre en el Bloque del `patron-pagina-paso-1-nombre-nif`.
