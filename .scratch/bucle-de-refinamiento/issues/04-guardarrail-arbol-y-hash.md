# 04: Guardarraíl de árbol sucio y hash del árbol de skills

**What to build:** Que el Pin no pueda mentir. `suite` se niega a correr sobre un `vendor/desy-skills/` con cambios sin commitear, y cada scorecard registra un **hash del árbol de skills** que se copió al sandbox; ese hash, no el commit, es la identidad de versión.

**Blocked by:** —

**Status:** done

- [x] Regla pura (`src/guardarrail-pin.ts`): hash del árbol, excluyendo `assets/catalog.json`
- [x] `suite` comprueba `git status --porcelain vendor/desy-skills` antes de empezar y **falla con recado explícito** si hay cambios
- [x] El scorecard (`scorecard.json` y `.md`) incluye `arbolHash`
- [x] El hash es estable entre corridas con el mismo árbol e inestable si cambia un byte de un `SKILL.md`
- [x] Cambiar solo `assets/catalog.json` **no** cambia el hash (test explícito, es la decisión)
- [x] Guardarraíl cubierto por `scripts/verificar-*` al estilo de los existentes

## Notas de implementación

- **El hash se calcula sobre el árbol copiado al sandbox**, no sobre `vendor/`: si
  la copia y el vendor divergieran, el hash dice la verdad de lo medido.
- **Viaja por la `Evidencia`** (`arbolHash`), igual que el exit code del ticket 02,
  y el orquestador lo copia a `ResultadoEjecucion`. `agregarScorecard` lo recibe
  como tercer argumento; el valor por defecto es `HASH_DESCONOCIDO`
  (`"desconocido"`), no un hash inventado: un scorecard sin hash lo **dice**.
- **Un solo adaptador de git** (`problemasDeVendorSucio`) compartido por
  `npm run suite` y `scripts/verificar-pin.ts`, para no tener dos lecturas del
  mismo hecho.
- La suite comprueba **antes de `vaciarEjecuciones`**: negarse no debe borrar la
  evidencia de la corrida anterior.
- `hashDelArbolDelSandbox` tolera un `skillsDir` inexistente (los dobles de test)
  y hashea el árbol vacío en vez de reventar la Ejecución.
- **Probado en su caso de fallo**, no solo en verde: con un `SKILL.md` modificado,
  `verificar-pin` sale 1 nombrando el fichero y `suite` sale 1 sin gastar ninguna
  corrida. Restaurado después.
- El `test/runner.test.ts` de forma de `Evidencia` volvió a saltar al añadir
  `arbolHash`: actualizada la expectativa, como en el ticket 02.
- +11 tests, 522 en total. `npm run precommit` en verde.

## Lo que este ticket NO cierra

El hash permite comparar versiones, pero `suite` **no verifica todavía que
`vendor/` coincida con el commit de `pin.json`** (no puede: git no dice eso de una
copia sin `.git`). Lo que sí garantiza es que, si el árbol está limpio, el
contenido es el que leyó el runner; y que, si no lo está, no se mide. La
detección de divergencia real (vendor ≠ pin) queda para el ticket 05 con el pin
local declarado.
