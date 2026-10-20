# 04: Soporte de Casos y checks.json + librería de tokens DESY

**What to build:** La carga declarativa de un Caso (carpeta con `input/`, `expected/checks.json`, `rubric.md`), el Framework de checks por tipo de Caso (Caso-componente / Caso-página), y la librería de tokens DESY (escala 8/16/28/32, familias de color, `c-h*`, `c-paragraph-*`) que los checks usan para validar sin inventar valores.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] Se cargan Casos desde su carpeta con `input/`, `expected/checks.json` y `rubric.md`
- [ ] Existen Frameworks de checks base para Caso-componente y Caso-página
- [ ] Los tokens DESY viven en módulo propio y los checks los consultan
- [ ] Un `checks.json` malformado produce un error claro
- [ ] Tests unitarios de la carga y de la combinación Framework+caso

