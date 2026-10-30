# 09: Versionado de scorecards y diff entre versiones

**What to build:** Que dos versiones de los skills se puedan comparar sin inventar infraestructura: un scorecard pequeño por versión, versionado, y un diff.

**Blocked by:** 01, 04

**Status:** done

- [x] Cada `suite` escribe `reports/versiones/<arbolHash>.json` (scorecard completo, con pin y hash)
- [x] `reports/` sigue ignorado salvo ese subdirectorio: ajustar `.gitignore` con una excepción explícita
- [x] Un comando `npm run diff-versiones <a> <b>` produce, por Caso y por Skill, el cambio de veredicto y de correctas/entregó-mal/sin-entregar
- [x] `npm run report` deja de re-etiquetar: toma el `pin` de cada Ejecución
- [x] El diff empieza vacío: si no hay dos versiones, el comando lo dice y sale limpio
- [x] Tests de forma del scorecard de versión y del diff (puro, sobre dos JSON de fixture)

## Por qué

`reports/` está en `.gitignore:2` y cada suite **vacía** `reports/suite/ejecuciones` (`src/cli.ts:158`). La user story 4 de la spec del harness pide comparar versiones y no existe: `grep` de diff/baseline en `src/` no encuentra nada.

## Decisiones

Ver **ADR-0016** (`docs/adr/0016-historia-y-diff-de-versiones.md`).

## Notas de implementación

- **`src/versiones.ts`** (puro): `scorecardDeVersion` (la forma versionada),
  `validarVersion` (el JSON que se lee de disco) y `diffDeVersiones` /
  `renderDiff`. El fichero de versión es el scorecard **sin re-envolver** —
  `arbolHash`, `pin`, `skills`—, y su `pin` pierde `repo`: en una corrida local es
  la ruta del checkout del mantenedor (ADR-0015).
- **`suite`** versiona tras escribir el Scorecard (`escribirVersionDeLaCorrida`
  en `src/cli.ts` → `escribirVersion` en `src/reportes.ts`). El directorio es
  **fijo** (`VERSIONES_DIR`), no el `--reports` de la corrida: el diff busca por
  hash. Un scorecard sin `arbolHash` —posterior al ticket 04 eso no pasa— no se
  versiona, y la suite lo dice por stderr en vez de inventar un nombre.
  `escribirVersion` rechaza un hash que no sea un nombre de fichero válido.
- **El diff empieza vacío.** Sin dos versiones, `npm run diff-versiones` dice
  cuántas hay y sale con `0`: es el estado normal tras la primera suite, y un
  diff contra nada inventaría una línea base. Sin argumentos toma las dos **más
  recientes** (fecha del Pin, y a igualdad la hora de escritura del fichero); con
  dos, dos hashes de `reports/versiones/` o dos rutas.
- **Compara el hecho, no solo el veredicto.** Cambia también si dos versiones
  PASA tienen distinta tasa de entrega, que es justo lo que el veredicto esconde.
  Un Caso/Skill que solo existe en una versión se pinta con `—`, no como «no
  cambió»: un cero ahí mentiría.
- **`report` deja de re-etiquetar.** Antes declaraba el Pin de la **primera**
  Ejecución como el de todas; ahora, si el árbol mezcla Pins —las corridas de
  `run` se acumulan—, declara **`mixto`** con la fecha más reciente y lo avisa
  por stderr. Sin un Pin único el Scorecard no es una versión, y antes decía uno
  que podía no ser el de nadie.
- **`.gitignore`**: `reports/` sigue ignorado y `!reports/versiones/` reabre solo
  ese directorio. Las Ejecuciones siguen fuera de git, que es lo pesado.
- **Aislamiento de los tests**: la suite real corre `src/cli.ts` como proceso, así
  que escribiría en el `reports/versiones/` versionado. `VERSIONES_DIR` se
  redirige con `DESY_VERSIONES_DIR`, y `test/suite-cli.test.ts` apunta cada
  corrida a su temporal. `test/diff-versiones-cli.test.ts` aparta el directorio
  del repo con un `rename` mientras corre y lo devuelve al terminar.
