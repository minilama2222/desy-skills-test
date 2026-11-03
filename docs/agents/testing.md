# Tests del harness

Guía de los tests de `test/`. `AGENTS.md` apunta aquí; no repite esto.

## Un test que necesita un binario externo

Sí, cuando el test tiene que medir un proceso real (p. ej. el exit code de la CLI).

No lo hagas por `PATH`: en Windows `spawn` sólo mira la clave **`Path`** (un `PATH`
inyectado se ignora en silencio y responde el binario **real**), un `.exe` hermano
gana a un `.cmd`, y un `.cmd` por ruta absoluta no lo lanza `spawn` sin `shell`.

La vía portable es un **preludio**: un fichero que corre dentro del proceso de la
suite vía `NODE_OPTIONS=--require`, que envuelve `child_process.spawn` y decide por
el nombre del comando. El doble deja una **marca por Ejecución** que el test afirma,
para que un falso que nunca corrió falle en vez de pasar en verde.

La fixture que funciona es `test/suite-cli.test.ts`; la allowlist que la vigila,
`npm run verificar-tests`.

## Qué puede vivir en `test/`

Tests (`*.test.ts`) y fixture declarada, nada más. Un temporal de una sesión de
depuración se borra al terminar: si se queda, `vitest` lo carga, arrastra lo que
importe y un rojo de verdad pasa por ruido del terminal. `verificar-tests` lo caza.

La fixture se declara en `FIXTURE_DECLARADA` (`scripts/verificar-tests.ts`) con su
motivo, igual que los binarios exentos.

## Un test que toca el estado del repo

Un test que escribe donde escribe el producto **redirige** ese directorio a su
temporal (`DESY_VERSIONES_DIR` en `src/reportes.ts` es el caso hecho), y pasa la
misma variable al proceso hijo que lance. La regla y el fallo que la originó
están en `CODING_STANDARDS.md` → «A test that needs the repo's own state redirects
it»; aquí sólo el puntero.

## El gate

`vitest run [fichero]` para mirar un fichero mientras se trabaja. `npm run test:gate`
corre la suite entera, recoge los dos canales y reproduce el exit code: es lo que
usa el pre-commit, y su exit es el veredicto (ver `AGENTS.md`).
