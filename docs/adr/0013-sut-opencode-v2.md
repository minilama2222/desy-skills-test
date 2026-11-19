# SUT: OpenCode V2 (`opencode run --standalone`) con el sandbox autosuficiente

El SUT pasa a ser **OpenCode V2** (medido con la 2.1.2) con el modelo
`deepinfra/deepseek-ai/DeepSeek-V4.1-Flash-1017`, el mismo con el que corre el
agente que ejecuta la suite. Sigue siendo `opencode run` no-interactivo
(ADR-0001), pero V2 obliga a cuatro cambios que V1 no exigía. Los cuatro se
midieron ejecutando el binario real, no leyendo la documentación.

## `--standalone`: el servidor privado de cada Ejecución

En V2 `opencode run` se conecta por defecto al **servicio de fondo compartido**
del usuario, que arranca con el `HOME` real. Un sandbox con `HOME` temporal no
aislaba nada: el servicio compartido mandaba. `--standalone` arranca un servidor
privado para la Ejecución, y entonces el `HOME`/`XDG_CONFIG_HOME` del sandbox sí
deciden qué config, skills y base de datos usa el SUT.

## Las skills globales viven en `<XDG_CONFIG_HOME>/opencode/skills`

Medido en la 2.1.2: V2 **no** descubre `~/.config/opencode/skills` (la ruta que
usaba V1) y una skill copiada ahí falla con `Unable to load skill`. El directorio
global escaneado es `<config>/opencode/skills`, donde `<config>` es el directorio
de config raíz (el valor de `XDG_CONFIG_HOME`). Con el sandbox de este repo
(`XDG_CONFIG_HOME = <home>/.config/opencode`) la ruta es
`<home>/.config/opencode/opencode/skills`. `skillsDirDeConfig` la deriva del
`configDir` y `configurar()` declara esa misma ruta en `skills` como fuente
explícita, para no depender de cómo se monte el sandbox.

Se probaron además `~/.claude/skills` y las entradas `skills` del config (ruta
absoluta, una por skill y con `~/`): ninguna cargó la skill hasta mover los
ficheros a la ruta de arriba.

> **Corregido el 19/11/2026, con la 2.2.1 (retro del ticket 19).** Este apartado
> describía la ruta bien y el sandbox la montaba mal: `XDG_CONFIG_HOME` valía
> `<home>/.config/opencode` —un nivel de más—, así que V2 buscaba su config en
> `<home>/.config/opencode/opencode/`, una carpeta **vacía**: `opencode debug
> config --standalone` no listaba el `opencode.jsonc` del sandbox. El SUT corría
> **sin ninguna skill**, y por eso los skills dejaron de dispararse en cuanto se
> pasó a V2 (en V1 se disparaban: 4 de 5 Ejecuciones de octubre). El
> `entornoDelSandbox` pone ahora `XDG_CONFIG_HOME` a la **raíz** (`<home>/.config`),
> que es lo que V2 completa con `opencode` hasta el `configDir` del sandbox;
> `test/sandbox.test.ts` fija esa relación para que no vuelva a desalinearse.
>
> **Y un segundo fallo, escondido tras el primero.** En V2 la invocación de un
> skill **no** es la línea `→ Skill "…"` de V1 (por stderr) que `parseInvocaciones`
> leía, sino una llamada a la herramienta `skill` en el stream JSON de stdout
> (`{"part":{"type":"tool","tool":"skill","state":{"input":{"id":"desy-…"}}}}`).
> Con el primer fallo, nada se invocaba y el parser nunca tuvo qué fallar; al
> arreglar la ruta, el Flujo seguía `[]` con el skill ya cargado. `parseInvocaciones`
> lee ahora las dos formas (`invocacionesDelStreamV2`), y
> `test/caso-runner-observable.test.ts` fija la de V2 con un control negativo.
>
> Lección, hermana de la de abajo: la convención de rutas **y la forma de la
> salida** del binario se **re-miden** con `opencode debug paths`/`debug config` y
> leyendo un transcript real al subir de versión, y un test que reconstruye la ruta
> desde la misma suposición que el código no la protege (este la reconstruía y
> daba verde).

## Las credenciales no viajan con el sandbox

Las cuentas conectadas (`opencode auth login`) viven en el directorio de datos
(`auth.json`), que en V2 depende del `HOME` en las tres plataformas:
`~/.local/share/opencode`. Con un `HOME` vacío el modelo sale
`Model unavailable`. Como el proveedor `deepinfra` del catálogo no declara
variable de entorno, un `DEEPINFRA_API_KEY` tampoco lo resuelve.

