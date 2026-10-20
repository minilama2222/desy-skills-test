# 14: Capa nightly opcional (axe-core + comparación pixel)

**What to build:** Fuera del bucle estable, una capa opcional que ejecuta axe-core sobre la página generada servida y comparación visual pixel-a-pixel contra el Gold-imagen. No forma parte del Grade de v1; corre como job aparte.

**Blocked by:** 08

**Status:** ready-for-agent

- [ ] Un job aparte levanta un server y corre axe-core sobre la página generada
- [ ] La comparación visual contra el Gold-imagen usa tolerancia y clasifica diferencias
- [ ] Esta capa no afecta al exit code de la suite estable
- [ ] Documentado cómo lanzarla
- [ ] Los resultados se adjuntan al reporte como sección separada

