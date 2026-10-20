# 05: Slice 1 — Caso-componente implement-component (botón primario)

**What to build:** El primer camino vertical completo y demostrable: un Caso-componente que pide "genera un botón primario tamaño estándar con texto 'Enviar'" y se evalúa de punta a punta (runner → grader → Grade). Al terminar, `npm run run -- --skill implement-component --case boton-primario` produce un JSON con la secuencia de skills invocados y el Grade.

**Blocked by:** 02, 04

**Status:** ready-for-agent

- [ ] Existe el Caso-componente con su `input/`, `expected/checks.json` y `rubric.md`
- [ ] Guards: existe la llamada a `componentButton`, usa la variante primaria, sin props inventados
- [ ] Quality: usa la utility de tamaño correcta
- [ ] El JSON de salida reporta Flujo observado y Grade
- [ ] El resultado es estable entre Ejecuciones repetidas

