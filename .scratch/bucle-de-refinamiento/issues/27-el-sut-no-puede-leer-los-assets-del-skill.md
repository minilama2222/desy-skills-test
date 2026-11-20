# 27: El SUT no puede leer los `assets/` del skill que se le manda usar

**What to build:** Que un skill pueda leer sus propios `assets/` desde el sandbox.
Hoy `desy-component-recognizer` manda usar `assets/catalog.json`,
`assets/catalog-summary.md` y `assets/linter.py`, y el SUT recibe
`Permission denied: external_directory` en cada intento.

**Blocked by:** —

**Status:** ready-for-agent

- [ ] `read`, `grep` y `list` alcanzan los `assets/` del **árbol de skills del
      sandbox** (`<home>/.config/opencode/skills/`), que es copia del Pin y vive
      dentro del propio sandbox
- [ ] Sigue denegado todo lo que esté fuera del sandbox: `external_directory` no
      se abre a `*`
- [ ] Test: un comando del SUT que lee un fichero de `skills/<x>/assets/` no
      recibe `external_directory`, y uno que lee fuera del sandbox sí
- [ ] La salida del Caso deja de contener `Permission denied: external_directory`
- [ ] Re-medir `component-recognizer/reconocimiento-login`: si el skill lee el
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
