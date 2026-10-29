# 04: Guardarraíl de árbol sucio y hash del árbol de skills

**What to build:** Que el Pin no pueda mentir. `suite` se niega a correr sobre un `vendor/desy-skills/` con cambios sin commitear, y cada scorecard registra un **hash del árbol de skills** que se copió al sandbox; ese hash, no el commit, es la identidad de versión.

**Blocked by:** —

**Status:** needs-triage

- [ ] Regla pura (p. ej. `src/pin-arbol.ts`): dado el listado de ficheros y su contenido, produce el hash, excluyendo `assets/catalog.json`
- [ ] `suite` comprueba `git status --porcelain vendor/desy-skills` antes de empezar y **falla con recado explícito** si hay cambios
- [ ] El scorecard (`scorecard.json` y `.md`) incluye `arbolHash`
- [ ] El hash es estable entre corridas con el mismo árbol e inestable si cambia un byte de un `SKILL.md`
- [ ] Cambiar solo `assets/catalog.json` **no** cambia el hash (test explícito, es la decisión)
- [ ] Guardarraíl cubierto por `scripts/verificar-*` al estilo de los existentes

## Por qué

`runCaso(caso, pin, deps)` recibe el Pin y no lo lee; el commit del informe sale de `pin.json` (`src/ejecutar.ts:82`). Una edición a mano en `vendor/` se mide y se reporta como el commit pinchado. Es el agujero que hace imposible comparar versiones con honestidad.

Se excluye `catalog.json` porque cambia por razones ajenas al texto de los skills y ensuciaría el diff de versiones.
