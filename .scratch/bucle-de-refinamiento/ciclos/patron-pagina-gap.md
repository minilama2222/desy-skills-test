# Ciclo: patron-pagina-gap

**Estado:** abierto — gate de fase 4 no superado (gap 3/5 con prosa genérica)
**Fase:** 4
**Base:** cce1633b4ba5dd37e25873deacc1555d21d7c11f8ba4ec525a2cf654cab7d380
**Skills en foco:** implement-layout-patterns
**Casos:** patron-pagina-paso-1-nombre-nif

## Agenda

| Caso | Qué falló | Cambio | Petición |
|---|---|---|---|
| implement-pattern/`patron-pagina-paso-1-nombre-nif` | Guard `fidelidad-gap` en 3 de 3 entregas: el SUT escribe `grid lg:grid-cols-4 gap-x-base` porque es el ejemplo literal del skill; el Gold oficial pide `grid-cols-2 lg:grid-cols-4 gap-lg` | El grid del formulario toma columnas de mobile y gap de la referencia, no de un ejemplo fijo | [peticion-grid-del-formulario-contra-el-gold.md](../peticiones/peticion-grid-del-formulario-contra-el-gold.md) |
| implement-pattern/`patron-pagina-paso-1-nombre-nif` (misma rama) | Guard `encadenado-canonico` en 2 de 3 entregas: el SUT valida a11y y **después** afina con `design-match`, así que entrega una página que nunca validó | La validación es sobre la versión final: si la página cambia después del checklist, se repite | [peticion-validar-la-version-final.md](../peticiones/peticion-validar-la-version-final.md) |

**Fase 1 cerrada (21/11/2026).** El orden canónico **está escrito**: nueve
menciones en `desy-preflight-check`, `desy-design-match` y
`desy-validate-accessibility`, todas coherentes. No es un hueco de contenido
sobre *cuál* es el orden. Lo que falta es una regla de **qué versión** se valida:
ningún sitio dice que hacer `design-match` después de validar invalida el
checklist. Se atribuye a esa falta, no al Check (mide el orden del glosario) ni
al Caso (el prompt no contradice el orden).

## Corridas

| Fecha | Versión | Caso | Entregas | Veredicto |
|---|---|---|---|---|
| 2026-11-21 01:19 | cce1633 | patron-pagina-paso-1-nombre-nif | 3 de 4 intentos | SUSPENDE (guards 8/9) |
| 2026-11-21 02:05 | local `477acb3` (gap + columnas) | patron-pagina-paso-1-nombre-nif | 4 de 4 intentos | INACEPTABLE: `fidelidad-gap` en 3 de 4; `encadenado-canonico` en 3 de 4 |
| 2026-11-21 02:45 | local `5675072` (+ intro en la rejilla) | patron-pagina-paso-1-nombre-nif | 3 de 3 intentos | INACEPTABLE: `fidelidad-gap` **verde en 3 de 3**; `encadenado-canonico` en 2 de 3 |
| 2026-11-27 | `44c27a` (`a0b2917`) | patron-pagina-paso-1-nombre-nif | 3 de 3 intentos | INACEPTABLE: `encadenado-canonico` en **3 de 3**, con el Gold-imagen recapturado desde la URL viva (ticket 22); la 3ª añade `un-solo-h1` y `fidelidad-gap` |

### Fase 1: qué invocó cada Ejecución del árbol `a0b29172`

| # | Últimos pasos | Grade | `encadenado-canonico` |
|---|---|---|---|
| 5 | … styles-reference → `validate-accessibility` → `design-match` | INACEPTABLE | ❌ |
| 6 | … styles-reference → `design-match` → `validate-accessibility` | EXCELENTE | ✅ |
| 7 | … styles-reference → `validate-accessibility` → `design-match` → opencode | INACEPTABLE | ❌ |

