# 02: Runner del SUT + sandbox

**What to build:** Dado un Caso y un Pin, el runner devuelve `{ artefactos, transcript }` ejecutando el SUT (`opencode run` no-interactivo, modelo fijo) dentro de un sandbox con `HOME`/config temporal y working dir limpio, sin tocar la instalación real de skills. Es un adapter por debajo del grader.

**Blocked by:** 01

**Status:** done

- [x] El runner crea un sandbox aislado (`HOME`/config temporal) por Ejecución
- [x] Copia los skills del Pin a ese sandbox y lanza `opencode run` con el modelo fijado
- [x] Devuelve `{ artefactos, transcript }` con forma estable
- [x] Smoke test de integración: un Caso trivial produce artefactos y transcript
- [x] El sandbox se limpia y no altera la instalación real de skills

## Comments

Cerrado en la rama de integración `integrate/02-03` (commit `40629b2`). Runner en `src/runner.ts` (`runCaso(caso, pin, deps) → Evidencia`), sandbox con `HOME`/`XDG_CONFIG_HOME` temporales y skills copiados a `<HOME>/.config/opencode/skills`; smoke hermético en `test/runner.smoke.test.ts`. Pasó `code-review` (hallazgos corregidos).

