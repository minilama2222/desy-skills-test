# 03: Presupuesto de intentos hasta la entrega, con tope duro

**What to build:** El presupuesto por Caso es de **entregas**, no de Ejecuciones: se intenta hasta tener `n` entregas o agotar `n * 2` intentos, lo que antes llegue.

**Blocked by:** 01, 02

**Status:** needs-triage

- [ ] `correrCaso` (`src/cli.ts:104-117`) sigue intentando mientras no haya `n` entregas y queden intentos
- [ ] Tope duro configurable, por defecto `n * 2`; al agotarlo se para y el veredicto lo refleja (cero entregas ⇒ INDETERMINADO)
- [ ] El scorecard muestra intentos usados además de entregas
- [ ] Tests con `CommandRunner` inyectado: entrega a la primera (1 intento), entrega a la tercera, nunca entrega y topa
- [ ] Un test que toca un proceso real, si hace falta, lleva su presupuesto de tiempo medido en comentario

## Rechazado a propósito

- **Nudge en el prompt** (recordar «escribe el fichero» al final): haría que el Caso mida un prompt inventado, no el skill.
- **Cambiar de modelo o variante**: rompe la comparabilidad (ADR-0001, ADR-0013).