- **Pin local**: una versión medida con `--skills-local` se diffea, y el comando
  avisa por stderr de que no es lo que se medirá en CI (ADR-0015).
- **`reports/legado/`** queda fuera del diff (ticket 10): se midió con otra regla.

## Hallazgo de entorno: el presupuesto de tiempo medía la máquina

Al correr el gate, `test/suite-cli.test.ts` falló por tiempo (37 s para una
Ejecución, techo 35 s) en la suite entera y pasaba aislado (19 s). Medido:

| Qué | Tiempo |
|---|---|
| `robocopy` del scaffold (`/MT:8`), solo | 6,5 s |
| Arranque de `tsx` | 4,2 s |
| La misma corrida aislada, con este cambio / sin él | 19,1 s / 20,0 s |
| La misma corrida en la suite entera, paralela | 37 s |

No era una regresión de este ticket: con los cambios apartados (`git stash`) el
mismo test da el mismo tiempo. Era **contienda**: vitest corría los 46 ficheros
en paralelo y la copia del scaffold competía por el disco.

Se descartó **subir el techo** (es lo que `CODING_STANDARDS.md` prohíbe: mide la
máquina, no el código) y también una calibración relativa a una copia del
scaffold: la copia es sólo ~1/3 del coste de una Ejecución, así que ninguna razón
«copia × K» expresa el presupuesto — se probó y se descartó con medidas. La
corrección va donde estaba el problema: **`maxWorkers: 2, minWorkers: 1`** en
`vitest.config.ts`, para que el fichero pesado no compita con los otros 45. (Los
dos valores van juntos: tinypool rechaza un `maxThreads` por debajo del
`minThreads` por defecto, y el gate salió en rojo con «no tests» al dejar sólo
`maxWorkers`.) El techo de 35 s por Ejecución se queda como estaba.

Si en una máquina lenta vuelve a saltar, la respuesta es perfilar la copia antes
de tocar el número, y mirar primero la contienda.

## Verificación

- `test/versiones.test.ts` (14 tests, puro sobre JSON de fixture): forma del
  scorecard de versión (hash, pin sin ruta, sin `arbolHash` no hay versión),
  validación del JSON, y el diff —sin cambios, SUSPENDE→PASA, mismo veredicto y
  distinta entrega, Caso/Skill nuevo o retirado, simetría— más su render.
- `test/diff-versiones-cli.test.ts` (8 tests, proceso real): el diff vacío y el
  de una sola versión salen con `0` y lo dicen; con dos versiones da las tablas;
  dos rutas explícitas; el aviso de Pin local; una ruta inexistente es un error;
  y `report` declara `mixto` (con su control positivo: un Pin único **no** lo
  dice). El test de `mixto` se vio **en rojo** contra el código de antes del
  arreglo, como pide `CODING_STANDARDS.md`.
- `test/suite-cli.test.ts`: el test del subconjunto por Caso ahora fija también
  que `suite` deja `reports/versiones/<arbolHash>.json` con el `pin` y los
  `skills` del Scorecard, en el temporal de la corrida.
- `npm run precommit` en verde.

## Lo que este ticket NO cierra

- **`pasaSostenido` sigue sin llamarse desde el harness.** La historia que
  compara ya existe (dos versiones versionadas), pero quien declara «refinado» es
  el mantenedor leyendo el diff: el criterio de cierre no se aplica solo. El
  ticket 11 (documentar el bucle) es donde toca decir cómo se aplica.
- **`reports/legado/`** no existe todavía: es el ticket 10, que además añade el
  test de que el diff no lo lee.
- El diff no compara Grades de calidad ni fallos por Check, solo el veredicto y
  las cuentas de entrega que el ticket pide; el detalle por Check vive en el
  informe por Caso de cada corrida.
