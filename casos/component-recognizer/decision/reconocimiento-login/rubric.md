# Rúbrica — component-recognizer / reconocimiento-login

Un mockup de **login de webapp** (una franja fina con el logo, formulario, pie
institucional). Se evalúa que el SUT identifique los componentes correctos
**contra el catálogo**, no a ojo.

## Guards (su fallo ⇒ INACEPTABLE)

- **identifica-input-group**: los campos con label son `input-group`, no `input`
  suelto (es la confusión típica del skill: «input vs input-group»).
- **identifica-header-mini**: una franja fina con solo el logo es `header-mini`.
- **accion-primaria-es-button**: el control de envío es `button`.

## Quality

- **no-inventa-header-advanced** (peso 1): un login **no** es un portal de 3
  bandas; declarar `header-advanced` como decisión es erróneo. Es un Quality, no
  un Guard: el SUT puede *mencionar* `header-advanced` al descartarlo.
- **identifica-footer** (peso 1): el pie institucional con logos es `footer`.
- **accion-primaria-variante** (peso 2): la acción principal es la variante
  `primary`.

## Qué NO se mide

No hay HTML: el artefacto es la tabla de identificación del SUT. No se juzga el
wording exacto, sino los identificadores de dominio (componente y variante).
