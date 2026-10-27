# Hallazgo: `tokens-del-sistema` hunde una entrega correcta por el fichero de ejemplo del starter

Ejecutando la suite real por primera vez (ticket 13, `npm run suite`), el Caso
`implement-component/boton-primario` sale **SUSPENDE** con el artefacto bien
resuelto. El único Check en rojo es `tokens-del-sistema`, un Guard, y su causa no
está en la respuesta del SUT sino en la **plantilla de ejemplo del starter** que
el SUT editó.

**Estado: el falso negativo está RESUELTO** (ver «Resolución»). Lo que queda
abierto es una decisión de expectativa del skill, no un bug de este repo.

## Evidencia

`npm run suite -- --skill implement-component --case boton-primario --n 1` →
PASA / EXCELENTE (1 Ejecución).

`npm run suite -- --skill implement-component --case boton-primario --n 3` →
**SUSPENDE**, `guards 3/4`, `entregó mal 1`, `no entregó 1`.

La Evidencia (`reports/suite/ejecuciones/implement-component/boton-primario/2.json`):

```
entrega: con-artefacto
flujo:   preflight-check → implement-component
artefacto: src/pagina-prueba-EDITA-PARA-EMPEZAR.html
detalle:
  tokens-del-sistema     [guard]   FALLA
  usa-macro-boton        [guard]   OK
  variante-primaria      [guard]   OK
  sin-props-inventados   [guard]   OK
  tamano-base            [quality] OK
  tamano-base-no-grande  [quality] OK
```

**El SUT hizo el botón correcto** (`componentButton` con `c-button--primary`,
`type: submit`, `preventDoubleClick`, props del catálogo). Lo único que falla es
el Guard de tokens, y mira el **fichero entero** del starter, donde vienen de
fábrica (ajenas al SUT):

```html
class=" font-bold "                                  {# ejemplo comentado #}
class=" w-48 p-2 "
class=" border-4 border-dashed border-gray-200 rounded-lg h-40 "
```

Todas estas utilidades están dentro de comentarios Nunjucks o del `caller` de un
componente de prueba del propio starter.

## Por qué pasa el runner

`listarArtefactosDeSalida` (ADR-0006) devuelve el fichero entero cuando difiere
de la línea base. El SUT **no creó** un fichero nuevo: **modificó** el ejemplo
`src/pagina-prueba-EDITA-PARA-EMPEZAR.html`, que ya existía. Como su contenido
cambió, entra como artefacto completo, y `tokens-del-sistema` evalúa también el
boilerplate que el starter puso en él.

Es el **mismo género que el ADR-0006** (el Guard lee un artefacto que incluye
material que no es del SUT), pero por otra puerta: antes era "fuente vs
compilado"; ahora es "el fichero del starter que el SUT tocó".

## Dos preguntas separadas que esto mezcla

1. **¿Es aceptable editar el fichero de ejemplo?** El fichero se llama
   literalmente "edita para empezar". El prompt pide "genera un botón", no
   dónde. Es defendible que el SUT lo use. Pero un harness que gradea el fichero
   entero convierte "dónde escribió" en un fallo de contrato, y no lo es.
2. **¿El Guard de tokens debe mirar el fichero entero?** Hoy sí. En un Caso
   cuyo artefacto es una **modificación** de un fichero pre-existente, el Guard
   no puede distinguir "lo que traía el starter" de "lo que añadió el SUT".

## Decisión (27/10): editar la página de prueba se acepta; copiarla es lo deseable

- **No es grave que el SUT edite `pagina-prueba-EDITA-PARA-EMPEZAR.html`.** El
  propio nombre del fichero invita a ello y el prompt no dice dónde escribir. El
  harness lo **acepta** y no lo penaliza: convertir "dónde escribió" en un fallo
  sería juzgar algo que no está en el contrato.
- **Lo deseable, como expectativa del skill** (no de este repo): `desy-implement-*`
  debería indicar que se **copia** la página de prueba a un fichero propio en vez
  de editar el de ejemplo, para no mezclar el output del usuario con el andamio
  del starter.
