# 11: Bloque C — verificación y orquestación

**What to build:** Casos para los skills de verificación y orquestación: `design-match`, `validate-accessibility`, `styles-reference`, `preflight-check`, `scaffold-project` y `angular-translator`. Los skills cuyo output no es HTML se gradúan con guards de decisión (p. ej. "identificó PROYECTO_NO_EXISTE", "no scaffoldea sin permiso").

**Blocked by:** 05, 08

**Status:** ready-for-agent

- [ ] Caso de `design-match` que valida la clasificación de discrepancias (trivial/afinable/bloqueante)
- [ ] Caso de `validate-accessibility` que valida el checklist sin servidor
- [ ] Caso de `styles-reference` que valida que devuelve la utility exacta y no una de Tailwind por defecto
- [ ] Caso de `preflight-check` con guards de decisión (PROYECTO_NO_EXISTE, librería/versión)
- [ ] Caso de `scaffold-project` con guard "no scaffoldea sin permiso"
- [ ] Caso de `angular-translator` que valida la traducción Nunjucks → Angular de un componente validado

