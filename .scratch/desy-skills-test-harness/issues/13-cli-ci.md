# 13: CLI + salida apta para CI

**What to build:** El cierre de la Fase 4: una CLI que corre la suite entera, emite el JSON y el Scorecard, y devuelve un exit code que bloquea el merge si algún Caso es INACEPTABLE. Con todos los bloques cubiertos, `npm test` ejecuta la suite completa.

**Blocked by:** 12, 09, 10, 11

**Status:** ready-for-agent

- [ ] Un comando corre todos los Casos y produce JSON + Scorecard
- [ ] El exit code es distinto de cero si algún Caso es INACEPTABLE
- [ ] Se puede correr un subconjunto por skill o por Caso
- [ ] El reporte declara siempre el Pin testeado
- [ ] Documentado en README cómo correr la suite localmente

