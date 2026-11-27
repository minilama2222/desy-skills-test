# Que `desy-preflight-check` dé al componente suelto su propia ruta

**Fichero destino:** `skills/desy-preflight-check/SKILL.md` (ruta dentro de `desy-skills`)

**Origen:** Caso `implement-component/boton-primario`, árbol `a0b29172eeb8…`, Ejecución 2 de `reports/suite/ejecuciones/implement-component/boton-primario/2.json`. Es un hallazgo de trigger: no hay un Check que falle.

**Estado:** aplicada en la rama `improve/preflight-componente-suelto` (commit `b1a903e`); medida del 27/11 **no supera** el criterio, no se cierra.

---

## 1. El cambio, en una frase

Que `desy-preflight-check` tenga una rama explícita para el **componente suelto**
—`preflight-check` → `desy-implement-component`— y que deje de mandar
`desy-choose-page-template` cuando la tarea no pide una página.
`desy-validate-accessibility` sigue siendo el cierre de siempre, no un eslabón
nuevo de esta rama.

## 2. Por qué (evidencia)

El fallo **no se puede atribuir a la `description` de `desy-implement-component`**:
la Ejecución 2 ya había cargado `desy-preflight-check` y aun así no la invocó. En
las otras 5 sí se invocó, pero el orden (preflight primero) no permite aislar si
fue la descripción o el encadenado del orquestador. Lo que sí muestra la
Ejecución 2 es el hueco de ruta.

Suite del 26/11/2026 sobre el pin `44c27a7` (árbol `a0b29172…`):

| Intentos | Entregas con el skill | Correctas | Sin artefacto | Hallazgos de trigger |
|---|---|---|---|---|
| 6 | 3 | 3 | 2 | 1 |

«Entregas con el skill» es `entregas` del Scorecard: con Artefacto **y** habiendo
alcanzado el skill. La Ejecución 2 también escribió Artefacto, pero no cuenta
como entrega porque no midió el skill: es el hallazgo de trigger.

- **Ejecución 2** — `flujoObservado: ["preflight-check"]`; entregó
  `src/boton-enviar-primario.html` y `src/pagina-boton-enviar.html` con Grade
  EXCELENTE. Invocó **solo** `desy-preflight-check`; después leyó `package.json`,
  `node_modules/desy-html/src/templates/components/button/` y escribió. No invocó
  `desy-choose-page-template` ni `desy-implement-component`.
- **Las otras 5** invocaron `desy-implement-component`.

```
check:      hallazgo de trigger (entrega EXCELENTE sin `desy-implement-component`)
evidencia:  reports/suite/ejecuciones/implement-component/boton-primario/2.json
esperado:   que el orquestador cargue la skill de implementación antes de escribir
```

## 3. La sección que lo causa

En «Posición en el workflow DESY», la tabla se titula **«Secuencia obligatoria
para maquetar una página DESY»** y dice:

> | 2 | `desy-choose-page-template` | Siempre | La plantilla trae header, footer y el espacio superior del contenido |
> | 3 | `desy-implement-pattern`, `desy-implement-layout-patterns`, `desy-implement-component` | Según la tabla del recognizer: patrón, estructura (fieldset, grid, acciones) o componente suelto | Las reglas de fieldset, acciones de página, tamaños y anchos están ahí |

Y remata:

> Si NO hay imagen, empieza en el punto 2.

Para un botón sin imagen, la única instrucción explícita es **empezar por
`desy-choose-page-template`**, que no aplica; y la fila 3 remite a un recognizer
que solo se invoca «si hay imagen». No hay fila que diga «componente suelto →
`desy-implement-component`». El agente siguió la ruta más próxima que sí existía:
leer la librería y escribir.

La misma secuencia se repite en otros dos sitios del skill, y cambiar solo la
tabla no basta:

- «Paso 4: Encadena las skills con `Skill`» vuelve a decir «Si NO hay imagen,
  empieza en el punto 2».
- «Siguiente skill típica» vuelve a mandar a `desy-component-recognizer` si hay
  imagen y, si no, a la secuencia de la tabla.

Las tres apariciones tienen que decir lo mismo; si no, la que el agente lea
última puede volver a mandarlo a la página.

## 4. Restricciones

- Mantener `desy-choose-page-template` como paso obligatorio **solo cuando la
  tarea pide una página**; no se elimina de la tabla.
- Actualizar las **tres** apariciones de la secuencia (la tabla, el Paso 4 y
  «Siguiente skill típica») para que no se contradigan.
- No duplicar en `desy-preflight-check` el contenido de
  `desy-implement-component` (macros, props, tokens): la autoridad sigue siendo
  ese skill.
- No tocar `skills/desy-implement-component/SKILL.md` en esta petición: su
  `description` no es la causa.
- No tocar `assets/catalog.json` ni `references/`.
- No cambiar el prompt del Caso para que nombre el skill: eso mide el prompt.

## 5. Cómo se valida

- [ ] En `desy-skills-test`, sobre la rama del cambio:
      `npm run run -- --skill implement-component --case boton-primario --skills-local <ruta de desy-skills> --n 3`
- [ ] **PASA sostenido**: dos corridas consecutivas PASA, con las entregas
      contadas por separado.
- [ ] Además, el criterio del ticket 43: en cada una, **3 entregas en 3
      intentos** y **0 hallazgos de trigger**. Es más estricto que el PASA
      sostenido: un Caso puede pasar con una sola entrega correcta.
- [ ] Si no supera esto, el cambio no se mergea.

**Límite de esta petición.** De los 6 intentos de arriba, 2 (Ejecuciones 3 y 5)
terminaron sin Artefacto: el SUT contestó con el snippet en el chat. Eso no es
trigger —sí invocaron `desy-implement-component`— y esta petición no lo arregla.
Si siguen apareciendo, el criterio de 3 entregas en 3 intentos no se cumple
aunque el trigger quede a cero; el arreglo entonces es del estímulo del Caso
(pedir el fichero, como en el ticket 22), no de este skill.

## 6. Skills sugeridos para el agente

- `desy-preflight-check`
- `desy-implement-component`

## 7. Lo que no debe hacer

- No re-pinear `desy-skills-test`.
- No editar `vendor/desy-skills/`.
- No añadir evals ni documentación de `desy-skills-test` dentro de `desy-skills`.

## 8. Declaración de cierre (la rellena el agente que aplica)

**No se cierra.** Aplicado en `desy-skills`, rama
`improve/preflight-componente-suelto`, commit `b1a903e`.

Medido el 27/11/2026 con:

```
npm run run -- --skill implement-component --case boton-primario \
  --skills-local /Users/jesuscuadraes/sda/desy-skills-preflight-componente-suelto --n 3
```

→ árbol `c5dac62…`, **6 intentos · 2 entregas · 1 correcta · 4 sin artefacto ·
0 hallazgos de trigger**.

El trigger **sí** queda a cero: las 6 Ejecuciones invocaron
`desy-preflight-check` → `desy-implement-component`; ninguna entregó sin el
skill. Lo que no se cumple es el 3-en-3: 4 Ejecuciones contestaron con el
snippet en el chat y no escribieron fichero. Eso no lo arregla esta petición —el
skill devuelve código, no manda escribir— y es el límite del estímulo del Caso
anotado en §5. No se mergea hasta resolverlo.

Siguiente paso propuesto: el prompt del Caso pide el fichero y avisa de que lo
que quede en el chat no cuenta (precedente del ticket 22), y se repite la
medida.
