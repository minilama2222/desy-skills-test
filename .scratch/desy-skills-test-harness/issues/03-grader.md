# 03: Grader (seam canónico)

**What to build:** El grader es una función pura que, dados `{ artefactos, transcript }`, el Framework de checks de un tipo de Caso y el `checks.json` del Caso, devuelve un Grade (INACEPTABLE / ACEPTABLE / BUENO / EXCELENTE) más el detalle por Check. Sin red ni navegador. Es el seam a través del cual se testean los skills.

**Blocked by:** 01

**Status:** done

- [x] Cualquier Guard que falle fuerza Grade INACEPTABLE
- [x] Los Quality puntúan (con `weight`) hacia ACEPTABLE/BUENO/EXCELENTE
- [x] El grader combina Framework del tipo + checks propios del Caso
- [x] Emite el detalle por Check (pasado/fallado, severidad)
- [x] Tests unitarios densos con fixtures de `{ artefactos, transcript }` escritos a mano
- [x] Los tests no dependen de red ni del modelo

## Comments

Cerrado en la rama de integración `integrate/02-03` (commit `40629b2`). Grader puro en `src/grader.ts` (`grado(evidencia, {tipo, checks})`, `gradoDeEvidencia(evidencia, {tipo, checksJson})`), modelo de Checks y parsing de `checks.json` en `src/caso.ts` con vocabulario del glosario (Caso-componente / Caso-página). Pasó `code-review` (hallazgos corregidos).

