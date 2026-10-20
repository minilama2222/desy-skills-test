# 01: Andamiaje del repo de test

**What to build:** El repo `desy-skills-test` queda montado: proyecto Node + TypeScript + vitest, con el Pin de desy-skills elegido y copiado a `vendor/desy-skills/`, registrado en `pin.json`, y los scripts `run`/`grade`/`bump-pin`/`report` disponibles. Al terminar, un `npm test` corre (en vacío) y `pin.json` declara el commit testeado.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Proyecto Node+TS+vitest inicializado y `npm test` ejecuta sin error
- [ ] `vendor/desy-skills/` contiene la copia de los 12 skills del Pin elegido
- [ ] `pin.json` registra `{ ref, commit, fecha }` y el reporte puede leerlo
- [ ] Script `bump-pin <ref>` actualiza vendor + pin.json manualmente
- [ ] Scripts `run`, `grade` y `report` existen (aunque sea como stubs)

