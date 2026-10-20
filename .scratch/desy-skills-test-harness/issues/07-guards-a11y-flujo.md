# 07: Guards de a11y + comparación de Flujo

**What to build:** Los guards deterministas de accesibilidad sobre el HTML generado (un solo `h1`, `fieldset`+`legend`, skip-link, labels visibles) y la comparación del Flujo observado (transcript) contra el Flujo canónico. Sin navegador.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] Guards que detectan un `h1` duplicado, fieldset sin legend, skip-link ausente y label no visible
- [ ] El transcript se parsea y produce la secuencia de Invocaciones (Flujo observado)
- [ ] Se compara Flujo observado contra Flujo canónico y falla si se salta un paso obligatorio
- [ ] Estos guards se integran en el Framework de Caso-página
- [ ] Tests unitarios con HTML y transcripts de ejemplo

