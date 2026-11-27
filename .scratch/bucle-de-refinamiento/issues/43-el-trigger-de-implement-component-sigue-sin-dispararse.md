# 43: El trigger de `implement-component` sigue sin dispararse

**What to build:** que `implement-component` se invoque cuando toca. **No se
reabre la petición anterior**: se continúa.
[`peticion-trigger-implement-component.md`](../peticiones/peticion-trigger-implement-component.md)
se aplicó en el PR #36 y su propia declaración de cierre ya avisaba de que
**no cerraba el trigger** (2 Ejecuciones, 0 invocaciones en el árbol
`a2dfb98…`). Aquello quitó la incoherencia de idioma y el veto; el disparo
sigue fallando.

**Blocked by:** —

**Status:** ready-for-human

**Status depende de:** mergear la rama `improve/preflight-componente-suelto` en
`desy-skills` y re-pinear; la medida local ya supera el criterio.

- [x] Diagnosticar por qué no se dispara: leer la `description`, el prompt del
      Caso y las invocaciones de las Ejecuciones que no lo llamaron
- [x] Escribir una petición **nueva** (la anterior está aplicada; se enlaza, no se reabre):
      [`peticion-componente-suelto-en-preflight.md`](../peticiones/peticion-componente-suelto-en-preflight.md)
- [x] Medir con el Caso `implement-component/boton-primario`: intentos por
      entrega y hallazgos de trigger
- [x] Criterio de cierre: 3 entregas en 3 intentos, 0 hallazgos de trigger

## La evidencia

Dos suites sobre el pin `44c27a7`:

| Suite | Intentos | Entregas con el skill | Correctas | Hallazgos de trigger |
|---|---|---|---|---|
| 1 | 6 | 3 | 3 | 1 |
| 2 | 6 | 3 | 3 | 1 |

Seis intentos para tres entregas **en las dos**: el Caso aprueba, pero el skill
cuesta el doble de lo que debería. No es solo el trigger: de los 6 intentos, 2
terminaron sin Artefacto y 1 entregó sin invocar el skill. El Scorecard lo dice
en su cabecera («entrega correcta sin invocar el skill») y ADR-0007 lo excluye
del veredicto a propósito: no mide el skill.

Ojo con el alcance: **no es un rojo del Caso** (`boton-primario` es PASA). Es un
defecto del skill: el disparo sigue fallando. El diagnóstico de abajo muestra que
el fallo no está en la `description` de `desy-implement-component` sino en la ruta
que le da `desy-preflight-check`.

## Comments

### Diagnóstico (27/11/2026)

La evidencia **no permite culpar a la `description`** de
`desy-implement-component`: la Ejecución 2 ya había cargado
`desy-preflight-check` y aun así no la invocó. En las otras 5 sí se invocó, pero
el orden (preflight primero) no aísla si fue la descripción o el encadenado del
orquestador. Lo que sí muestra la Ejecución 2 es el hueco de ruta: el orquestador
no tenía una rama para el componente suelto.

- **Ejecución 2** (la única con hallazgo de trigger): `flujoObservado:
  ["preflight-check"]`, Grade EXCELENTE, entregó `src/boton-enviar-primario.html`
  y `src/pagina-boton-enviar.html`. Invocó solo `desy-preflight-check`; después
  leyó `package.json`, los `_examples` de `node_modules/desy-html` y escribió. No
  invocó `desy-choose-page-template` ni `desy-implement-component`.
- **Las otras 5** invocaron `desy-implement-component`.
- La tabla de `desy-preflight-check` se titula «para maquetar una página DESY»,
  manda `desy-choose-page-template` «Siempre» y delega el paso de implementación
  en la tabla del recognizer, que solo se invoca «si hay imagen». Para un botón
  sin imagen no hay fila que diga «componente suelto → `desy-implement-component`».
- **Dos Ejecuciones (3 y 5) no entregaron Artefacto** aunque sí invocaron el
  skill: el SUT contestó con el snippet en el chat. No son de trigger y no se
  arreglan con esta petición; el criterio de 3 entregas en 3 intentos las incluye
  y, si persisten, habrá que arreglar el estímulo del Caso (pedir el fichero,
  precedente del ticket 22).

Petición nueva:
[`peticion-componente-suelto-en-preflight.md`](../peticiones/peticion-componente-suelto-en-preflight.md),
dirigida a `desy-preflight-check` y no al frontmatter de
`desy-implement-component`.

No se cambia el informe ni el README en este ticket: siguen usando «hallazgo de
trigger (frontmatter)» como nombre genérico del hecho. Lo que este diagnóstico
corrige es la atribución a un frontmatter concreto; el hecho —una entrega
EXCELENTE sin el skill bajo test— sigue siendo el mismo.

### Medida 1 — la petición sola (27/11/2026)

Aplicada en `desy-skills`, rama `improve/preflight-componente-suelto`, commit
`b1a903e`. Medida con `--skills-local` y `--n 3`:

| Intentos | Entregas | Correctas | Sin artefacto | Hallazgos de trigger |
|---|---|---|---|---|
| 6 | 2 | 1 | 4 | 0 |

El trigger **queda a cero**: las 6 Ejecuciones invocaron
`desy-preflight-check` → `desy-implement-component`. Pero el criterio de 3
entregas en 3 intentos no se cumple: 4 Ejecuciones contestaron con el snippet en
el chat. Es el límite del estímulo del Caso, no de esta petición.

### Medida 2 — con el prompt que pide el fichero (27/11/2026)

El prompt del Caso ahora pide un fichero nuevo en `src/` y avisa de que lo que
quede en el chat no cuenta (precedente del ticket 22). Dos corridas consecutivas:

| Corrida | Intentos | Entregas | Correctas | Sin artefacto | Hallazgos de trigger |
|---|---|---|---|---|---|
| 1 | 3 | 3 | 3 | 0 | 0 |
| 2 | 3 | 3 | 3 | 0 | 0 |

Las dos dan **PASA** y cumplen el criterio: **3 entregas en 3 intentos, 0
hallazgos de trigger**. Árbol `c5dac62…`, el de la rama local. PASA sostenido:
sí. Queda el merge y el `bump-pin`.
