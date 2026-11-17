# 15: El SUT no resuelve el modelo en un sandbox limpio (2.2.1)

**What to build:** Que `npm run suite` corra el SUT real en una máquina recién
preparada, sin copiar la base de datos del mantenedor ni exponer su estado. Hoy,
con el `auth.json` que el sandbox ya copia, el SUT sale con
`Model unavailable: deepinfra/deepseek-ai/DeepSeek-V4.1-Flash-1017`.

**Blocked by:** —

**Status:** needs-info
**Status depende de:** la credencial que usa el mantenedor en Windows (ver
«Lo que falta para construir esto»). Las casillas se quedan abiertas a propósito:
el criterio depende de un dato que no está medido.

## El hallazgo, medido

Máquina: macOS, `opencode v2.2.1` (Homebrew). Scaffold cacheado en `37748bd` y
`npm run precommit` en verde (50 ficheros, 748 tests).

`npm run suite -- --skill implement-component --case boton-primario --n 1` corre,
pero las dos Ejecuciones salen `exit 1` con, por stderr:

```
Error: Model unavailable: deepinfra/deepseek-ai/DeepSeek-V4.1-Flash-1017
```

El veredicto `INDETERMINADO` es correcto por la regla (ticket 03, ADR-0014): no
hubo entregas. Lo que el veredicto no dice es que **el SUT ni arrancó**, y el
informe por Caso sí lo dice (`exit 1`, «crasheó», «no invocó ningún skill»): el
ticket 02 haciendo su trabajo.

### Qué falta y dónde está

Bisección sobre un `HOME` temporal, con `opencode models --standalone`:

| Qué se copia al `HOME` del sandbox | ¿Aparece `deepinfra`? |
|---|---|
| `auth.json` | **no** (solo `opencode/*`, 8 modelos) |
| `auth.json` + `~/.cache/opencode/models.json` | no |
| `auth.json` + `~/.local/share/opencode/opencode.db` | **sí** |
| `~/.local` + `~/.cache` + `~/.config` enteros | sí |

El catálogo de proveedores resuelto vive en `opencode.db`, tabla `kv`, clave
`models-dev:v2:catalog` (12,7 MB de JSON): la 2.2.1 lo lee de la base de datos,
no de `~/.cache/opencode/models.json`.

**El ADR-0013 dice que basta con `auth.json`, y eso ya no es cierto.** También
dice que «un `DEEPINFRA_API_KEY` tampoco lo resuelve», y con la 2.2.1 no se
comprobó: lo que sí se comprobó es que con `auth.json` solo, el catálogo no
incluye `deepinfra`.

### Una pista que no está confirmada

En el catálogo de la 2.2.1, el modelo fijo aparece bajo el proveedor **`edenai`**
(`env: ["EDENAI_API_KEY"]`), no bajo un proveedor `deepinfra`; hay otros
proveedores (`llmgateway`, `merge-gateway`) que exponen modelos con prefijo
`deepinfra/`. Declarar `providers.deepinfra` en el `opencode.jsonc` del sandbox
dio `missing API key` en todas las pruebas, y `EDENAI_API_KEY=x` no cambió el
`Model unavailable`.

**Esto no es una hipótesis verificada**: son dos observaciones que apuntan a que
el prefijo `deepinfra/` del modelo fijo y el proveedor que lo sirve no coinciden
en la 2.2.1. Quien tome el ticket empieza por aquí.

## Lo que este ticket NO cierra

- **Copiar `opencode.db` al sandbox.** Funciona, y es la vía que el ADR-0013
  prohíbe en su propio texto («ni sesiones, ni plugins, ni skills, ni config»):
  la base de datos lleva las sesiones y mensajes del mantenedor —y, medido,
  credenciales en claro en la tabla `credential`—, y son 794 MB por Ejecución.

- **Cambiar `MODELO_DEL_SUT`.** Afecta a comparabilidad (ADR-0001/0013) y no es
  un atajo para este problema.

## Lo que falta para construir esto

Un dato que solo tiene el mantenedor: **con qué credencial corrió el SUT en
Windows**, donde la suite sí midió. Si allí había un `auth.json` con una entrada
que aquí no existe, o una variable de entorno exportada, el arreglo es declarar
esa misma en el sandbox y el resto del ticket se escribe con la medida delante.

## Verificación esperada

- `npm run suite -- --skill implement-component --case boton-primario --n 1` en
  un `HOME` sin `opencode.db` llega a `exit 0` del SUT y da `PASA` o
  `SUSPENDE`, nunca `INDETERMINADO` por crash.
- Un test fija la regla: con el `auth.json` de un usuario y **sin** su base de
  datos, el sandbox resuelve `MODELO_FIJO` (hoy no lo hace, y por eso el test
  empieza en rojo).
- El ADR-0013 y `reports/legado/README.md` dejan de afirmar que `auth.json`
  basta.
