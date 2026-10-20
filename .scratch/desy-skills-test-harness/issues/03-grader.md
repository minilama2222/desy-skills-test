# 03: Grader (seam canónico)

**What to build:** El grader es una función pura que, dados `{ artefactos, transcript }`, el Framework de checks de un tipo de Caso y el `checks.json` del Caso, devuelve un Grade (INACEPTABLE / ACEPTABLE / BUENO / EXCELENTE) más el detalle por Check. Sin red ni navegador. Es el seam a través del cual se testean los skills.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Cualquier Guard que falle fuerza Grade INACEPTABLE
- [ ] Los Quality puntúan (con `weight`) hacia ACEPTABLE/BUENO/EXCELENTE
- [ ] El grader combina Framework del tipo + checks propios del Caso
- [ ] Emite el detalle por Check (pasado/fallado, severidad)
- [ ] Tests unitarios densos con fixtures de `{ artefactos, transcript }` escritos a mano
- [ ] Los tests no dependen de red ni del modelo

