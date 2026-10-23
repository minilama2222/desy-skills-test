# El guard de tokens exime las utilidades que usa el Gold del Caso

En un Caso-página, el guard de tokens (`tokens-del-sistema`) **no marca** las
utilidades que el **Gold-HTML del Caso** usa. La exención se ancla al Gold concreto
del Caso (`utilidadesDelGold`): si el Gold trae `mr-2` o `pt-0.5`, un SUT que lo
reproduce no suspende por heredarlas. Un valor que el Gold **no** usa (un `p-4`
inventado) sigue suspendiendo.

## Contexto

El Gold oficial `patron-pagina-paso-1-nombre-nif.html` usa clases de la escala
numérica de Tailwind que `desy-styles-reference` prohíbe (`mr-2`, `pt-0.5`, `py-2`,
`ml-4`…). El Gold es la **referencia de fidelidad**: la tarea del SUT es
reproducirlo. Un guard que castiga al SUT por copiar el Gold castiga justo lo que
pide el Caso — un falso INACEPTABLE por fidelidad, como el que ya documentó el
ticket 05 con los guards de macro.

Es la misma tensión que ADR-0006 resolvió mirando el artefacto correcto: el guard
debe medir lo que el SUT **aporta**, no lo que el Gold le impone.

## Decisión

El guard de tokens exime una clase cuando **el Gold del Caso la usa**. La fuente
es el propio Gold-HTML (`utilidadesDelGold(gold)`), que el grader ya recibe para
la fidelidad estructural. Sin Gold (Caso-componente), no se exime nada.

## Alternativas descartadas

- **Tolerar toda la escala numérica en páginas.** Simple, pero **desactiva el
  guard**: dejaría de atrapar un `p-4` que el SUT se inventa, que es justo lo que
  el skill prohíbe. La tolerancia debe ser al Gold, no al mundo.
- **Corregir el Gold** (`mr-2` → `mr-sm`). Cambia la referencia oficial para
  satisfacer al harness: falsea el Gold y rompe la fidelidad «contra el
  original».
- **Que el Caso espere la página con tokens y el SUT que copie el Gold
  suspenda.** Castiga la fidelidad, que es el objetivo del Caso-página.

## Hallazgo colateral arreglado: el detector de color no distinguía modificadores

Investigando esto apareció un bug independiente: `esUtilityColor` trataba
`text-center`, `text-sm`, `border-b`, `border-t`, `border-r`, `border-l`,
`text-right` y `text-base` como colores fuera del sistema, porque su patrón
aceptaba cualquier palabra tras el prefijo. Son **modificadores** (alineación,
lado del borde, tamaño), no paletas. El detector ahora exige que el segmento sea
una paleta de color (con una lista de modificadores que no lo son). Efecto: el
Gold dejó de suspender por 8 clases que ni siquiera eran valores inventados.

## Consecuencias

- `tokens-del-sistema` sigue activo y útil en páginas: atrapa lo que el SUT
  inventa, exime lo que el Gold manda.
- La exención se calcula una vez por `grado` (`utilidadesGold`) y se pasa a
  `evaluar`; el grader sigue puro.
- El guard de tokens es ahora **relativo al Gold**. Si un Gold futuro usa clases
  peores, el guard las tolera en ese Caso: es el precio de medir fidelidad, y
  queda acotado a las clases que el Gold realmente trae.
