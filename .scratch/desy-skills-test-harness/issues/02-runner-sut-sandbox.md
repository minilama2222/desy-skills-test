# 02: Runner del SUT + sandbox

**What to build:** Dado un Caso y un Pin, el runner devuelve `{ artefactos, transcript }` ejecutando el SUT (`opencode run` no-interactivo, modelo fijo) dentro de un sandbox con `HOME`/config temporal y working dir limpio, sin tocar la instalación real de skills. Es un adapter por debajo del grader.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] El runner crea un sandbox aislado (`HOME`/config temporal) por Ejecución
- [ ] Copia los skills del Pin a ese sandbox y lanza `opencode run` con el modelo fijado
- [ ] Devuelve `{ artefactos, transcript }` con forma estable
- [ ] Smoke test de integración: un Caso trivial produce artefactos y transcript
- [ ] El sandbox se limpia y no altera la instalación real de skills

