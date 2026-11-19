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
  skill declaraba `gap-x-4` en su propio ejemplo; eso se corrigió en `desy-skills`
  (PR #35, Pin `ef3a9c7`) y hoy el ejemplo del skill coincide con lo que mide el
  Check. Un SUT que escriba la escala numérica sigue suspendiendo. El guard de
  tokens del Framework (`tokens-del-sistema`) caza además utilidades por defecto y
  valores arbitrarios.

## Anclaje en `desy-skills`

Por cada Check **propio** del Caso, el skill y la sección de su `SKILL.md` donde
vive la regla. Los dos Guards de a11y no se anclan: son del Framework (ver abajo).

- estructura-grid: desy-implement-layout-patterns → «Grid responsivo del formulario»
- acciones-en-section: desy-implement-layout-patterns → «Acciones de página al final del form»
- accion-transparente: desy-implement-layout-patterns → «Acciones de página al final del form»
- espaciado-del-sistema: desy-styles-reference → «Espaciado (escala de tokens del proyecto)»

Prosa de apoyo: el grupo semántico (`fieldset` + `legend` `sr-only`) está en
`desy-implement-layout-patterns` → «Fieldset+legend sr-only para grupos semánticos»,
y el checklist de labels, en `desy-validate-accessibility` → «Checklist sin servidor
(sesiones autónomas)».

**`fieldset-con-legend` y `labels-visibles` son Checks del Framework**, y éste es
un Caso-**componente**: el Framework de un Caso-componente sólo aporta
`tokens-del-sistema`, así que este Caso los declara en su `checks.json` para
medirlos y **no los ancla** —un Check del Framework no se ancla desde la rúbrica
(retro de la sesión del ticket 12)—. El informe los presenta sin sección: su
fuente es el Framework, y las secciones donde el skill dice la regla están en la
prosa de arriba.

## El skill contradice este Check

_Ninguna declarada._ La que hubo —`espaciado-del-sistema` frente a «Grid responsivo
del formulario», que decía `gap-x-4`— se cerró en `desy-skills` (PR #35, Pin
`ef3a9c7`): la sección del skill ya usa `gap-x-base`, el mismo token que exige el
Check. Si el skill vuelve a arrastrar la escala numérica, se declara aquí otra vez.

## Fuera de alcance de este Caso

No se compara contra un Gold (es un Caso-componente, sin Gold) ni se evalúa el
encadenado de skills. La fidelidad estructural contra un Gold-HTML (ancho de
container, escala tipográfica, gap del Gold) es propia de un Caso-página y ya se
cubre en el Bloque del `patron-pagina-paso-1-nombre-nif`.