> **Corregido el 17/11/2026, con la 2.2.1.** Este ADR afirmaba que en macOS el
> directorio de datos era `~/Library/Application Support/opencode` y que macOS no
> movía `Application Support` con `HOME`. Eso era la 2.1.2: en la 2.2.1
> `opencode debug paths` da `data <HOME>/.local/share/opencode` en macOS, y sigue
> al `HOME` inyectado como en Linux. La regla por plataforma se quedó sin base y
> rompía los diez tests que crean un sandbox con
> «no existe …/Application Support/opencode/auth.json». `datosDirDeHome` pasa a
> tener una sola regla; `test/sandbox.test.ts` la fija en las tres plataformas.
> Lección: una ruta copiada de una medición caduca con el binario, así que se
> vuelve a medir con `opencode debug paths` al subir de versión.

> **Parcialmente falso, medido el 17/11/2026 en la 2.2.1.** Que `auth.json` basta
> para que el sandbox resuelva el modelo fijo **no se sostiene**: con el
> `auth.json` copiado y un `HOME` limpio, `opencode models` no lista `deepinfra` y
> el SUT sale con `Model unavailable`. Lo que falta es el **catálogo de
> proveedores**, que la 2.2.1 guarda en `opencode.db` (tabla `kv`, clave
> `models-dev:v2:catalog`) y **no** en `~/.cache/opencode/models.json`. Copiar esa
> base de datos resolvería el arranque y rompería la frase de abajo: lleva las
> sesiones del mantenedor y credenciales en claro.
>
> **Arreglado en el ticket 15 (ADR-0018):** lo que sí resuelve el modelo es la
> **variable de entorno** del proveedor, y `entornoDelSandbox` la pone a partir del
> `auth.json` que ya se copiaba. Esta sección sigue siendo cierta sobre lo que el
> sandbox copia; lo que cambió es que copiar ya no es lo único que necesita.

Por eso `configurar()` **copia solo `auth.json`** al sandbox (`SandboxOptions.authOrigen`,
por defecto el del `HOME` real; `homeReal` permite sustituirlo en tests). No entra
ningún otro estado del usuario: ni sesiones, ni plugins, ni skills, ni config.
`datosDirDeHome(home)` compone la ruta desde `HOME` —se prueba con las tres
plataformas declaradas, aunque el CI corra en una— y `entornoDelSandbox` fija
además `OPENCODE_HOME` al directorio de datos del sandbox, para que la base de
datos de sesiones tampoco acabe en la del usuario.

## Configuración que encierra el sandbox

Los permisos por defecto de V2 son «todo permitido» y `external_directory` no
pregunta, así que el SUT podía leer el disco de la máquina. `configuracionDelSandbox`
escribe un `opencode.jsonc` en el sandbox con:

- **`policies.provider.use`**: `deny` para todo proveedor e `allow` solo para
  `deepinfra`. V2 no tiene el `enabled_providers` de V1; esto cumple su función
  (con el `auth.json` copiado, sin esto el SUT podría gastar otras cuentas).
- **`permissions`** (`PERMISOS_DEL_SANDBOX`): base `deny` sobre `*` (una acción
  nueva de una versión futura también queda cerrada) y `allow` a `read`, `edit`,
  `glob`, `grep`, `list` y `skill` —lo que el Caso necesita para escribir su
  artefacto—, con `external_directory: deny`.

> **Falta una pieza, medida el 18/11/2026.** Esta configuración encierra *qué*
> puede hacer el SUT, no **dónde** escribe: con el `PWD` heredado, un `write
> src/x.html` acaba en el directorio de quien lanza la suite. El sandbox es `cwd`
> **y** `PWD`. Ver ADR-0019.

Un efecto lateral conocido: sin `shell`, el SUT no puede ejecutar comprobaciones
por línea de órdenes. Medido: `desy-preflight-check` sigue el flujo igual (el
modelo informa de que no tiene shell y responde sobre lo que puede leer). Si un
Caso necesita de verdad `shell` o `npm run build`, se abre esa acción aquí y se
justifica: no se abre por defecto.

## Consecuencias

- Lo que el ADR-0001 fijaba (modelo fijo, sandbox por Ejecución, skills del Pin)
  sigue en pie; lo que cambia es cómo V2 lo hace posible.
- El SUT queda amarrado a la instalación **V2** del binario. V2 y V1 se instalan
  en el mismo comando `opencode`, así que no hay convivencia: correr la suite con
  un `opencode` de V1 fallará al no reconocer `--standalone` como lo espera V2.
- El modelo fijado es el que sirve este agente
  (`deepinfra/deepseek-ai/DeepSeek-V4.1-Flash-1017`). El alias sin sufijo
  (`…-Flash`) resuelve igual, pero no es el que se gradúa.