En las dos que fallan, el encadenado está entero **menos los dos últimos pasos**,
invertidos. Y en las dos, la página que se entrega no se validó después de la
última edición.

El guard recorre las invocaciones con avance codicioso: `validate →
design-match → validate` **pasaría**. No exige un ritual, exige que
`design-match` ocurra antes de la **última** validación. Es decir: ya mide
exactamente la regla que pide la petición nueva.

## Lectura de la fase 4 (gate: no pasa)

El cambio que pedía esta petición **funciona**: las tres entregas escriben
`grid grid-cols-2 lg:grid-cols-4 gap-lg` y `fidelidad-gap` queda verde. Antes,
3 de 3 escribían `gap-x-base`.

Pero el Caso no alcanza **PASA sostenido** por un rojo distinto, que la agenda
dejó fuera a propósito: en 2 de 3 Ejecuciones el agente invoca `design-match`
**después** de `validate-accessibility`, y el guard `encadenado-canonico` exige
el orden `implement-* → design-match → validate-accessibility`.

Conclusión: la petición no se cierra; el rojo que queda no es el que arregla.
Volver a la fase 1 con la rama puesta, con `encadenado-canonico` como único
punto de la agenda. Mezclarlo aquí impediría saber qué cambió el gap.

## Suites del pin canónico (21/11, 01:42 y 02:16)

Se lanzaron dos suites seguidas con el Pin de `vendor/` (sin la rama local), para
tener dos medidas del mismo árbol:

| Corrida | PASA | SUSPENDE | INDETERMINADO |
|---|---|---|---|
| 4 (01:42) | 8 | 6 | 0 |
| 5 (02:16) | 9 | 5 | 0 |

**PASA en las dos (8):** `choose-library`, `choose-page-template`,
`component-recognizer`, `design-match`, `implement-component`,
`implement-layout-patterns`, `implement-pattern/politicas-privacidad`,
`preflight-check/proyecto-ok-libreria-version`.

**Inestables entre las dos:** `token-espaciado` (PASA en la 5, SUSPENDE en la 4;
su rojo es el Guard que exige `p-base`) y `boton-primario-angular` (SUSPENDE en
las dos, pero PASA en la corrida 3: su Check lee `componentButton` dentro de un
comentario HTML del que explica la traducción).

**Rojos sostenidos (5):** `boton-primario-angular`, `patron-pagina`,
`proyecto-no-existe`, `no-scaffoldea-sin-permiso`, `checklist-sin-servidor`.

### Después de la limpieza del grader (tickets 32–38)

| Corrida | PASA | SUSPENDE | INDETERMINADO |
|---|---|---|---|
| 6 (07:51) | 12 | 2 | 0 |
| 7 (08:26) | 13 | 1 | 0 |

El único rojo es `patron-pagina`. Los cinco anteriores eran del harness y del
Caso, no del skill.

## Por qué este rojo es atribuible

- El SUT **pudo** leer el skill (sin `Permission denied` ni herramientas que
  falten): invocó `implement-layout-patterns` y copió su ejemplo.
- El Check **mide lo que dice medir**: es `fidelidad_estructural { hecho: "gap" }`
  contra el Gold-HTML del Caso, no una palabra.
- La causa es una contradicción del propio skill: su ejemplo canónico dice
  `gap-x-base` y «NO `gap-lg`», y el Gold oficial del Caso usa `gap-lg`.

## Gate de la fase 2

El humano encargó el ciclo completo («haz la 3 sin mi intervención») y se fue a
dormir: el gate de aprobación de la petición queda **delegado**. Se deja escrito
el borrador antes de aplicarlo (sección 2 de la petición) y se mide sin tocar
`vendor/`.

## Fase 4 del cambio de validación (gate: no pasa)

Medido el 21/11/2026 sobre `skill/patron-pagina-gap`, árbol `716501e4…` (grid +
la regla de «valida la versión final»), `--n 3 --tope 4`. Cuatro Ejecuciones:

