# Rúbrica — component-recognizer / reconocimiento-login

Un mockup de **login de webapp** (una franja fina con el logo, formulario, pie
institucional). Se evalúa que el SUT identifique los componentes correctos
**contra el catálogo**, no a ojo.

## Guards (su fallo ⇒ INACEPTABLE)

- **reconoce-input-group**: los campos con label son `input-group`, no `input`
  suelto (es la confusión típica del skill: «input vs input-group»). El
  componente ha de existir en `catalog.json`.
- **reconoce-header-mini**: una franja fina con solo el logo es `header-mini`.
- **reconoce-accion-primaria**: el control de envío es un `button` con la
  variante **primaria**. La variante se valida **contra el catálogo**, con la
  normalización español↔inglés del linter (`primario` ≡ `primary`), no por
  cadena literal.

## Quality

- **reconoce-footer** (peso 1): el pie institucional con logos es `footer`.
- **no-inventa-header-advanced** (peso 1): un login **no** es un portal de 3
  bandas; declarar `header-advanced` como decisión es erróneo. Es un Quality, no
  un Guard: el SUT puede *mencionar* `header-advanced` al descartarlo.

## Validación contra el catálogo

Los guards de reconocimiento no comparan cadenas escritas a mano: consultan
`assets/catalog.json` (la fuente de variantes válidas del skill). Un componente
inventado (que no existe en el catálogo) o una variante no documentada para ese
componente suspendes. La fila del componente se lee de la tabla de identificación,
así que una variante válida asignada a **otro** componente no cuela.

## Qué NO se mide

No hay HTML: el artefacto es la tabla de identificación del SUT. No se juzga el
wording exacto, sino los hechos de reconocimiento (componente y variante) contra
el catálogo.
