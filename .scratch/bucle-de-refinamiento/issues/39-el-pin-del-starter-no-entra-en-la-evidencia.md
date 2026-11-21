# 39: El pin del starter no entra en la evidencia

**What to build:** Que la medida diga **con qué starter** se hizo. Hoy
`scaffold-pin.json` existe y está al día, pero no lo lee nadie: ni el runner, ni
el Scorecard, ni el fichero de versión. Dos corridas del mismo `arbolHash` con
starters distintos quedan en el mismo fichero y no se pueden distinguir.

**Blocked by:** —

**Status:** done

- [x] `readScaffoldPin()` lee `scaffold-pin.json` (ref, commit, fecha) y falla
      con un mensaje claro si el fichero no está o está malformado
- [x] El `Scorecard` lleva `starter` y la cabecera lo imprime
- [x] El fichero de versión (`reports/versiones/<arbolHash>.json`) lo guarda
- [x] Los scripts de preparación leen el ref por defecto del pin, sin duplicarlo
- [x] Tests del lector y del render
- [x] Los ficheros de versión antiguos siguen cargando (campo opcional)

## La evidencia (21/11/2026)

`grep -rn "scaffold-pin" src/ scripts/ test/` no devuelve nada: el fichero es
documentación. La versión sólo guarda `pin` (desy-skills), `arbolHash`,
`skills` y `corridas`. Y `preparar-scaffold.sh` tiene el ref por defecto
duplicado (`37748bd`), así que actualizar el pin no cambia la receta.

El ADR-0005 ya dice que «el Grade de un Caso depende de la versión del starter
tanto como del Pin de desy-skills». La evidencia no lo refleja.

## Implementado (21/11/2026)

- `src/scaffold-pin.ts`: `readScaffoldPin()` (ref, commit, fecha, repo); un
  fichero ausente o malformado devuelve `undefined` y no se inventa nada.
- `Scorecard` y `ScorecardDeVersion` llevan `starter`; la cabecera imprime
  `Starter <ref> (<commit>)`; el fichero de versión lo guarda.
- `preparar-scaffold.sh` y `.ps1` leen el ref por defecto de
  `scaffold-pin.json`, sin duplicarlo.
- Tests: `test/scaffold-pin.test.ts` y el caso de `test/versiones.test.ts`.
- Los ficheros de versión anteriores siguen cargando: el campo es opcional.
  La corrida 7 se escribió antes del cambio, así que el `starter` aparecerá a
  partir de la próxima medida.
