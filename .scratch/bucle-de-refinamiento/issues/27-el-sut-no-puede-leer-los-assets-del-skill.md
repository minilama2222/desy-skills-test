# 27: El SUT no puede leer los `assets/` del skill que se le manda usar

**What to build:** Que un skill pueda leer sus propios `assets/` desde el sandbox.
Hoy `desy-component-recognizer` manda usar `assets/catalog.json`,
`assets/catalog-summary.md` y `assets/linter.py`, y el SUT recibe
`Permission denied: external_directory` en cada intento.

**Blocked by:** —

**Status:** done

- [x] `read`, `grep` y `list` alcanzan los `assets/` del **árbol de skills del
      sandbox** (`<home>/.config/opencode/skills/`), que es copia del Pin y vive
      dentro del propio sandbox
- [x] Sigue denegado todo lo que esté fuera del sandbox: `external_directory` no
      se abre a `*`
- [x] Test: un comando del SUT que lee un fichero de `skills/<x>/assets/` no
      recibe `external_directory`, y uno que lee fuera del sandbox sí
- [x] Las lecturas de `skills/<x>/assets/` ya no reciben `Permission denied:
      external_directory` (quedan otras denegaciones, y son correctas: un
      `write` del SUT a `/private/var/.../T/opencode/`, fuera del sandbox)
- [x] Re-medir `component-recognizer/reconocimiento-login`: si el skill lee el
      catálogo y sigue suspendiendo, entonces sí es del skill

## La evidencia (suite del 20/11)

Once denegaciones en las tres ejecuciones de `reconocimiento-login`:

```
grep …/skills/desy-component-recognizer/assets/catalog-summary.md
  → Permission denied: external_directory
grep …/skills/desy-component-recognizer/assets/catalog.json
  → Permission denied: external_directory
```

El Caso sale 3/3 INACEPTABLE, guards 0/3. Y `desy-component-recognizer` es el
**único** skill del Pin con `assets/`: `catalog.json`, `catalog-summary.md`,
`linter.py`.

## La causa

`PERMISOS_DEL_SANDBOX` (`src/runner.ts`) termina con:

```ts
{ action: "external_directory", resource: "*", effect: "deny" },
```

El sandbox carga los skills (la acción `skill` está permitida), pero sus ficheros
viven en `<home>/.config/opencode/skills/`, **fuera del `workDir`**, así que
cualquier `read`/`grep` sobre ellos cae en `external_directory` y se deniega.

## Lo que este ticket no decide

`assets/linter.py` se ejecuta con `python3`, y el SUT **no tiene shell**. Aunque
se lea el catálogo, el linter no puede correr. Si el skill depende de él para el
trabajo, eso es una petición aparte (que el linter deje de ser necesario, o que
el harness lo ejecute como ejecuta el build del Caso-página).

## Por qué importa

Un Caso que suspende porque el SUT no pudo leer lo que el skill le manda leer no
es un hallazgo sobre el skill: es una falta de medida disfrazada de suspenso. El
bucle de refinamiento, tal como está escrito hoy, no tiene cajón para esto y
mandaría a reescribir un skill que no falló.

## La re-medida (21/11/2026, 00:40)

`npm run run -- --skill component-recognizer --case reconocimiento-login --n 3 --tope 6`:
las tres ejecuciones leen el catálogo y **ninguna** recibe `external_directory` en
una ruta de `skills/`. Quedan dos denegaciones que son correctas: un `write` a
`/private/var/.../T/opencode/identificaciones-login.json` (fuera del sandbox) y un
`read` suelto de `/var/folders/x`.

Y el skill **sigue suspendiendo los mismos 6 Checks**. El ticket pedía justo esta
separación: ya no es el sandbox, es el skill (o el Check). Dos pistas para la
próxima vuelta:

- `reconoce-input-group`: la respuesta pone `input-group` en las **notas** de dos
  filas («Contenedor del 3 y 4: `input-group` text»), no como fila propia. El
  ejemplo del propio skill lo pone como fila.
- `reconoce-header-mini`: la respuesta **sí** tiene una fila `header-mini`, y el
  Check la tumba igual. Eso huele a segundo falso positivo: hay que mirarlo antes
  de tocar el skill.

## La lección del permiso

La primera versión canonicalizaba la ruta con `realpathSync` «porque V2 normaliza
antes de casar». **Era al revés**, y se midió con el binario: la ruta literal
permite y la canonicalizada deniega. En macOS `/var` es un enlace a
`/private/var`, y resolverlo rompía justo la regla que se quería añadir. Queda
escrito en el ADR-0013 para que no se «arregle» en la dirección contraria.

## Corrección (21/11/2026, 01:10)

La conclusión de arriba —«ahora sí es del skill»— **era precipitada**. Con la
prosa decodificada (**ticket 29**) se ve que 4 de los 6 Checks pasaban y sólo
fallaban por el formato del artefacto; de los dos que quedan, uno es del Caso
(ticket 30) y otro del skill (Petición). Este ticket sigue bien cerrado: los
`assets/` se leen, que era su asunto.
