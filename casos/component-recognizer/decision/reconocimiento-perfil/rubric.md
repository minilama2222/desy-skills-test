# Rúbrica — component-recognizer / reconocimiento-perfil

El mockup es la página oficial
[`patron-pagina-perfil-de-usuario.html`](https://desy.aragon.es/patron-pagina-perfil-de-usuario.html),
capturada a 1280 px con su `css/styles.css` aplicado. Se evalúa que el SUT
identifique los componentes correctos **contra el catálogo**, no a ojo.

## Guards (su fallo ⇒ INACEPTABLE)

El hecho no-negociable de la **tarea de reconocimiento** es el **componente**:
¿acertó qué componente es? La etiqueta de variante NO va en el guard.

- **reconoce-header**: la cabecera de webapp con logo, nombre de app y navegación
  es un `header`. El componente ha de existir en `catalog.json`.
- **reconoce-input**: los campos de texto sueltos con label son `input`, no
  `input-group` ni otro contenedor. El componente ha de existir en `catalog.json`.
- **reconoce-select**: los tres desplegables (tipo de vía, provincia, municipio)
  son `select`. El componente ha de existir en `catalog.json`.
- **reconoce-accion-button**: las acciones «Guardar», «Volver» y «Cancelar» son
  `button`, no `link`. El componente ha de existir en `catalog.json`.

## Quality

- **reconoce-accion-primaria** (peso 2): al botón «Guardar» se le asigna la
  variante **primaria**. Se valida contra el catálogo con la normalización
  español↔inglés del linter (`primario` ≡ `primary`); una variante creativa que
  no esté documentada pierde el Quality pero **no suspende**, porque el catálogo
  es de ejemplos representativos, no exhaustivos.
- **reconoce-accion-transparente** (peso 1): los botones «Volver» y «Cancelar»
  son `button` con la variante **transparente**, no enlaces. Misma tolerancia de
  vocabulario que la variante primaria.
- **reconoce-footer** (peso 1): el pie institucional con enlaces y logos es
  `footer`.
- **no-inventa-header-advanced** (peso 1): la página tiene una sola banda de
  cabecera; poner un `header-advanced` de tres bandas **como fila** de la tabla
  es erróneo. Se mira la tabla, no la prosa: mencionarlo para descartarlo no
  pierde el Check.
- **no-inventa-header-mini** (peso 1): la cabecera tiene navegación y nombre de
  app, así que no es la franja mínima `header-mini`. Se mira la tabla, no la
  prosa.
- **reconoce-input-group** (peso 2): la fila «Tipo de vía» + «Vía» es un
  `input-group`: un `select` y un `input` que se leen como una unidad semántica
  en la misma línea. Una fila de campos independientes (Número / Escalera /
  Piso / Puerta) no lo es; esos siguen siendo `input` atómicos.

## Validación contra el catálogo

Los checks de reconocimiento consultan `assets/catalog.json` (la fuente de
variantes válidas del skill). Un componente inventado suspende; una variante no
documentada para ese componente baja el Quality. La fila del componente se lee
de la tabla de identificación, así que una variante válida asignada a **otro**
componente no cuela.

## Anclaje en desy-skills

Por cada Check, el skill y la sección de su `SKILL.md` donde vive la regla. El
informe por Caso cita esa sección **por título**, no por número de línea, y
`npm run verificar-casos` comprueba que el título existe en el `SKILL.md`.

- reconoce-header: desy-component-recognizer → «5. **header vs header-mini vs header-advanced**»
- reconoce-input: desy-component-recognizer → «3. **"input" vs "input-group" vs "date-input" vs "datepicker"**»
- reconoce-select: desy-component-recognizer → «8. **Ejemplos visualmente similares ≠ mismo componente**»
- reconoce-accion-button: desy-component-recognizer → «11. **Acción subrayada = `button` transparente, no `link`**»
- reconoce-accion-primaria: desy-component-recognizer → «Linter de variantes (post-reconocimiento)»
- reconoce-accion-transparente: desy-component-recognizer → «11. **Acción subrayada = `button` transparente, no `link`**»
- reconoce-footer: desy-component-recognizer → «Paso 4: Output en tabla» — no hay regla específica de `footer`; el catálogo es la fuente y la tabla es donde se declara
- no-inventa-header-advanced: desy-component-recognizer → «5. **header vs header-mini vs header-advanced**»
- no-inventa-header-mini: desy-component-recognizer → «5. **header vs header-mini vs header-advanced**»
- reconoce-input-group: desy-component-recognizer → «3. **"input" vs "input-group" vs "date-input" vs "datepicker"**»

Prosa de apoyo: desy-component-recognizer → «Paso 3: Matching con el catálogo»,
que es donde se contrasta cada bloque con el catálogo; las «Reglas críticas de
matching» son el catálogo de confusiones
típicas —`input` frente a `input-group` (regla 3), las cabeceras (regla 5), el
botón transparente (regla 11)—; el «Linter de variantes» valida
`primario` ≡ `primary` y `transparente` ≡ `transparent` contra el catálogo; y la
tabla del «Paso 4» es donde sale la fila del `footer`.

## Qué NO se mide

No hay HTML: el artefacto es la tabla de identificación del SUT. No se juzga el
wording exacto, sino los hechos de reconocimiento (componente, y variante como
matiz) contra el catálogo.
