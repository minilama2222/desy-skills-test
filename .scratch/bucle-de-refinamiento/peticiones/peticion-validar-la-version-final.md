# Que la validación de accesibilidad sea sobre la página que se entrega

**Fichero destino:** `skills/desy-validate-accessibility/SKILL.md` (ruta dentro de `desy-skills`)

**Origen:** Caso `implement-pattern/patron-pagina-paso-1-nombre-nif`, guard
`encadenado-canonico`, Ejecuciones 5, 6 y 7 del árbol local `a0b29172…`
(21/11/2026)

**Estado:** propuesta

---

## 1. El cambio, en una frase

Que `desy-validate-accessibility` diga que **la validación vale sobre la última
versión de la página**: si después del checklist se vuelve a tocar (y
`desy-design-match` toca), el checklist se repite sobre el HTML final.

## 2. Por qué (evidencia)

**El orden no está mal escrito.** Se dice en nueve sitios, sin una sola
contradicción:

- `desy-preflight-check` → «Posición en el workflow DESY» (filas 4 y 5),
  «Paso 4: Encadena las skills» y «Paso 5: Checklist de salida».
- `desy-design-match` → «Cuándo usarla» (línea *Cargar*), «Posición en el
  workflow DESY» y «Siguiente skill típica».
- `desy-validate-accessibility` → *Cargar*, «Posición en el workflow DESY» y
  «Related».

Lo que **no** dice ningún sitio es qué hacer cuando el agente ya validó y
después afina. No hay ninguna regla de «si cambias la página, vuelve a pasar el
checklist».

Las tres Ejecuciones del árbol `a0b29172…` (la rama con el grid arreglado):

| # | Flujo observado | Grade | `encadenado-canonico` |
|---|---|---|---|
| 5 | preflight → choose-page-template → component-recognizer → implement-layout-patterns → implement-pattern → implement-component → styles-reference → **validate-accessibility → design-match** | INACEPTABLE | ❌ |
| 6 | preflight → component-recognizer → choose-page-template → implement-layout-patterns → implement-pattern → implement-component → styles-reference → **design-match → validate-accessibility** | EXCELENTE | ✅ |
| 7 | preflight → component-recognizer → choose-page-template → implement-layout-patterns → implement-pattern → implement-component → styles-reference → **validate-accessibility → design-match → opencode** | INACEPTABLE | ❌ |

En las dos que fallan, el único defecto de orden son **los dos últimos pasos**:
todo lo demás del encadenado está. Y en las dos, **la página que se entrega no
se validó nunca después de la última edición**.

El guard no pide un ritual: recorre las invocaciones con avance codicioso, así
que `validate → design-match → validate` **pasaría**. Lo que exige es que
`design-match` ocurra antes de la **última** validación. Es decir: el guard ya
está midiendo exactamente lo que esta petición pide escribir.

**Por qué el agente se equivoca.** El orden se aprende en `desy-preflight-check`,
al principio del flujo, y no se vuelve a leer en el punto de transición. Ahí
compiten dos disparadores con la misma promesa («antes de darla por terminada»):

- `desy-validate-accessibility`: «Úsala SIEMPRE **al terminar de maquetar**» —
  disparador temporal, apunta al instante en que el agente acaba de implementar.
- `desy-design-match`: «siempre que haya imagen… aunque la página parezca bien»
  — disparador condicional.

Y el prompt del Caso cierra con «**Al terminar, valida la accesibilidad**». Con
eso, validar primero es una lectura defendible; lo indefendible es **entregar sin
volver a validar** la versión afinada.

**Lo que esto NO es.** No es un hueco del Check (mide el orden del glosario y el
Caso lo declara como razón de ser del Slice 2), ni del Caso (el prompt no
contradice el orden: `validate` sigue siendo el último paso). Es una regla de QA
que falta en el punto de transición.

**Muestra pequeña, y se dice:** 2 de 3. Una Ejecución más cambia el titular; por
eso la validación de esta petición pide una segunda corrida.

## 3. La sección que lo causa

En `desy-validate-accessibility`, «Cuándo usarla» (la línea *Cargar*) y
«Posición en el workflow DESY». Texto propuesto, añadido tal cual a las dos
secciones:

