# 09: Bloque A — reconocimiento y elección

**What to build:** Casos para los skills de la capa de reconocimiento y elección: `component-recognizer` (con verificación contra el linter del catálogo), `choose-page-template` y `choose-library`. Cubren que el agente identifique componentes/variantes y elija librería y plantilla correctas.

**Blocked by:** 05, 08

**Status:** ready-for-agent

- [ ] Caso de `component-recognizer` que valida las identificaciones contra el catálogo/linter
- [ ] Caso de `choose-page-template` que valida la plantilla elegida por familia, no por cabecera visible
- [ ] Caso de `choose-library` que valida la recomendación de librería según caso de uso
- [ ] Cada Caso declara sus guards y quality en `checks.json`
- [ ] Hay al menos un guard por Caso que hunda el Grade si la decisión es claramente errónea

