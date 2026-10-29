# 05: Pin local declarado como «local (sin commit)»

**What to build:** Que el runner pueda tomar los skills de un checkout local (fuera de `vendor/`) para iterar sin re-pinear por cada frase, y que el informe lo **declare** en lugar de fingir un commit.

**Blocked by:** 04

**Status:** ready-for-agent

- [ ] El runner acepta una ruta de skills local (opción de CLI o config; no editar `vendor/`)
- [ ] El scorecard marca esa corrida como `local (sin commit)` en JSON y en el H1 del Markdown
- [ ] Con un checkout local **no** se puede producir un scorecard que declare un commit
- [ ] Un `bump-pin` sin cambios no destruye nada del usuario: el flujo local nunca escribe en `vendor/`
- [ ] Tests: pin remoto ⇒ commit declarado; pin local ⇒ `local`; árbol local sucio ⇒ mismo guardarraíl del 04

## Notas

Canónico sigue siendo upstream por SHA (ADR-0003): el modo local es **comodidad declarada**, no una segunda vía de verdad. Con el hash del 04, una corrida local es perfectamente reportable y diffable.
