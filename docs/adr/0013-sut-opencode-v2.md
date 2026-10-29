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

## Las credenciales no viajan con el sandbox

Las cuentas conectadas (`opencode auth login`) viven en el directorio de datos
(`auth.json`), que en V2 depende del `HOME`: `~/.local/share/opencode` en Linux y
Windows, y `~/Library/Application Support/opencode` en macOS (macOS **no** mueve
`Application Support` con `HOME`). Con un `HOME` vacío el modelo sale
`Model unavailable`. Como el proveedor `deepinfra` del catálogo no declara
variable de entorno, un `DEEPINFRA_API_KEY` tampoco lo resuelve.

Por eso `configurar()` **copia solo `auth.json`** al sandbox (`SandboxOptions.authOrigen`,
por defecto el del `HOME` real; `homeReal` permite sustituirlo en tests). No entra
ningún otro estado del usuario: ni sesiones, ni plugins, ni skills, ni config.
`datosDirDeHome(home, plataforma)` compone la ruta por plataforma —se prueba con
las tres, aunque el CI corra en una— y `entornoDelSandbox` fija además
`OPENCODE_HOME` al directorio de datos del sandbox, para que la base de datos de
sesiones tampoco acabe en la del usuario.

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
