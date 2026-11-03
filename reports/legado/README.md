# Legado: la evidencia de antes de la regla nueva

Este directorio guarda la evidencia que se midió **antes** del ticket 01 del bucle de
refinamiento —el que cambió el Veredicto de un Caso para calcularlo sobre las **Entregas**
y declarar **INDETERMINADO** cuando ninguna entregó— (`GLOSSARY.md`, ADR-0014).

**No es una línea base y no entra en ningún diff.** `npm run diff-versiones` no lee este
directorio, a propósito: comparar un veredicto de entonces con una Versión de skills de
hoy es comparar dos medidas que no dicen lo mismo. Lo que sí se compara vive en
`reports/versiones/`, y su historia **arranca vacía** en la primera corrida con la regla
nueva.

## Qué hay

Cada corrida es un directorio nombrado por su fecha, con una cabecera `LEGADO.md` y una
cabecera al lado de cada fichero (`<fichero>.LEGADO.md`). La cabecera dice la regla con la
que se midió, el Pin que la corrida **declaró** y qué se puede leer de ese fichero.

- **`suite-2026-10-27/`** — la primera suite real (Pin `b523ca7`): su Scorecard y sus tres
  Ejecuciones, las tres `sin-artefacto`. Toda la evidencia de la corrida está aquí.
- **`estabilidad-2026-10-22/`** — el experimento de estabilidad v2: tres Ejecuciones, el
  resumen por Ejecución y la **fuente exacta** que reprodujo el HALLAZGO del artefacto
  (`ejecucion-1-fuente.txt`). Una de las tres entregó, y fue **EXCELENTE**.

Los ficheros se copiaron **byte a byte** con `npm run archivar-legado`; no se reescribieron
con la forma de hoy. No se archiva el artefacto HTML: es output del SUT y se regenera.

## Su SUSPENDE no significa lo que significa hoy

Es lo único que hay que saber antes de leer un fichero de aquí. **Las dos corridas se
midieron con la misma regla** —el ADR-0007; el experimento la lleva escrita en línea—, así
que la columna de la izquierda vale para las dos:

| | Entonces (lo que hay aquí) | Hoy (regla del ticket 01) |
|---|---|---|
| **Ninguna** Ejecución alcanzó el skill | INDETERMINADO | INDETERMINADO |
| Alcanzó el skill y **no entregó** | contaba como dato: **condenaba el Caso** | no cuenta: no hay nada que graduar |
| Alcanzó el skill y ninguna entregó | **SUSPENDE** | **INDETERMINADO** |
| Hubo entregas y ninguna fue correcta | SUSPENDE | SUSPENDE |

Es decir: un `SUSPENDE` de este archivo puede venir de Ejecuciones que **no entregaron
nada**, y con la regla de hoy ese mismo Caso aparecería como **INDETERMINADO**. Leerlo
como un juicio del skill es exactamente el error que este archivo existe para no repetir.

Qué pasó en cada corrida, con sus cuentas (la evidencia está en cada directorio):

- **27/10 — 0 entregas de 3.** Las tres Ejecuciones salieron `sin-artefacto`: ninguna
  entregó nada. El Caso salió **SUSPENDE**; con la regla de hoy sería **INDETERMINADO**.
  Es el rojo que abrió el bucle.
- **22/10 — 1 entrega de 3.** Esa única Ejecución, la 2, fue **EXCELENTE**. Un Caso con una
  Ejecución correcta entre las que alcanzaron el skill es **PASA** con la regla del
  ADR-0007, y también hoy. Lo que este directorio conserva de esa corrida no es un
  veredicto: es la **tasa de entrega** (1 de 3) y la fuente que reproduce el HALLAZGO.

## Por qué está fuera de `.gitignore` y fuera del diff

Las dos cosas a la vez, y son distintas:

- **Fuera del `.gitignore`.** `.gitignore` ignora `/reports/*` y reabre `versiones/` y
  `legado/`, una negación por línea (ver `CODING_STANDARDS.md`: una negación no puede
  reabrir un directorio ignorado como directorio). El archivo se versiona porque es
  evidencia que no cambia y que hay que poder leer sin correr nada.
- **Fuera del diff.** `npm run diff-versiones` sólo lee `reports/versiones/`, y ninguno de
  los ficheros de aquí declara `arbolHash`: ni pasados a mano se pueden tomar por un
  Scorecard de versión. Lo fija `test/legado-cli.test.ts`, con un legado adversario
  plantado también al lado de `versiones/`.

## Qué se conserva

El **porqué**, no el **qué**:

- los dos HALLAZGOS, en `.scratch/desy-skills-test-harness/issues/`
  (`HALLAZGO-guards-macro-artefacto.md`, `HALLAZGO-tokens-fichero-de-ejemplo.md`); sus
  diagnósticos **no** se copian aquí, lo que se copia es la evidencia de estas corridas;
- la tasa de entrega que se midió, que es lo que abrió los tickets 01 y 02 —y, según
  `spec.md` (Out of Scope, punto 8), el dato con el que tiene que medirse antes de reabrir
  el ticket 14 (nightly);
- el Pin declarado de cada corrida, con la marca de si se **comprobó** contra el árbol
  medido: antes del ticket 04, no.

Los veredictos viejos se conservan porque son la fuente de esos hechos, no porque sirvan
para comparar.

## Por qué no se metió en `reports/versiones/`

Porque el Scorecard de versión se **diffea** entre dos de ellos y se nombra por el
`arbolHash` (ADR-0016). Un fichero de antes del ticket 04 no tiene hash, y uno de antes
del 03 ni siquiera separa entregas de intentos: no es una versión, es un folio. Meterlo en
el directorio que se compara habría hecho que el primer diff de la historia mezclara dos
reglas.
