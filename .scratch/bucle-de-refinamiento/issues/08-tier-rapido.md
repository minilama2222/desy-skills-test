# 08: Tier rápido — replay del grader y checklist skill → Casos

**What to build:** Dos artefactos baratos que contestan preguntas distintas: (a) «¿derivó el grader?», (b) «¿qué Casos dependen de lo que acabo de editar?».

**Blocked by:** 04

**Status:** needs-triage

- [ ] (a) Replay: los artefactos de una Ejecución commiteada pasan por `grader.ts` y dan el mismo Grade (un `scripts/`, no un test de `test/`)
- [ ] (b) Checklist: para cada Caso, las afirmaciones sobre el contenido de `SKILL.md` de las que depende
- [ ] (b) dice **qué Casos re-correr** tras editar una sección, sin bloquear
- [ ] (b) incluye al menos: tabla de tokens de `desy-styles-reference`, el `gap-x-4` legacy de `implement-layout-patterns`, y la instrucción de copiar la página de prueba
- [ ] Los dos se lanzan con `npm run` y acaban en segundos
- [ ] Ninguno abre navegador ni proceso externo (cumple `verificar-tests` si vive en `test/`; prefiere `scripts/`)

## Notas

(a) y (b) **no** son lo mismo: (a) protege el grader, (b) detecta que el skill se ha movido de debajo del Caso. (b) fallará cada vez que se mejore un skill legítimamente: es una checklist, no un gate. Nunca en `precommit`.
