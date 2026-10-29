# 06: Informe por Caso — check, línea del artefacto, sección del skill

**What to build:** Un informe legible por Caso que ponga lado a lado la aserción del Check fallido, la línea del Artefacto que la tumba y la sección del skill que el Caso nombra. **Presenta, no adivina** la culpabilidad.

**Blocked by:** 02, 04

**Status:** needs-triage

- [ ] Cada Caso produce un bloque con: prompt, artefactos entregados, Flujo observado, exit code, y por cada Check ✓/✗ con la línea que falla
- [ ] El Caso puede nombrar la sección del skill de la que depende (campo en el Caso o en `rubric.md`); el informe la cita por **texto**, no por número de línea
- [ ] El informe **no** emite veredicto automático de «culpa del skill» o «culpa del check»
- [ ] Sin invocación del skill no hay sección que citar; el bloque lo dice explícitamente

## Criterio de aceptación

Leyendo solo este informe, alguien que no conoce el harness puede decidir si toca editar el skill o el check.

## Notas

`test/caso-boton-primario-aceptacion.test.ts` y `HALLAZGO-*` tienen el material para la primera versión del informe: son exactamente los documentos que costó escribir a mano.