> **La validación es sobre la página que se entrega.** Si después de pasar el
> checklist vuelves a tocar la página —aunque sea `desy-design-match` afinando
> espacios, tipografía o márgenes—, el checklist se repite sobre el HTML final:
> un cambio posterior invalida la validación anterior.

Y una casilla más en el checklist de salida de `desy-preflight-check`, que es
donde el agente sí mira el orden:

> - [ ] La última validación de accesibilidad es **posterior** a la última
>   invocación de `desy-design-match`.

## 4. Restricciones

- No se cambia el orden canónico: ya está escrito y es correcto. Se añade **qué
  versión** se valida, no **cuándo**.
- No se toca el Check `encadenado-canonico` ni el Caso: el guard mide lo que el
  glosario define.
- No se toca el trigger de `desy-design-match` («siempre que haya imagen»): el
  problema no es que no se dispare, es que se dispara tarde.
- La regla no obliga a revalidar por cualquier cosa: sólo si la página cambió
  después del checklist.
- No se duplica la tabla de la secuencia en un tercer skill: se referencia.

## 5. Cómo se valida

- [ ] En `desy-skills-test`, sobre la rama del cambio:
      `npm run run -- --skill implement-pattern --case patron-pagina-paso-1-nombre-nif --skills-local <ruta del checkout> --n 3 --tope 4`
- [ ] **PASA sostenido**: dos corridas consecutivas PASA, con
      `encadenado-canonico` verde en todas las entregas.
- [ ] Sin regresión en `validate-accessibility/checklist-sin-servidor` (el Caso
      que mide ese skill) ni en `implement-layout-patterns/fieldset-grid-acciones`.
- [ ] Se mide **junto** con el cambio del grid ([petición del
      grid](peticion-grid-del-formulario-contra-el-gold.md)), porque la rama ya
      lo lleva: las dos mitades del rojo se juzgan sobre la misma medida.

## 6. Skills sugeridos para el agente

- `desy-validate-accessibility` (es el fichero que cambia)
- `desy-preflight-check` (la casilla del checklist de salida)

## 7. Lo que no debe hacer

- No re-pinear `desy-skills-test`.
- No editar `vendor/desy-skills/`.
- No cambiar el Caso (`prompt.md`, `checks.json`, `rubric.md`) para que el orden
  se cumpla: eso sería mover la verdad al estímulo.
- No convertir la regla en «invoca `desy-design-match` siempre»: en una página
  sin imagen de referencia no hay nada que afinar.

## 8. Declaración de cierre (la rellena el agente que aplica)

**No se cierra.** Medido el 21/11/2026 sobre la rama local
`skill/patron-pagina-gap`, árbol `716501e4…` (el del grid **más** esta regla),
`--n 3 --tope 4`. El harness hizo cuatro Ejecuciones:

| # | Últimos pasos del flujo | Grade | Fallo |
|---|---|---|---|
| 8 | `… → validate-accessibility` | INACEPTABLE | `encadenado-canonico`: `design-match` en el puesto 2, antes de `choose-page-template` |
| 9 | `… → design-match → validate-accessibility` | INACEPTABLE | `fieldset-con-legend`: dos `<fieldset role="group">` de `componentInputGroup` sin `legend` |
| 10 | `… → design-match → validate-accessibility` | EXCELENTE | — |
| 11 | `… → validate-accessibility → design-match` | INACEPTABLE | `encadenado-canonico`: **la inversión que esta petición ataca** |

Una de cuatro. Y el modo que la petición ataca **reaparece** en la 11: el SUT
invocó `design-match` después de `validate-accessibility` teniendo la frase
nueva delante (la leyó: invocó el skill). La frase no cambia la conducta.

Conclusión: el cambio **no se justifica con la medida**. No se mergea. Si estos
rojos fueran varianza, añadir prosa no es lo que la corrige; si no lo fueran,
tampoco: el orden ya estaba escrito en nueve sitios antes de esta frase.

La 9 no la causa este cambio: el SUT usó `componentInputGroup` con `fieldset`
pero sin `legend`, y el ejemplo canónico de `desy-implement-component` enseña a
pasarlo (`"fieldset": { "legend": { "text": … } }`).

