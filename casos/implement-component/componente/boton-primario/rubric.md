# Rúbrica — boton-primario (Caso-componente, Slice 1)

Petición: «Genera un botón primario de tamaño estándar con el texto "Enviar"».

## Guards (su fallo ⇒ INACEPTABLE)

- **usa-macro-boton**: el output usa el macro `componentButton` de la librería
  DESY. HTML suelto con clases `c-button` copiadas a mano no cuenta: la macro
  es la que aplica tokens y ARIA.
- **variante-primaria**: la llamada al macro lleva `c-button--primary` en
  `classes`. La variante es el corazón de la petición; el botón por defecto
  (borde azul, sin relleno) no es lo pedido. El nombre de la clase está
  verificado en `desy-skills` → `desy-styles-reference`.
- **sin-props-inventados**: ninguna prop de la llamada al macro sale del
  catálogo de `componentButton` (`text`, `name`, `classes`, `disabled`, `href`,
  `html`, `target`, `attributes`, `title`, `element`, `preventDoubleClick`,
  `type`, `value`). Inventar props (`variante`, `color`, …) es el error
  histórico que el skill `desy-implement-component` declara como típico.

## Quality (puntúan hacia el Grade)

- **tamano-base**: el tamaño «estándar» del botón es el tamaño base, y el tamaño
  base de `componentButton` **no lleva clase de tamaño** — `c-button--sm`
  cambiaría la altura (~30 px frente a ~42 px). Que el botón sea base se
  comprueba, por tanto, como ausencia de esa clase. Peso 2.
- **tamano-base-no-grande**: por la misma razón, la llamada no lleva
  `c-button--lg` (~54 px frente a ~42 px). Es la otra mitad del mismo hecho:
  ausencia de las dos clases que no son el tamaño base. Peso 2.

## Anclaje en `desy-skills`

- Macros y props: `desy-implement-component` → «Mapeo de componentes» y
  `_examples.button.njk`.
- Clases de variante y tamaño: `desy-styles-reference` → «Componentes con
  `c-*`» (`c-button`, `c-button--primary`, `c-button--secondary`,
  `c-button--alert`, `c-button--sm/base/lg`).
- Reglas de tamaño: `desy-implement-component` → tabla «Tamaños: cada
  componente con su propia clase».

## Fuera de alcance de este Caso

No se evalúa el Gold ni la fidelidad visual (es un Caso-componente, sin Gold).
Tampoco se evalúa el encadenado de skills: eso llega con los guards de Flujo
(ticket 07) y el Caso-página (ticket 08).
