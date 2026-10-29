# 10: Archivo de legado fuera del mecanismo de comparación

**What to build:** Conservar la evidencia anterior a la regla nueva en `reports/legado/`, con la regla de medición declarada en la cabecera, y sin que entre nunca en un diff.

**Blocked by:** 05, 09

**Status:** ready-for-agent

- [ ] `reports/legado/` con los ficheros previos (`reports/suite/scorecard.*`, `reports/estabilidad-v2/*`, las notas del 27/10 que se quieran conservar)
- [ ] Cada fichero lleva en cabecera con qué regla se midió
- [ ] `diff-versiones` no lo lee; un test lo comprueba
- [ ] El README de `reports/legado/` explica qué es y que su SUSPENDE no significa lo que significa hoy

## Política

Se conserva el **porqué** (los dos HALLAZGOS, la tasa de entrega medida), no el **qué** (los veredictos viejos). El diff arranca vacío en la primera corrida con la regla nueva.