| # | Últimos pasos del flujo | Grade | Fallo |
|---|---|---|---|
| 8 | `… → validate-accessibility` | INACEPTABLE | `encadenado-canonico`: `design-match` en el puesto 2, antes de `choose-page-template` |
| 9 | `… → design-match → validate-accessibility` | INACEPTABLE | `fieldset-con-legend`: dos `<fieldset role="group">` de `componentInputGroup` sin `legend` |
| 10 | `… → design-match → validate-accessibility` | EXCELENTE | — |
| 11 | `… → validate-accessibility → design-match` | INACEPTABLE | `encadenado-canonico`: la inversión que la petición ataca |

Una de cuatro. La frase nueva **no** impide la inversión: la 11 la comete con el
skill invocado (lo leyó). El `fidelidad-gap` sigue verde en las cuatro: el cambio
del grid, que era la primera mitad, se sostiene.

### Lo que la medida dice del rojo que queda

Con siete Ejecuciones del Caso entre las dos ramas (5–11), los fallos del
`encadenado-canonico` son cuatro y de **dos formas**: la inversión de los dos
últimos pasos (5, 7, 11) y el adelanto de `design-match` al principio (8). El
orden está escrito en nueve sitios y no hay contradicción en ninguno. La 9 falla
por otra cosa: `componentInputGroup` con `fieldset` y sin `legend`, y el ejemplo
canónico de `desy-implement-component` enseña a pasarlo.

Es decir: **los rojos que quedan no son de redacción**. Están escritos. Lo que
falla es que el SUT no los cumple de forma estable en una sesión larga. Añadir
prosa no es la palanca; por eso la petición de la versión final no se cierra y no
se mergea.

Queda abierto, para otro ciclo, decidir qué es: ¿el Caso exige una perfección de
conducta que un SUT estocástico no da (y entonces el «PASA sostenido» del Caso
mide otra cosa), o hay una forma de escribir el flujo que el agente no pueda
saltarse? Eso es una decisión, no una petición de redacción.

## La tasa real del Caso (21/11/2026, nueve Ejecuciones del árbol `a0b29172`)

Seis más, después de las 5–7, para no leer una moneda al aire:

| Guard | Verde |
|---|---|
| `fidelidad-gap` | 5 de 9 |
| `encadenado-canonico` | 4 de 9 |
| los dos a la vez (EXCELENTE) | **2 de 9** |

Antes de estos cambios, en el árbol base `cce1633`: 2 de 3 Ejecuciones copiaban
el ejemplo literal del grid (`gap-x-base`) y fallaban.

Esto cambia la lectura del ciclo y la de cualquier «PASA sostenido» futuro: el
Caso pasa por suerte más de lo que parecía. Un Caso con seis guards
independientes y un SUT estocástico da ~25 % de Ejecuciones perfectas, así que
una suite de tres entregas sale PASA algo más de la mitad de las veces **sin
que el skill haya cambiado**. Es el hallazgo que hay que tener delante al
interpretar el próximo Scorecard.

## El PR (21/11/2026)

