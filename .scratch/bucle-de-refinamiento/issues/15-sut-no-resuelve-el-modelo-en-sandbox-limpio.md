# 15: El SUT no resuelve el modelo en un sandbox limpio (2.2.1)

**What to build:** Que `npm run suite` corra el SUT real en una máquina recién
preparada, sin copiar la base de datos del mantenedor ni exponer su estado.

**Blocked by:** —

**Status:** ready-for-human
**Status depende de:** el visto bueno a que el entorno del SUT lleve las claves de
proveedor leídas de `auth.json` (ADR-0018). Construido y verde; lo que falta es la
aceptación, no el código.

- [x] El sandbox resuelve el modelo fijo con un `HOME` limpio, sin `opencode.db`
- [x] Un test fija la regla: las claves `api` de `auth.json` llegan al entorno del SUT
- [x] El test se vio **en rojo** sin el cambio
- [x] `npm run suite` ya no sale con `exit 1` por `Model unavailable`
- [x] El ADR-0013 deja de afirmar que `auth.json` basta

## El hallazgo, medido

Máquina: macOS, `opencode v2.2.1` (Homebrew). Scaffold cacheado en `37748bd`.

`npm run suite -- --skill implement-component --case boton-primario --n 1` corría,
pero las dos Ejecuciones salían `exit 1` con:

```
Error: Model unavailable: deepinfra/deepseek-ai/DeepSeek-V4.1-Flash-1017
```

El veredicto `INDETERMINADO` era correcto por la regla (ADR-0014): no hubo
entregas. Lo que el veredicto no decía es que **el SUT ni arrancó**, y el informe
por Caso sí (`exit 1`, «crasheó», «no invocó ningún skill»): el ticket 02 haciendo
su trabajo.

### La causa

Bisección sobre un `HOME` temporal con `opencode run --standalone`:

| Qué tiene el sandbox | Resultado |
|---|---|
| `auth.json` copiado | `Model unavailable` |
| `auth.json` + `~/.cache/opencode/models.json` | `Model unavailable` |
| `auth.json` + `opencode.db` | arranca |
| **`DEEPINFRA_API_KEY` en el entorno**, sin `auth.json` | **arranca** |
| `DEEPINFRA_API_KEY` con una clave inválida | `User is not authorized…` (otro error) |
| `DEEPINFRA_API_KEY` con un modelo inexistente | `Model unavailable` |

Las dos últimas filas son los controles: distinguen «la clave funciona» de «el
modelo no existe», así que la segunda fila no es un falso verde.

Con la 2.2.1, `auth.json` **no** basta para resolver el modelo (el catálogo de
proveedores vive en `opencode.db`), pero la **variable de entorno sí**.

### Lo que se construyó

`clavesDeProveedores(authPath)` (`src/runner.ts`) lee el `auth.json` que el
sandbox **ya copiaba** y devuelve la clave de cada proveedor de tipo `api` como
variable (`deepinfra` → `DEEPINFRA_API_KEY`). `entornoDelSandbox` las añade al
entorno del SUT, y `runCaso` le pasa el `auth.json` **del usuario** (no la copia:
puede no existir todavía cuando se compone el entorno).

No viaja nada nuevo del usuario: el fichero ya se copiaba, y el sandbox limita qué
proveedores puede usar (`policies.provider.use`). Una sesión OAuth no se puede
expresar como variable, así que se omite y no se inventa.

## Rectificación de un diagnóstico intermedio

Durante la investigación afirmé dos cosas que no se sostenían, y quedan aquí para
que no se repitan:

- **«El modelo no está bajo `deepinfra`»**: falso. Está bajo `deepinfra`
  (`https://api.deepinfra.com/v1/openai`, sdk `@ai-sdk/deepinfra`). Las consultas
  a `opencode.db` que lo negaban estaban mal escritas (JSON path con guion sin
  escapar).
- **«Declarar el proveedor en el `opencode.jsonc` lo resuelve»**: no se demostró.
  Dio `missing API key` en todas las pruebas.

## Lo que este ticket NO cierra

- **El SUT escribiendo fuera del sandbox**, en `src/pages/` del repo. Es un fallo
  distinto, medido después de este arreglo, y tiene su ticket: el 16.
- **Copiar `opencode.db` al sandbox.** Funciona y está descartado: lleva las
  sesiones del mantenedor y credenciales en claro en la tabla `credential`, y son
  794 MB por Ejecución.
- **Cambiar `MODELO_DEL_SUT`.** Afecta a comparabilidad (ADR-0001/0013).

## Verificación

- `test/sandbox.test.ts` (9): la regla de la ruta de datos y la de las claves de
  proveedor. La segunda se vio en rojo quitando una línea del producto.
- `npm run suite -- --skill implement-component --case boton-primario --n 1`
  contra el SUT real: llega a ejecutar el agente (ver «Comentarios»).
- Ver **ADR-0018**.
