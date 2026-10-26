# 10: Bloque B — implementación de patrones y layouts

**What to build:** Casos para los skills de implementación: `implement-pattern` (uno de los 55 patrones atómicos) e `implement-layout-patterns` (fieldset+legend, grids, secciones de acciones, cabecera con skip-link). Cubren que el código generado use los macros y tokens correctos.

**Blocked by:** 05, 08

**Status:** done

- [x] Caso de `implement-pattern` sobre un patrón atómico concreto (guards de macro y tokens)
- [x] Caso de `implement-layout-patterns` que valida fieldset+legend y la estructura de grid
- [x] Los Casos de layout incluyen los guards de a11y aplicables
- [x] Cada Caso declara guards y quality en `checks.json`
- [x] Al menos un Quality mide la fidelidad de tokens usados

## Cómo quedó

Dos **Caso-componente** (fragmento, sin Gold): el artefacto es el fuente (`src/`)
que el SUT escribe, así que lo que se gradúa es la sección que produce.

### Los dos Casos

| Caso | Guards (hunden el Grade) | Quality |
|---|---|---|
| `implement-pattern/componente/politicas-privacidad` | `usa-macro-checkboxes` (`macro_presente`), `sin-props-inventados` | `legend-sr-only`, `texto-politica`, `espaciado-del-sistema` (peso 2) |
| `implement-layout-patterns/componente/fieldset-grid-acciones` | `fieldset-con-legend`, `labels-visibles`, `estructura-grid` | `acciones-en-section`, `accion-transparente`, `espaciado-del-sistema` (peso 2) |

El patrón atómico del primero es **«Aceptar políticas de privacidad»** (uno de los
55): la casilla legal en un `fieldset` con `legend` oculto, montada con el macro
`componentCheckboxes`. Se eligió para no solapar con el Caso-página del ticket 08
(que ya cubre identidad/NIF) y porque tiene un macro claro que guardar.

### Hallazgo: un Caso-componente de macro no puede graduar tokens del macro

Los guards de tokens (`sin_utility_por_defecto`, `espaciado_del_sistema`) leen las
clases de los **atributos HTML `class="…"`**. La llamada al macro
(`"classes": "mt-base"`) es una **cadena de Nunjucks**, no un atributo: sus
utilidades son invisibles al guard hasta que el macro se expande, y el Caso-
componente gradúa el `src/` sin expandir (ADR-0006). Por eso la salida dorada del
patrón envuelve la llamada en HTML real (`<div class="mt-base mb-base">`) con el
espaciado del sistema: es ahí donde el Quality de tokens mide. Un Caso-componente
cuyo artefacto sea **sólo** una llamada al macro no tiene tokens que graduar; el
`sin_props_inventados` sí funciona (lee el literal de props).

### Hallazgo: la a11y sobre `<fieldset>` es del Caso de layout, no del patrón

El guard `fieldset_con_legend` busca el **tag** `<fieldset>` en el HTML. En un
Caso-componente con macro, ese tag no existe en el fuente (vive en el macro). Por
eso la a11y aplicable se mide en el Caso de **layout**, que escribe HTML
estructural (`<fieldset>`, `<label>`, grids): ahí `fieldset_con_legend` y
`labels_visibles` son hechos reales del artefacto.

### Assert nuevo: `estructura_grid`

«Valida la estructura de grid» no se podía expresar con los asserts existentes sin
anclar a literales de clase que envejecen (lo que el repo evita). Se añade un
hecho estructural (`src/caso.ts` + `src/grader.ts`): hay una rejilla —un elemento
con `grid`— que lleva `lg:grid-cols-<columnas>` **en ese mismo elemento**. Es la
regla de `desy-implement-layout-patterns` («Grid responsivo del formulario»: sólo
`lg:grid-cols-N`, no columnas fijas en mobile). Como en la fidelidad estructural,
el hecho se mira sobre su elemento, no «en cualquier parte»: un `lg:grid-cols-4`
suelto en un `div` que no es rejilla no cuenta. `columnas` ha de ser entero ≥ 2.

### El Quality de tokens (criterio 5)

`espaciado-del-sistema` (peso 2, `espaciado_del_sistema`) mide que el ritmo use la
escala canónica de DESY (`mt-base`, `gap-x-base`, `gap-sm`), no la numérica de
Tailwind ni valores arbitrarios. En ambos Casos un espaciado inventado lo suspende
y baja el Grade de EXCELENTE.

**Tensión conocida (no se oculta).** El bloque de código de
`desy-implement-layout-patterns` usa `gap-x-4` en su rejilla, pero
`desy-styles-reference` es explícita: la escala numérica de Tailwind no es la de
DESY y `gap-x-4` se corrige a `gap-x-base` (1rem, su equivalente). El harness toma
la referencia de tokens como autoridad, así que un SUT que copie `gap-x-4` literal
pierde el Quality: es una incoherencia del corpus de skills, y el Caso la mide en
el sentido que fija `desy-styles-reference`. La salida dorada usa `gap-x-base`, y
hay un test que muta a `gap-x-4` y comprueba que el Quality cae.

### Tests

`test/casos-bloque-b.test.ts`: aceptación de los dos Casos —la salida dorada da
EXCELENTE; HTML suelto en vez del macro, prop inventada, `fieldset` sin `legend`,
control sin `label`, rejilla no responsive y espaciado inventado dan INACEPTABLE o
bajan de EXCELENTE; `legend` visible y pérdida del texto de la política bajan de
EXCELENTE—. `test/grader.test.ts`: las funciones del assert `estructura_grid`
(responsive vs fija, columnas, mismo elemento). `test/caso.test.ts`: su parseo.

### Anclaje

- Macro y props: `desy-implement-component` → «`componentCheckboxes` /
  `componentRadios`». (El catálogo del Pin **no** lista `namePrefix` en
  `checkboxes`: el ejemplo del skill lo usa, pero inventarlo suspende el guard.)
- Fieldset+legend sr-only, grids y acciones: `desy-implement-layout-patterns`.
- a11y: `desy-validate-accessibility`; tokens: `desy-styles-reference`.


