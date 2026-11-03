# 10: Archivo de legado fuera del mecanismo de comparación

**What to build:** Conservar la evidencia anterior a la regla nueva en `reports/legado/`, con la regla de medición declarada en la cabecera, y sin que entre nunca en un diff.

**Blocked by:** 05, 09

**Status:** done

- [x] `reports/legado/` con los ficheros previos (`reports/suite/scorecard.*`, `reports/estabilidad-v2/*`, las notas del 27/10 que se quieran conservar)
- [x] Cada fichero lleva en cabecera con qué regla se midió
- [x] `diff-versiones` no lo lee; un test lo comprueba
- [x] El README de `reports/legado/` explica qué es y que su SUSPENDE no significa lo que significa hoy

## Política

Se conserva el **porqué** (los dos HALLAZGOS, la tasa de entrega medida), no el **qué** (los veredictos viejos). El diff arranca vacío en la primera corrida con la regla nueva.

## Notas de implementación

- **Dos corridas, dos hechos distintos.** `suite-2026-10-27/` (0 entregas de 3, la
  primera suite real) y `estabilidad-2026-10-22/` (1 entrega de 3, y esa entrega fue
  `EXCELENTE`: es lo que reprodujo el HALLAZGO del artefacto). Las dos se midieron con la
  **misma regla** —el ADR-0007, que el experimento lleva escrito en línea
  (`scripts/experimento-estabilidad.ts:118`)—, y eso es un dato, no un descuido: el bucle
  no nace de dos reglas distintas, sino de una que no separaba «no entregó» de «entregó
  mal». Por eso la cabecera de cada una dice qué se puede leer de **su** SUSPENDE: en el
  27/10 hay uno (hoy sería INDETERMINADO); en el 22/10 no, porque la Ejecución que entregó
  acertó, y lo que queda es la tasa de entrega.
- **Se copia, no se reescribe.** `src/legado.ts` (puro) decide la **cabecera**
  —origen, folio, fecha, Pin, regla— y `npm run archivar-legado`
  (`scripts/archivar-legado.ts`) copia los ficheros byte a byte. Verificado con SHA-256
  contra el árbol de antes de moverlo: 10 de 10 idénticos.
- **La cabecera de cada fichero habla de ese fichero.** El de un Scorecard enseña su
  tabla de Casos; el de una Ejecución, su Grade, su entrega y si alcanzó el skill; el de
  una captura en prosa dice que no tiene veredictos de los que hablar. Decir «su SUSPENDE»
  de un fichero que no trae ninguno era el mismo error que este ticket evita.
- **Una cabecera por fichero además de por corrida** (`<fichero>.LEGADO.md`). Quien
  abra `ejecucion-2.json` en su directorio no debería tener que buscar el README
  dos carpetas arriba para saber con qué regla se midió.
- **El Pin se marca `declarado` o `comprobado`.** Antes del ticket 04 no hay
  `arbolHash`: el commit es lo que la corrida dijo, no lo que se midió. La cabecera
  lo escribe así en vez de presentarlo como el Pin de hoy.
- **`.gitignore`:** `!/reports/legado/`, hermana de `!/reports/versiones/`, colgando
  de la misma línea `/reports/*` (la regla de `CODING_STANDARDS.md`: una negación no
  reabre un directorio ignorado como directorio). El test de git lo fija y se vio
  en rojo sin la línea.
- **Lo que no se archiva, y por qué:** el artefacto HTML (output del SUT, se
  regenera) y `estabilidad-v2/veredicto.json` (no es un folio: ni Pin ni caso por
  Skill, y su medida ya la da `resumen.json` de la misma corrida). Queda declarado
  como `expediente` en la corrida y la cabecera lo dice, para que no parezca un
  olvido. `reports/estabilidad/` (v1) se quedó fuera: repetía el experimento v2 sin
  añadir un hecho.
- **La tasa de entrega sale de `resumen.json`**, por Ejecución (`entrega`), no de
  los veredictos: es el «0 de 3 / 1 de 3» que cita `spec.md:9` y lo que abrió los
  tickets 01, 02 y lo que bloquea el 14.
- **La segunda cerradura no se toca:** `diff-versiones` sólo lee
  `reports/versiones/`, y los ficheros del legado no declaran `arbolHash`, así que
  `validarVersion` los rechaza si se le pasan a mano. No se añadió lógica de
  legado al diff: que lo ignore es la regla, no una rama más.

## Verificación

- `test/legado.test.ts` (19, puro): la cabecera (folio, Pin declarado/comprobado,
  sin regla no es legado), la medida por Caso sin inventar entregas que el fichero
  no guardó, la tasa de entrega por Ejecución, y los hechos de una Ejecución.
- `test/archivar-legado.test.ts` (8, sobre un `reports/` temporal): copia byte a
  byte, cabecera por corrida y por fichero, una corrida con un fichero ajeno se
  niega **entera** (nada a medias), expedientes, HTML fuera, origen ausente es error.
- `test/legado-cli.test.ts` (5, proceso real): el **escenario adversario** —un
  legado con `arbolHash` fechado después de B, plantado **en `legado/` y de hermano
  de `versiones/`**— no entra en el diff; sin versiones sigue saliendo «Sin diff»;
  control de que con dos versiones de verdad sí sale; y los ficheros archivados no
  pasan por versión. Cada proceso lleva su presupuesto (60 s, con la base de ~1 s
  más el arranque de `tsx`) y se comprobó **en rojo** contra un `diff-versiones` que
  recorría `reports/` (2 tests fallaron); con el real, en verde.
- `test/legado-archivo.test.ts` (8): el archivo del repo existe, tiene sus README y
  cabeceras, conserva la fuente exacta del HALLAZGO, cada fichero lleva la regla, y
  la cabecera de una Ejecución habla de **esa** Ejecución y no de un SUSPENDE que no
  tiene.
- `test/diff-versiones-cli.test.ts`: el test de `.gitignore` cubre también
  `legado/`. Se vio **en rojo** contra el `.gitignore` sin la negación.
- `npm run precommit` en verde.

## Lo que este ticket NO cierra

- **El diff de una versión nueva contra el legado.** No existe a propósito, y la
  primera suite con la regla nueva sigue empezando vacía: hace falta una segunda
  versión, que es trabajo del bucle (el ticket 11 documenta el bucle; la segunda
  versión la produce medir el skill dos veces con la regla nueva).
- **El archivo de v1 (`reports/estabilidad/`).** Se quedó fuera: repetía el
  experimento v2 sin añadir un hecho.
- **La petición a `desy-skills`** del HALLAZGO de la página de prueba: el legado
  conserva la evidencia, el cambio aguas arriba es la petición de la spec.
