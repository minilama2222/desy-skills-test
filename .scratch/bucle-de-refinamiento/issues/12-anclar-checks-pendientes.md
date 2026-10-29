# 12: Anclar cada Check de los 13 Casos pendientes a su sección del skill

**What to build:** Que los 13 Casos de `PENDIENTES_DE_ANCLAR` declaren, para **cada** Check, la sección de `desy-skills` de la que depende — para que el informe por Caso (ticket 06) pueda citarla en vez de decir «el Check no declara de qué sección depende».

**Blocked by:** 06

**Status:** ready-for-human

- [ ] `PENDIENTES_DE_ANCLAR` (`src/guardarrail-casos.ts`) queda **vacía**: los 13 Casos anclados
- [ ] Cada línea de ancla cita una sección **que existe** en el `SKILL.md` del skill (lo comprueba `npm run verificar-casos`)
- [ ] La sección elegida **dice lo que el Check mide** (no basta con que exista: ver «Cómo elegir la sección»)
- [ ] La prosa de apoyo de cada `## Anclaje en desy-skills` se conserva: el ancla se **suma**, no sustituye
- [ ] `npm test` y `npm run precommit` en verde, incluido el caso de «un pendiente que ya ancla sus Checks sobra»

## Por qué no es mecánico

El ticket 06 midió el hueco: de los 11 Casos con epígrafe `## Anclaje en desy-skills`,
diez lo escriben como **prosa de apoyo**, que dice en qué secciones del skill vive la
regla en general y **no** a qué Check corresponde cada una. (El tercero que falta,
`implement-component/boton-primario`, ya está anclado; y otros tres Casos no tienen
ni epígrafe.) Ejemplo real
(`implement-layout-patterns/…/rubric.md`):

```markdown
- Fieldset+legend sr-only y grids: `desy-implement-layout-patterns` →
  «Fieldset+legend sr-only para grupos semánticos» y «Grid responsivo del formulario»
```

Eso es prosa buena y **se queda**. Lo que falta es, además, una línea por Check:

```markdown
- estructura-grid: desy-implement-layout-patterns → «Grid responsivo del formulario»
```

Elegir esa sección exige leer el `SKILL.md` y decidir **qué** sección cubre ese Check
concreto. Inventarla hace que el informe cite una sección que no dice lo que el Check
mide — peor que no citar nada, porque entonces sí engaña.

## Los 13 Casos, con sus Checks

Datos de `casos/<skill>/<tipo>/<id>/expected/checks.json`. La columna «pista» es
la prosa de apoyo de la rúbrica: la sección suele salir de ahí, una vez separada
por Check. Tres Casos **no tienen ni epígrafe** `## Anclaje en desy-skills`: el
primer paso ahí es crear el epígrafe, no ampliarlo.

| Caso | Checks | Pista en la rúbrica |
|---|---|---|
| `angular-translator/componente/boton-primario-angular` | `usa-selector-desy-button`, `conserva-la-variante-primaria`, `traduce-el-binding-de-texto`, `no-deja-el-macro-nunjucks` | «Patrones generales de traducción», «Parámetros que están en AMBAS librerías» |
| `choose-library/decision/portal-turistico` | `libreria-desy-html`, `starter-correcto`, `cabecera-advanced` | **sin epígrafe de anclaje**: hay que crearlo |
| `choose-page-template/decision/404-portal-publico` | `familia-portal`, `cabecera-advanced`, `no-inventa-plantilla` | **sin epígrafe de anclaje**: hay que crearlo |
| `component-recognizer/decision/reconocimiento-login` | `reconoce-input-group`, `reconoce-header-mini`, `reconoce-accion-button`, `reconoce-accion-primaria`, `reconoce-footer`, `no-inventa-header-advanced` | **sin epígrafe de anclaje**: hay que crearlo |
| `design-match/decision/afinado-paso-1` | `reporta-la-fila-h1`, `reporta-la-fila-lead`, `marca-bloqueante-h1`, `marca-bloqueante-gap`, `no-usa-valor-arbitrario` | «Paso 3 — Mide y reporta discrepancias», «Paso 5 — Aplica el fix mínimo», «"Está suficientemente bien" con > 4px» |
| `implement-layout-patterns/componente/fieldset-grid-acciones` | `fieldset-con-legend`, `labels-visibles`, `estructura-grid`, `acciones-en-section`, `accion-transparente`, `espaciado-del-sistema` | «Fieldset+legend sr-only…», «Grid responsivo del formulario», «Acciones de página al final del form», «Spacing contextual» |
| `implement-pattern/componente/politicas-privacidad` | `usa-macro-checkboxes`, `sin-props-inventados`, `legend-sr-only`, `texto-politica`, `espaciado-del-sistema` | «Cómo pedimos información» → «Aceptar políticas de privacidad», «`componentCheckboxes` / `componentRadios`», «Patrón de un único checkbox (privacidad, términos)» |
| `implement-pattern/pagina/patron-pagina-paso-1-nombre-nif` | `encadenado-canonico`, `campo-nombre`, `campo-nif`, `checkbox-rgpd`, `accion-siguiente`, `accion-volver` | «Posición en el workflow DESY», «Checklist de salida», «Medidas canónicas», «Paso 3 — Mide y reporta discrepancias» |
| `preflight-check/decision/proyecto-no-existe` | `identifica-no-existe`, `bifurca-a-scaffold`, `no-arranca-implementacion` | «Paso 1: Detección de existencia del proyecto», «Paso 2: Si PROYECTO_NO_EXISTE → bifurcar al scaffold» |
| `preflight-check/decision/proyecto-ok-libreria-version` | `identifica-libreria`, `identifica-version`, `identifica-proyecto-ok` | «Paso 1: Detección de existencia del proyecto», «Paso 3: Si PROYECTO_OK → identificar contexto» |
| `scaffold-project/decision/no-scaffoldea-sin-permiso` | `no-scaffoldea-sin-permiso`, `pide-permiso`, `da-los-comandos-al-usuario` | el aviso «Para el agente (importante): … NO los ejecutes automáticamente» |
| `styles-reference/decision/token-espaciado` | `token-base-16px`, `token-lg-28px`, `explica-la-unidad-base`, `familia-gap-base` | «Espaciado (escala de tokens del proyecto)», «Prohíbe los valores arbitrarios» |
| `validate-accessibility/decision/checklist-sin-servidor` | `detecta-h1-de-mas`, `detecta-fieldset-sin-legend`, `detecta-label-sin-for`, `detecta-skip-link-ausente`, `no-inventa-un-pase` | «Checklist de grep» del skill |

