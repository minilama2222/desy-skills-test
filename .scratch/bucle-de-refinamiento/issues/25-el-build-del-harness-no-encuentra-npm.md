# 25: El build del harness no encuentra `npm` (ENOENT) y el Caso-página queda «Sin medir»

**What to build:** Que la compilación del Caso-página (ADR-0006, ticket 22)
encuentre `npm` y compile. Hoy `npmCommand` llama a `spawnSync("npm", …)` con el
entorno del sandbox, que es **cerrado** y no trae `PATH`: la búsqueda del binario
falla con `ENOENT`, el artefacto no se compila, el intento se cuenta como falta
de entorno y el Caso sale INDETERMINADO.

**Blocked by:** —

**Status:** ready-for-agent

- [ ] El build recibe un `PATH` utilizable (el del propio harness), y **solo** el
      build: el entorno del SUT no se ensancha
- [ ] `npm` se resuelve a una ruta **absoluta** antes de lanzarlo, para no
      depender del orden del `PATH` ni de que el hijo lo herede
- [ ] Si `npm` sigue sin encontrarse, el mensaje dice la ruta buscada, no solo
      «no hay `npm`»
- [ ] Test: con un entorno sin `PATH`, el build encuentra `npm`; y el entorno que
      se le pasa al SUT no gana variables
- [ ] Re-medir: `patron-pagina-paso-1-nombre-nif` deja de ser «Sin medir» y se
      gradúa (o SUSPENDE por sus Checks, que ya es un juicio del skill)

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