[#38](https://github.com/minilama2222/desy-skills/pull/38), abierto y sin
mergear: **solo** los dos commits del grid (`193053a`, `366c1fc`). El cambio de
validación no viaja: la medida no lo sostiene.

El cuerpo del PR dice lo que la medida dice, incluido que no pone el Caso en
verde. Pendiente y humano: el merge, el `bump-pin` (pedido expresamente) y la
suite de regresión sobre el pin nuevo.

## Pendientes (26/11/2026)

Repartidos a su sitio: lo que es trabajo vive en un ticket, lo que es estado se
queda aquí. Ningún pendiente queda sólo en este fichero.

### Se queda en el ciclo

1. **El Caso ya tiene dos corridas PASA** (`reports/versiones/a0b29172….json`):
   `pasaSostenido` se cumple para los 14 Casos. Pero `patron-pagina` hizo **1 de
   3** en la segunda suite y `preflight/proyecto-no-existe` también 1 de 3. La
   regla dice «refinado»; la tasa dice otra cosa. Eso se decide en el 41.

### Tickets abiertos

- **41** — Grill-with-docs: cómo se demuestra que un skill es bueno (material
  literal, decisión de umbral y de tasa). `ready-for-human`.
- **42** — El orden canónico falla **5 de 9** sin causa de redacción:
  ¿el guard exige una perfección que un SUT estocástico no da, o el flujo puede
  hacerse ineludible? `ready-for-human`.
- **43** — El trigger de `implement-component` sigue sin dispararse: 6 intentos
  para 3 entregas en las dos suites. `ready-for-agent`.
- **44** — `patron-pagina` aprueba sin invocar `implement-pattern`: el Caso
  puede no estar midiendo su skill. `ready-for-human`.
- **harness 20** — Ningún comando lee `pasaSostenido`. `ready-for-agent`.
- **05, 15, 17** — siguen esperando una persona (ADR-0015, ADR-0018, el
  vigilante).

### Peticiones

- [`peticion-columna-de-mobile-del-grid.md`](../peticiones/peticion-columna-de-mobile-del-grid.md)
  — `propuesta`: 3 de los 4 fallos de `fidelidad-gap` son `grid-cols-1` u
  omitir la columna; el Gold pide `grid-cols-2`.
- [`peticion-validar-la-version-final.md`](../peticiones/peticion-validar-la-version-final.md)
  — **descartada con medida**; no reimplementar.

### Cerrado por la medida

- **`validate-accessibility` 1 de 3**: en la segunda suite dio **3 de 3**. Era
  varianza, no defecto. Sin ticket.

## La suite del 26/11: descartada

Lanzada por el mantenedor sobre el pin `44c27a7` y parada en el caso 9 de 14.

- 28 Ejecuciones escritas; **5 con `exit 143` y `infraestructura: tiempo`**,
  incluidas **las tres** de `patron-pagina`.
- Causa: el proveedor de inferencia saturado («Model is busy»); las Ejecuciones
  se aguantaban 20 minutos entre sí y el harness las mataba por reloj.
- Un run así mide al proveedor, no al skill. **Descartado**, no hay Scorecard
  nuevo.
- No deja residuos: `reports/suite/ejecuciones` se vacía al arrancar la suite,
  y `git status` quedó limpio.

Comprobado además que las trece Ejecuciones locales que sostienen la tasa del
Caso (5–17) **sí** son limpias: `exit 0` y sin `infraestructura`. La tasa 2 de 9
sigue en pie.

## La suite sobre el pin nuevo (26/11/2026)

Pin `44c27a7`, árbol `a0b29172`, **14 PASA · 0 SUSPENDE · 0 INDETERMINADO**, 47
Ejecuciones, **0 con `infraestructura`**: el proveedor aguantó y ninguna se cortó
por reloj. La cabecera imprime ya `Starter 37748bd (37748bde…)` (ticket 39).

Pero `PASA` es «acertó al menos una entrega»:

| Caso | Correctas / entregas |
|---|---|
| 9 Casos | 3/3 |
| `boton-primario-angular`, `component-recognizer`, `preflight/proyecto-no-existe`, `patron-pagina` | 2/3 |
| `validate-accessibility/checklist-sin-servidor` | **1/3** |

`checklist-sin-servidor` estaba **3/3 EXCELENTE** en la suite 7 y hoy es 1
EXCELENTE, 1 ACEPTABLE (`detecta-label-sin-for`) y 1 INACEPTABLE
(`detecta-fieldset-sin-legend`). Ese skill no ha cambiado: es varianza del SUT y
está a una mala racha de SUSPENDE.

### `patron-pagina`, intento a intento

| # | Grade | ¿Invocó el skill? | Fallo |
|---|---|---|---|
| 1 | EXCELENTE | sí | — |
| 2 | INACEPTABLE | no | `fidelidad-gap` |
| 3 | INACEPTABLE | sí | `encadenado-canonico` (validate → design) |
| 4 | EXCELENTE | **no** | — |
| 5 | EXCELENTE | sí | — |

La 4 **aprobó sin invocar `implement-pattern`**: mismo hallazgo de trigger que
`implement-component/boton-primario`, ahora en el Caso que lo tiene como skill
bajo test. No es un rojo; es una pregunta sobre el Caso.

Los dos fallos son los dos modos ya conocidos (gap y orden). Nada nuevo.

### PASA sostenido: no

`reports/versiones/a0b29172….json` tiene **1 corrida**. Hacen falta dos
consecutivas del mismo árbol, y `pasaSostenido` sigue sin lector: se comprueba a
mano sobre `corridas`.

## La segunda suite (26/11/2026)

Pin `44c27a7`, árbol `a0b29172`, **14 PASA · 0 SUSPENDE · 0 INDETERMINADO**, 46
Ejecuciones, **0 con `infraestructura`**. El proveedor aguantó y el run es
válido: ni una Ejecución cortada por reloj.

`reports/versiones/a0b29172….json` guarda ya **dos corridas consecutivas PASA**,
así que `pasaSostenido` se cumple para los 14 Casos.

### La letra pequeña, que es el hallazgo

| Caso | Corrida 1 | Corrida 2 |
|---|---|---|
| `patron-pagina` | 2/3 | **1/3** |
| `preflight/proyecto-no-existe` | 2/3 | **1/3** |
| `validate-accessibility/checklist-sin-servidor` | **1/3** | 3/3 |
| `scaffold-project/no-scaffoldea-sin-permiso` | 3/3 | 2/3 |

El mismo Caso que satisface «refinado» acertó una entrega de tres. Y
`validate-accessibility` osciló de 1/3 a 3/3 sin que su skill cambiara: aquel 1/3
era varianza, no defecto. Es la evidencia que abre el ticket 41.

`patron-pagina` volvió a entregar **EXCELENTE sin invocar el skill bajo test**
(2.ª Ejecución), igual que en la suite 1 (4.ª). De ahí el ticket 44.

## Reconciliación de estado (2026-11-27)

El estado de arriba se quedó atrás respecto al disco:

- El PR #38 (grid del formulario) **se mergeó** (`44c27a7`) y está en el pin
  `6058b74`. La petición del gap queda `aplicada`; no se declara PASA sostenido
  porque la columna de mobile sigue fallando.
- La petición de `encadenado-canonico`
  (`peticion-validar-la-version-final.md`) está **descartada con medida**: no se
  mergea. Ese rojo no es un cambio de skill pendiente.
- Lo que queda de `fidelidad-gap` es la **columna de mobile**
  (`peticion-columna-de-mobile-del-grid.md`, estado `propuesta`), con rama
  publicada `origin/improve/columna-mobile-grid`.

La suite del 27/11 con el pin actual (`7756428`, contenido de #38 + #39) da
PASA en el Caso, con `fidelidad-gap` rojo en parte de las entregas y
`encadenado-canonico` en otras. La agenda propuesta para el gate es una sola
línea: medir la rama `improve/columna-mobile-grid` y decidir si la petición
cierra el gap.

**Medido el 27/11 en dos pasos:** con la prosa que nombraba el Caso y su Gold,
gap 10/10 —pero era sobreajuste y se descartó—. Con la prosa genérica
(`3644f7e`, 5 entregas), gap **3/5**: dos fallos reales (`gap-base`,
`lg:grid-cols-5`) y dos falsos negativos del harness, corregidos (`a2787ce`,
`de8a117`). El gate **no se supera**: PR #40 abierto, sin PASA sostenido.
