# 16: El SUT escribe fuera del sandbox, en el repo del harness

**What to build:** Que el SUT escriba sus artefactos dentro de su `workDir`, y que
un artefacto que aparezca fuera lo delate un test. Hoy escribe en `src/pages/` del
**repo del harness**, así que el Caso sale `sin-artefacto` y el repo se ensucia.

**Blocked by:** —

**Status:** done

- [x] Un Caso real escribe su artefacto en `<sandbox>/work/src/…`, no en el repo
- [x] Un test lo fija: ningún fichero nuevo aparece en el repo tras una Ejecución
- [x] Se explica por qué `cwd: sandbox.workDir` no basta con `opencode --standalone`

## El hallazgo, medido

macOS, `opencode v2.2.1`, `npm run suite -- --skill implement-component --case
boton-primario --n 1`, con el ticket 15 ya aplicado (el SUT arranca, `exit 0`).

Tras la corrida, en el repo:

```
?? src/pages/boton-enviar.html      ← en desy-skills-test/src/pages/
```

y otra vez, en una corrida limpia, el mismo fichero con otro contenido:

```njk
{% from "components/button/_macro.button.njk" import componentButton %}

<form>
  {{ componentButton({
    "text": "Enviar",
    "type": "submit",
    "classes": "c-button--primary"
  }) }}
</form>
```

En el sandbox, `src/` tiene los ficheros del starter (`index.html`,
`pagina-accesibilidad.html`, `pagina-mapa-web.html`…) y **no** tiene
`src/pages/`. El contenido es correcto; el sitio no.

### Lo que sí se descartó

- **El sandbox se crea bien y se puebla.** Medido durante una corrida: `work/` con
  12 entradas, incluidas `src/`, `node_modules` y `vite.config.js`; `home/` con
  18 MB. `createSandbox({ scaffoldDir })` copia, y `cleanup()` borra.
- **El `cwd` del proceso es el correcto.** `runCaso` pasa `cwd: sandbox.workDir`
  (`src/runner.ts:315`), y el smoke de `test/runner.smoke.test.ts` afirma que el
  `cwd` que ve el comando es `sandbox.workDir`.
- **No es un sandbox vacío.** Los `desy-sut-*` vacíos que se ven en `TMPDIR` son
  restos de tests que crean un sandbox sin `scaffoldDir`; no son de la suite.

Queda por tanto una hipótesis, no un hecho: que `opencode run --standalone`
ejecute las herramientas de escritura contra un directorio distinto del `cwd` del
proceso (su servidor privado se arranca con una base propia). Está sin medir.

## Por qué importa

- **Rompe el aislamiento del ADR-0001/0013:** el SUT deja ficheros en un árbol que
  no es suyo, y ese árbol está versionado.
- **El Caso no se gradúa:** el runner busca el artefacto en `workDir`, así que una
  ejecución correcta sale `sin-artefacto`.
- **Un `git add -A` lo comitearía.** Ha estado a punto dos veces.

## Lo que este ticket NO cierra

- **La entrega en prosa** (el SUT contestando con el código en el chat): es otra
  pregunta —si el harness acepta ese output o exige el fichero— y va en su propio
  ticket.

## Cómo se cerró (ADR-0019)

El `cwd` del proceso era correcto — `spawnSync({ cwd })` sí cambia el `cwd` del
hijo (medido con un hijo de Node: `process.cwd()` da el sandbox) —. Lo que no se
movía era el **`PWD` del entorno**: se hereda del padre, y las herramientas de
opencode resuelven las rutas relativas y el proyecto del que hablan `write` y
`shell` contra él. Con el `PWD` heredado, `shell pwd` da el padre y
`write src/x.html` acaba en él; con `PWD=<workDir>`, los dos dan el sandbox. La
misma corrida, cambiando sólo `PWD`, cambia el sitio del fichero.

Además, `OPENCODE_SESSION_ID` (que pone el agente que ejecuta la suite) engancha
al hijo a esa sesión y a su proyecto; y el formato por defecto relanza el trabajo
con su propio `cwd`, así que `--format json` también entra en el arreglo.

Lo que se construye:

- `entornoDelSut` (`src/runner.ts`): el entorno del SUT con **`PWD` = `workDir`** y
  sin `OPENCODE_SESSION_ID`, `OPENCODE_TERMINAL` ni `AI_AGENT`.
- `buildOpencodeArgs` lanza `opencode run --standalone --format json …`.
- `realCommand` toma una foto de los ficheros versionables del repo antes de
  lanzar y la compara al terminar: lo nuevo o cambiado dentro del repo y fuera
  del sandbox se acusa y la Ejecución no se da por buena (regla pura
  `escriturasFueraDelSandbox`; `.git/`, `reports/`, `.scaffold-cache/`,
  `node_modules/` y la base de sandboxes no cuentan).
- `test/runner.test.ts` fija las dos mitades: la regla (escenario adverso y
  control) y `entornoDelSut`, y un proceso real por `realCommand` que escribe en
  el repo de prueba (acusa) y en el `workDir` (no acusa).

Medido tras el arreglo: `npm run suite -- --skill implement-component --case
boton-primario --n 1` no deja ningún fichero nuevo en el repo. La Ejecución que
entregó lo hizo **dentro** del sandbox (`src/`), y lo que quedó fue un hallazgo de
trigger (entregó sin invocar `implement-component`), que es el ticket 07.
