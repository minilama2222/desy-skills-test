# El sandbox hereda las claves de `auth.json` como variables de proveedor

Con la 2.2.1, `npm run suite` no arrancaba el SUT en una máquina limpia: las dos
Ejecuciones salían con `exit 1` y `Model unavailable:
deepinfra/deepseek-ai/DeepSeek-V4.1-Flash-1017`. El ADR-0013 decía que bastaba con
copiar `auth.json` al sandbox, y con la 2.1.2 era verdad. Ya no lo es.

## Lo que se midió

Bisección sobre un `HOME` temporal, con `opencode run --standalone`:

| Qué tiene el sandbox | Resultado |
|---|---|
| `auth.json` copiado | `Model unavailable` |
| `auth.json` + `~/.cache/opencode/models.json` | `Model unavailable` |
| `auth.json` + `opencode.db` | arranca |
| `DEEPINFRA_API_KEY` en el entorno, sin `auth.json` | arranca |

En la 2.2.1 el catálogo de proveedores vive en `opencode.db` (tabla `kv`, clave
`models-dev:v2:catalog`), y el sandbox no lo tiene. La **variable de entorno** del
proveedor sí resuelve el modelo sin catálogo.

Dos controles separan «la clave resuelve» de «el id existe»: con una clave
inválida el error es `User is not authorized…`, y con un modelo inexistente vuelve
a ser `Model unavailable`.

## Decisiones

- **La clave sale de `auth.json`, que ya se copiaba.** `clavesDeProveedores` lee el
  fichero y devuelve una variable por proveedor de tipo `api` (`deepinfra` →
  `DEEPINFRA_API_KEY`). `entornoDelSandbox` las añade al entorno del SUT.
  No se abre ningún fichero nuevo ni se pide nada al mantenedor.
- **Del `auth.json` del usuario, no de la copia del sandbox.** `runCaso` pasa
  `authOrigen` explícito: la copia existe solo después de `configurar()`, y el
  entorno se compone antes.
- **Todas las claves `api`, no solo la del SUT.** El sandbox ya limita los
  proveedores con `policies.provider.use` (solo `deepinfra`), así que la lista no
  amplía lo que el SUT puede usar; y así una skill que cambie de proveedor no
  rompe el arranque por una regla de más.
- **Una sesión OAuth se omite, no se inventa.** Una credencial que no sea `api` no
  se puede expresar como variable; el sandbox se queda sin ella y el error lo dirá.
- **No se copia `opencode.db`.** Resolvería el arranque, y rompe la frase que este
  mismo ADR y el 0013 prometen: la base lleva las sesiones del mantenedor y
  credenciales en claro en la tabla `credential`, y son 794 MB por Ejecución.

## Alternativas descartadas

- **Copiar `opencode.db`.** Ver arriba: aislamiento y tamaño.
- **Copiar solo la tabla `kv` del catálogo.** Es estado del usuario que hay que
  mantener sincronizado con el binario, y un catálogo viejo miente igual que una
  ruta vieja.
- **Declarar el proveedor en el `opencode.jsonc` del sandbox.** Se probó y dio
  `missing API key` en todas las variantes: la clave no está en ese fichero.
- **Cambiar `MODELO_DEL_SUT`.** Rompe la comparabilidad con lo ya medido
  (ADR-0001/0013).

## Consecuencias

- `entornoDelSandbox` deja de ser solo rutas: también transporta credenciales.
  Sigue siendo el único sitio que compone el entorno del SUT, así que no hay dos
  listas que se desincronicen.
- La clave viaja al **entorno del proceso** del SUT, no a su disco: el sandbox
  sigue sin guardar nada del usuario más allá del `auth.json` que ya copiaba.
- Un `auth.json` ilegible devuelve vacío y el error que se ve es el de
  `configurar()` («no existe …no tiene con qué resolver»), no uno de entorno.
- Si una versión futura vuelve a cambiar cómo resuelve el modelo, el test de
  `test/sandbox.test.ts` no lo notará: fija la regla, no el binario. El rojo que
  lo notará es el `suite` real, con `exit 1` en el primer intento.