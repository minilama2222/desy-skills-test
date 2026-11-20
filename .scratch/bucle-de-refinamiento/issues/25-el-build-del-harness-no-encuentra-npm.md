# 25: El build del harness no encuentra `npm` (ENOENT) y el Caso-página queda «Sin medir»

**What to build:** Que la compilación del Caso-página (ADR-0006, ticket 22)
encuentre `npm` y compile. Hoy `npmCommand` llama a `spawnSync("npm", …)` con el
entorno del sandbox, que es **cerrado** y no trae `PATH`: la búsqueda del binario
falla con `ENOENT`, el artefacto no se compila, el intento se cuenta como falta
de entorno y el Caso sale INDETERMINADO.

**Blocked by:** —

**Status:** done

- [x] El build recibe un `PATH` utilizable (el del propio harness), y **solo** el
      build: el entorno del SUT no se ensancha. Es `entornoDelBuild`, un derivador
      aparte: `entornoDelSandbox` se queda cerrado
- [x] Si `npm` sigue sin encontrarse, el mensaje dice el `PATH` buscado, no solo
      «no hay `npm`»
- [x] Tests: con un entorno sin `PATH` el build encuentra `npm` (proceso real, se
      salta en Windows), y el entorno del sandbox no gana variables
- [x] Re-medir: `patron-pagina-paso-1-nombre-nif` deja de ser «Sin medir» y se
      gradúa (SUSPENDE por sus Checks, que ya es un juicio del skill)

## Lo que se descartó, y por qué

La ruta **absoluta** de `npm` (que llegué a escribir en la lista de arriba) no
sirve: en Windows `npm` es un `npm.cmd`, y `spawn` no lanza un `.cmd` por ruta
absoluta sin `shell` (`docs/agents/testing.md`). Copiar el `PATH` del harness
resuelve el `ENOENT` en las dos plataformas sin tocar cómo se busca el binario.
Que en Windows el build siga sin arrancar —`npm` es un `.cmd`— es un asunto
aparte: el CI de allí no corre el Caso-página.

## La evidencia (20/11/2026, corrida de 21:56)

Los **6** intentos del Caso, con `infraestructura: "entorno"`:

```
El harness no pudo compilar (ticket 22): no hay `npm` en el entorno del sandbox.
Error: spawnSync npm ENOENT
```

Y la parte que importa: **3 de los 6 sí escribieron** `src/formulario-pasos-identidad.html`.
El SUT hizo su trabajo; lo que no ocurrió es la compilación.

El Scorecard lo cuenta como `sinMedir: 4` de 6 intentos, `conDato: 4`,
`entregas: 0` → INDETERMINADO «ninguno de sus intentos alcanzó el skill con un
Artefacto que graduar». La regla del ADR-0021 (no juzgar lo que es
infraestructura) funcionó; lo que falla es la infraestructura.

## La causa, en una línea

```ts
// src/runner.ts
const env = entornoDelSandbox({ ...sandbox, authOrigen: sandbox.authOrigen });
…
(deps.build ?? npmCommand).run(["run", "build"], { cwd: sandbox.workDir, env });
```

`entornoDelSandbox` devuelve `HOME`, `PWD`, `XDG_CONFIG_HOME`, `OPENCODE_HOME` y
las claves del proveedor — y nada más. Es correcto para el SUT (entorno cerrado,
ADR-0019/0021), pero el build no es el SUT: es una herramienta del harness, y
necesita `PATH`.

## Por qué no se vio antes

El ticket 22 se cerró con tests que inyectan un `CommandRunner` falso: el doble
nunca busca un binario, así que un `ENOENT` real no podía salir. La primera vez
que el camino se ejecuta de verdad es en una suite, y ahí han hecho falta 37
minutos para verlo.

## La re-medida (20/11/2026, 23:45)

Solo ese Caso, con `--reports` y `DESY_VERSIONES_DIR` fuera del repo para no
pisar la medida completa:

| | Antes (suite de 21:56) | Después |
|---|---|---|
| Veredicto | INDETERMINADO | **SUSPENDE** |
| Entregas | 0 de 6 | **3 de 4 intentos** |
| «Sin medir» | 4 | **0** |
| Guards | 0/9 | **8/9** |
| Artefacto | ninguno | `dist/formulario-datos-identidad.html` |

19m 11s, y se para en el intento 4 porque ya tenía tres entregas. Los rojos que
quedan —`encadenado-canonico` (3 de 4) y `fidelidad-gap` (3 de 4)— ya son
asunto del skill, no del harness.