- **Si algún día se quisiera graduar**, tendría que ser un **Quality** (nunca un
  Guard), con un assert estructural —«existe un `src/*.html` nuevo distinto del
  de ejemplo»—, no de vocabulario. Hoy no se implementa: no hay evidencia de que
  escribir ahí haga daño, y el falso negativo que sí importaba (el boilerplate
  comentado) ya está cerrado.

## Resolución (27/10): el grader ignoraba los comentarios Nunjucks

Diagnóstico con bucle determinista (`scripts/repro-tokens-fichero-starter.ts`:
replaya el artefacto real por el grader, ~1 s, sin modelo).

Minimización sobre el artefacto real:

| Variante | Resultado |
|---|---|
| A. Original del SUT | **ROJO** |
| B. Sin comentarios `{# … #}` | verde |
| C. Solo `<div class="w-48">` | verde |
| D. `w-48` dentro de comentario | verde |
| E. Solo el botón | verde |

Hipótesis que ganó: **`clasesDe` no saltaba los comentarios Nunjucks**. La que
descarté («el Guard ve el fichero pre-existente entero») quedó falsada: el nombre
del fichero no cambiaba el veredicto. La instrumentación confirmó las culpables
reales: `p-2` y `border-gray-200`, ambas dentro del bloque comentado del starter
(que trae un componente de prueba completo, comentado).

**Arreglo**: `sinComentariosNunjucks()` en `src/grader.ts`, aplicado en
`clasesDe` (donde se leen clases), **no** en los guards de estructura, que
trabajan sobre HTML ya renderizado.

- Regresión en `test/grader.test.ts` («el Guard de tokens ignora el material
  comentado»): 3 casos; control de que una utilidad **fuera** de comentario sigue
  contando.
- El artefacto real pasa de **INACEPTABLE a EXCELENTE**.
- `scripts/verificar-tokens-no-es-colador.ts` comprueba que el arreglo no abre un
  colador (un `p-2` real sigue suspendiendo).

**Nota de proceso**: una variante intermedia (`w-48` desnudo) salía verde y casi
hizo descartar el hallazgo; el predicado no marca `w-*`/`h-*`, solo `p-*` y
colores. Un dato accidentalmente positivo.

## Dato de estabilidad (para el grilling de 14)

En la misma corrida de N=3:

- `Ejecución 1`: llega al skill, **no entrega** (`sin-artefacto`).
- `Ejecución 2`: entrega, correcta salvo la contaminación del starter.
- `Ejecución 3`: **no alcanza el skill** (`flujo`: solo `preflight-check`).

Es decir, **1 de 3 ni arranca** y **1 de 3 no entrega**. Con esa tasa, una capa
nightly de comparación pixel (ticket 14) mediría tanto ruido del agente como del
skill. La prioridad es cerrar este falso negativo y anotar la tasa de arranque.

### Corrida de verificación tras el arreglo (27/10)

Aplicado el fix, `--n 3` contra el SUT real sigue en **SUSPENDE**, pero ya por el
motivo correcto:

| # | Alcanzó el skill | Entrega | Grade |
|---|---|---|---|
| 1 | sí | **no entregó** | INACEPTABLE |
| 2 | sí | **no entregó** | INACEPTABLE |
| 3 | **no** (solo `preflight-check`) | entregó | **EXCELENTE** |

- La Ejecución 2 del caso anterior, que era el falso negativo, ahora **gradúa
  bien** (la 3 de esta corrida es su equivalente: entrega correcta, EXCELENTE).
- El SUSPENDE que queda es **«no entregó» 2 de 3**, no un juicio de los Checks.
- La 3 editó `pagina-prueba-EDITA-PARA-EMPEZAR.html` **sin invocar
  `implement-component`**: el agente escribió el fichero por su cuenta, sin pasar
  por el skill. `flujoAlcanzoSkill: false` la excluye del veredicto (ADR-0007),
  que es la política correcta — pero significa que **la única entrega buena no
  mide el skill**.

Esto refuerza que el problema de fondo no es el grading sino **la tasa de
arranque y entrega del SUT**, y es el dato que debe abrir el grilling de 14.

## Cómo reproducir

```powershell
npm run suite -- --skill implement-component --case boton-primario --n 3
```

Y leer `reports/suite/ejecuciones/implement-component/boton-primario/*.json`.
