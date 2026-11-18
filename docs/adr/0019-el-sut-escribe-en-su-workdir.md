# El SUT escribe en su `workDir`: `PWD`, el formato y un vigilante del repo

Medido el 18/11/2026 con `opencode v2.2.1` en macOS, cerrando el ticket 16 del
bucle de refinamiento: un Caso-componente del SUT real escribía su artefacto en el
**repo del harness** (`src/pages/boton-enviar.html` y, en otra corrida,
`src/pagina-boton-primario.html`) y salía `sin-artefacto`.

## El hecho, medido

El ticket dejaba una hipótesis: que `--standalone` ejecutara las herramientas
contra un directorio distinto del `cwd` del proceso. Cierto que no era el `cwd`,
pero el culpable es otro.

- **`spawnSync({ cwd })` sí cambia el `cwd` real del hijo.** Medido con un hijo de
  Node: `process.cwd()` es el sandbox.
- **El `PWD` del entorno no.** `spawnSync` no lo toca, así que el SUT hereda el
  `PWD` del padre: el repo, cuando la suite corre desde el repo, y el temporal de
  la sesión cuando la lanza un agente. Y las herramientas de opencode resuelven las
  rutas relativas —y **el proyecto del que hablan `write` y `shell`**— contra
  `PWD`: con el `PWD` heredado, `shell pwd` da el padre y `write src/x.html` acaba
  en él; con `PWD=<workDir>`, los dos dan el sandbox. La misma corrida, cambiando
  sólo `PWD`, cambia el sitio del fichero.
- **`--format json`** también importa, por otra razón: el formato por defecto
  imprime un TUI que **relanza** el trabajo, y el relanzamiento se lleva su propio
  `cwd`; `json` corre el trabajo en el proceso lanzado y emite un evento por
  línea. Con los dos arreglos, el artefacto aparece en `work/src/`.
- **`OPENCODE_SESSION_ID` viaja con el agente que ejecuta la suite** y engancha al
  hijo a esa sesión: sus herramientas usan el proyecto de ella. Quitarla es lo
  que hace que `shell pwd` dé el sandbox cuando la suite se lanza desde un agente
  (medido: con la variable, el repo; sin ella, el `workDir`).

## Decisión

1. **`entornoDelSut`** (`src/runner.ts`): el entorno del SUT es el del lanzador más
   el del sandbox, con **`PWD` puesto al `workDir`**, y sin
   `OPENCODE_SESSION_ID`, `OPENCODE_TERMINAL` ni `AI_AGENT`. `HOME` sale del
   sandbox como siempre (ADR-0013/0018). El `cwd` del proceso se queda: es el que
   usa un hijo que no mire `PWD`.
2. **`--format json`** en `buildOpencodeArgs`: quita de en medio el relanzamiento
   con `cwd` propio y deja un evento por línea, que es lo que se lee.
3. **Un vigilante del repo**: `realCommand` toma una foto de los ficheros
   versionables del repo (tamaño + mtime, saltando `.git/`, `reports/`,
   `.scaffold-cache/` y `node_modules/`, y lo ignorado por `.gitignore`) **antes**
   de lanzar, y la compara **en cuanto** el proceso termina. Lo nuevo o cambiado
   dentro del repo y fuera del sandbox se acusa: la Ejecución se corta y
   `realCommand` lanza con las rutas. Es la red que convierte una regresión futura
   —otro formato, otra variable— en un rojo con nombre, no en un fichero suelto.

   No se usa `fs.watch`: sus eventos son de todo el árbol y de cualquier proceso
   (el `git status` de la suite, un commit, el mantenedor con su editor) y acusar
   al SUT por la escritura de otro sería un falso rojo. Y no se espera con
   `spawn` + `Atomics.wait`: en el hilo principal no entrega ni el `close` del
   hijo ni los `data` de las tuberías, así que un proceso terminado nunca se veía
   terminado (medido: el padre esperaba para siempre). `spawnSync` bloquea pero
   devuelve los dos canales completos, y la comparación de antes/después ve el
   fichero nuevo igual.

Guardias del vigilante: `.git/`, `reports/`, `.scaffold-cache/` y `node_modules/`
no cuentan (son del producto y de la suite); lo que cae en la base de sandboxes
(`desy-sut-*`, con su `home/`) tampoco; lo que está fuera del repo no se juzga (el
aislamiento del disco es de ADR-0013).

## Límite conocido: el vigilante no atribuye, sólo ve el cambio

El vigilante compara el **árbol**, no los procesos: sabe *que* un fichero cambió,
no *quién* lo cambió. Consecuencia, medida el 18/11/2026: una corrida de
`npm run suite` abortó acusando `test/sandbox.test.ts`, un fichero rastreado que
el mantenedor estaba editando en ese momento. `git status` estaba limpio y el
contenido era idéntico al commit: la única diferencia era el **mtime**, movido por
la edición, no por el SUT. La foto de antes se había tomado con la fecha vieja y
la de después vio la nueva.

Esto es un **falso positivo**, no una fuga. Un guardarraíl que salta durante el
trabajo normal se acaba ignorando, así que se documenta en vez de estrecharse:

- **Qué sigue cubierto**: un fichero **nuevo** en el repo (el caso del ticket 16:
  `?? src/pages/boton-enviar.html`), y un fichero existente **cuya ruta no cambia
  de contenido entre la foto y la comparación** no se acusa (sólo cuenta si su
  firma difiere).
- **Qué no cubre**: a quién culpar cuando la firma cambia. Si el mantenedor guarda
  un fichero mientras el SUT corre, la Ejecución se aborta igual y el mensaje
  nombra un fichero que el SUT no tocó.
- **Qué hacer**: lanzar la suite con el árbol quieto. Si salta con un fichero que
  no has tocado durante la corrida, es una fuga de verdad y el mensaje trae la
  ruta.

La alternativa evaluada y **descartada** el 18/11/2026 fue estrechar el detector a
los ficheros nuevos (o a los rastreados que estaban limpios al arrancar). Se
descartó por decisión del mantenedor: el coste de código y de casos que vigilar
no compensa frente a «no edites la suite mientras corre», y la limitación queda
dicha aquí en vez de descubierta la próxima vez.


## Consecuencias

- `test/runner.test.ts` fija las dos mitades: la regla (`escriturasFueraDelSandbox`,
  con escenario adverso y control) y `entornoDelSut` (`PWD` al `workDir`; sin las
  variables de la sesión), y un proceso real por `realCommand` que escribe en el
  repo de prueba (acusa) y en el `workDir` (no acusa).
- El test que simula una fuga tiene su repo raíz en un temporal: es lo único que
  la regla necesita, y así el test no toca el árbol del harness
  (`CODING_STANDARDS`: «a test that needs the repo's own state redirects it»).
- Un Caso real escribe en `<sandbox>/work/src/…` y el repo queda limpio: medido
  con `npm run suite -- --skill implement-component --case boton-primario --n 1`,
  que tras el arreglo no dejó ningún fichero nuevo en el repo.
- Lo que este ADR **no** toca: la entrega en prosa (el SUT contestando con el
  código en el chat) y el trigger del skill. En la corrida de validación una
  Ejecución **entregó** el artefacto en `src/` sin invocar `implement-component`
  (hallazgo de trigger, ticket 07); aquí se arregla dónde escribe, no que lo
  escriba.
- El vigilante **no atribuye**: un fichero que el mantenedor guarde mientras la
  suite corre se acusa como si fuera del SUT (ver «Límite conocido»). Se acepta y
  se documenta; la alternativa —acusar sólo ficheros nuevos— se evaluó y se
  descartó el 18/11/2026.
