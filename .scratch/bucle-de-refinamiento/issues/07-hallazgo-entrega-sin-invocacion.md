# 07: Destacar la entrega correcta que no invocó el skill

**What to build:** Cuando una Ejecución entrega un Artefacto correcto **sin** invocar el skill bajo test, el informe lo destaca como hallazgo de **trigger** (frontmatter/descripción), no lo entierra.

**Blocked by:** 06

**Status:** needs-triage

- [ ] La condición es `entrega === "con-artefacto"` y `grade === EXCELENTE` y `flujoAlcanzoSkill === false`
- [ ] El hallazgo aparece en lo alto del informe del Caso y en la cabecera del scorecard
- [ ] El veredicto sigue descartando esa Ejecución como dato (no se convierte en PASA), pero la evidencia no se pierde
- [ ] Test con el caso real del 27/10 (`HALLAZGO-tokens-fichero-de-ejemplo.md:140-153`)

## Por qué

El 27/10 la única entrega EXCELENTE de la corrida se descartó porque el agente nunca invocó el skill: escribió el fichero correcto sin leerlo. Eso es un problema de **descripción de trigger** y es información sobre el skill, no ruido. Hoy el scorecard lo tira a la basura.