## Cómo elegir la sección

Una sección es la respuesta correcta si **contiene la regla que el Check mide**, no
si su título se parece al id del Check. Tres preguntas, en orden:

1. **¿Esta sección dice qué hacer con este hecho?** `estructura-grid` mide «un
   elemento con `grid` y `lg:grid-cols-N` en el mismo elemento»; la respuesta está
   en «Grid responsivo del formulario», no en «Espaciado».
2. **¿Un lector que solo ve esa sección entendería el rojo?** Si necesita otra
   sección para saber qué se le pide, está mal elegida.
3. **Si no hay ninguna sección que lo cubra**, el Check probablemente mide algo que
   el skill **no dice**: eso es hallazgo de skill, no un ancla imposible. En ese
   caso, para y abre un `HALLAZGO-*`, como se hizo con
   `HALLAZGO-tokens-fichero-de-ejemplo.md`: el hueco es del skill.

Antes de dar una sección por buena, `npm run verificar-casos` confirma que el título
existe **literal** en el `SKILL.md` de `vendor/`; la comparación es exacta a
propósito (un título mal copiado citaría otra sección).

## Cómo cerrarlo

Los anclajes se hacen **al tocar cada skill**, no en una pasada, porque cada uno
exige leer su `SKILL.md` y decidir. Por cada Caso:

1. Escribe una línea `- <id>: <skill> → «<sección>»` por Check, **sin** tocar la
   prosa de apoyo.
2. `npm run verificar-casos` (título existente) y `npm run suite -- --skill <skill>
   --case <caso> --n 1`: el informe debe citar la sección en vez de «no declara».
3. Quita la ruta de `PENDIENTES_DE_ANCLAR`. El propio guardarraíl falla si se
   olvida («ya ancla sus N Check/s: quítalo de la lista»), así que la lista no puede
   quedarse desactualizada en silencio.

El ticket se cierra cuando la lista queda vacía; a partir de ahí, cualquier Caso
sin anclar es un rojo y la regla del ticket 06 se cumple entera.

## Notas

- **Por qué no lo hizo el 06.** El 06 declaró `done` con la regla y la deuda
  declarada, no con los 13 anclados: anclar exige juicio sobre qué sección cubre
  cada Check, y el 06 no debía inventarlas para poder marcar la casilla.
- **Por qué no lo lleva el 11.** El 11 es la documentación del bucle y está
  bloqueado por 10 tickets (`Blocked by: 01…10`): colgarle esto lo dejaría esperando
  a un trabajo que puede hacerse hoy.
- **Un Check del Framework** (`tokens-del-sistema`, `un-solo-h1`…) que el Caso
  documenta en su rúbrica pero **no** declara en su `checks.json` no entra en la
  regla `PENDIENTES_DE_ANCLAR`; y `verificar-casos` lo dice igualmente («el Check no
  declara de qué sección depende»): es un Check del Framework, que tampoco es del
  Caso. Si algún día se quiere anclar, es un campo del Framework, no de la rúbrica.
