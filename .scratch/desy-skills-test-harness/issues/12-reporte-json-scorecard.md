# 12: Reporte — JSON + Scorecard

**What to build:** El agregado de Grades por Skill, con el hash del Pin testeado, en JSON (fuente de verdad) y renderizado a un Scorecard legible (tabla por Skill: casos, guards, Grade). El JSON es lo que consume CI.

**Blocked by:** 05

**Status:** ready-for-agent

- [ ] El reporte JSON agrega Grades por Skill e incluye el hash del Pin
- [ ] Se renderiza un Scorecard legible desde ese JSON
- [ ] El Scorecard muestra qué Caso/Check falló sin leer transcripciones
- [ ] El formato JSON es estable y apto para CI
- [ ] Test unitario del agregado a partir de Grades de ejemplo

## Notas

- **Aplicar el ADR-0007 al agregar**: un Caso se corre 3 veces; se descartan las
  Ejecuciones que no alcanzaron el skill (`flujoAlcanzoSkill: false`), y **basta
  con que una** de las que quedan sea correcta. El scorecard debe poder
  representar el tercer estado, **Caso indeterminado** (ninguna Ejecución alcanzó
  el skill), que **no** es un suspenso del skill.
- Los dos ejes del ticket 15 (`entrega`, `flujoAlcanzoSkill`) son lo que hace
  agregable el resultado: sin ellos, «no entregó» y «entregó mal» contarían igual.


