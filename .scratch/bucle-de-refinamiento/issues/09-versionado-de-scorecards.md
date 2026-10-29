# 09: Versionado de scorecards y diff entre versiones

**What to build:** Que dos versiones de los skills se puedan comparar sin inventar infraestructura: un scorecard pequeño por versión, versionado, y un diff.

**Blocked by:** 01, 04

**Status:** needs-triage

- [ ] Cada `suite` escribe `reports/versiones/<arbolHash>.json` (scorecard completo, con pin y hash)
- [ ] `reports/` sigue ignorado salvo ese subdirectorio: ajustar `.gitignore` con una excepción explícita
- [ ] Un comando `npm run diff-versiones <a> <b>` produce, por Caso y por Skill, el cambio de veredicto y de correctas/entregó-mal/sin-entregar
- [ ] `npm run report` deja de re-etiquetar: toma el `pin` de cada Ejecución
- [ ] El diff empieza vacío: si no hay dos versiones, el comando lo dice y sale limpio
- [ ] Tests de forma del scorecard de versión y del diff (puro, sobre dos JSON de fixture)

## Por qué

`reports/` está en `.gitignore:2` y cada suite **vacía** `reports/suite/ejecuciones` (`src/cli.ts:158`). La user story 4 de la spec del harness pide comparar versiones y no existe: `grep` de diff/baseline en `src/` no encuentra nada.
