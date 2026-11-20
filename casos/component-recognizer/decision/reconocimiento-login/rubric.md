# Rúbrica — component-recognizer / reconocimiento-login

Un mockup de **login de webapp** (una franja fina con el logo, formulario, pie
institucional). Se evalúa que el SUT identifique los componentes correctos
**contra el catálogo**, no a ojo.

## Guards (su fallo ⇒ INACEPTABLE)

El hecho no-negociable de la **tarea de reconocimiento** es el **componente**:
¿acertó qué componente es? La etiqueta de variante NO va en el guard (ver abajo).

- **reconoce-input-group**: los campos con label son `input-group`, no `input`
  suelto (es la confusión típica del skill: «input vs input-group»). El
  componente ha de existir en `catalog.json`.
- **reconoce-header-mini**: una franja fina con solo el logo es `header-mini`.
- **reconoce-accion-button**: el control de envío es un `button`.

## Quality

- **reconoce-accion-primaria** (peso 2): al `button` se le asigna la variante
  **primaria**. Es un Quality, no un Guard: el reconocimiento correcto es el
  componente, y la etiqueta de variante admite vocabulario propio del maquetador.
  Se valida **contra el catálogo** con la normalización español↔inglés del linter
  (`primario` ≡ `primary`); una variante creativa que no esté documentada pierde
  el Quality pero **no suspende** — el catálogo es de ejemplos representativos, no
  exhaustivos, y el linter del skill marca «no documentado» como `WARNING`
  (decisión humana), no como error.
- **reconoce-footer** (peso 1): el pie institucional con logos es `footer`.
- **no-inventa-header-advanced** (peso 1): un login **no** es un portal de 3
  bandas; **ponerlo como fila** de la tabla de identificación es erróneo. Se mira
  la tabla, no la prosa: el SUT puede *mencionar* `header-advanced` al
  descartarlo, y de hecho lo hace («es `header-mini`, NO `header` ni
  `header-advanced`»). Hasta el 20/11 el Check buscaba la palabra y tumbaba esa
  respuesta correcta (ticket 30).

## Validación contra el catálogo

Los checks de reconocimiento no comparan cadenas escritas a mano: consultan
`assets/catalog.json` (la fuente de variantes válidas del skill). Un componente
inventado (que no existe en el catálogo) suspende; una variante no documentada
para ese componente baja el Quality. La fila del componente se lee de la tabla de
identificación, así que una variante válida asignada a **otro** componente no cuela.

## Anclaje en `desy-skills`

Por cada Check, el skill y la sección de su `SKILL.md` donde vive la regla. El
informe por Caso cita esa sección **por título**, no por número de línea, y
`npm run verificar-casos` comprueba que el título existe en el `SKILL.md`.

- reconoce-input-group: desy-component-recognizer → «3. **"input" vs "input-group" vs "date-input" vs "datepicker"**»
- reconoce-header-mini: desy-component-recognizer → «5. **header vs header-mini vs header-advanced**»
- reconoce-accion-button: desy-component-recognizer → «11. **Acción subrayada = `button` transparente, no `link`**»
- reconoce-accion-primaria: desy-component-recognizer → «Linter de variantes (post-reconocimiento)»
- reconoce-footer: desy-component-recognizer → «Paso 4: Output en tabla»
- no-inventa-header-advanced: desy-component-recognizer → «5. **header vs header-mini vs header-advanced**»

Prosa de apoyo: las «Reglas críticas de matching» son el catálogo de
confusiones típicas —`input` vs `input-group` (regla 3), las tres cabeceras
(regla 5), el botón transparente (regla 11)—; el «Linter de variantes» es quien
valida `primario` ≡ `primary` contra el catálogo, y la tabla del «Paso 4» es
donde sale la fila del `footer`.

## Qué NO se mide

No hay HTML: el artefacto es la tabla de identificación del SUT. No se juzga el
wording exacto, sino los hechos de reconocimiento (componente, y variante como
matiz) contra el catálogo.
