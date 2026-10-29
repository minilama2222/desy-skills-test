# 01: Veredicto sobre entregas y PASA sostenido

**What to build:** El veredicto de un Caso se calcula sobre las Ejecuciones que **entregaron** Artefacto, no sobre todas las que alcanzaron el skill. Cero entregas ⇒ **INDETERMINADO**, nunca SUSPENDE. Entregar-mal sigue siendo SUSPENDE. Y el criterio de cierre del bucle («refinado») es **PASA sostenido**: dos corridas consecutivas PASA.

**Blocked by:** —

**Status:** needs-triage

- [ ] `veredictoDe` cuenta solo `entrega === "con-artefacto"` en el denominador de decisión
- [ ] 0 entregas ⇒ `INDETERMINADO`; ≥1 entrega y ninguna correcta ⇒ `SUSPENDE`; alguna correcta ⇒ `PASA`
- [ ] `sin-artefacto` sigue contándose y mostrándose en el scorecard (no desaparece, solo no condena)
- [ ] Un predicado puro `pasaSostenido(ultima, anterior)` con el criterio de dos corridas consecutivas
- [ ] Tests de borde: 0/1/3 entregas, todas mal, una bien, entrega en la primera y no en la segunda

## Por qué cambia un comportamiento fijado antes

ADR-0007 fijó «N Ejecuciones, descarta las que no alcanzan el skill, cualquiera correcta ⇒ PASA». El ticket 15 (`desy-skills-test-harness/issues/15-…`) añadió los dos ejes `entrega` y `flujoAlcanzoSkill`, pero **no** cambió el veredicto: `sin-artefacto` sigue contando en el denominador. Medido en `reports/suite`: 3 intentos, 2 alcanzaron, **0 entregas** ⇒ SUSPENDE. Ese rojo no dice nada del skill.

Este ticket **no reabre** el 15: usa sus campos. Cambia la **política**, y eso se registra en ADR-0014 (añadida a `Blocked by` cuando exista).

## Notas

- El invariante `correctas + entregoMal + sinArtefacto === alcanzaronSkill` (`src/scorecard.ts:124-125`) se mantiene; lo que cambia es cuál de esas cuentas alimenta el veredicto.
- INDETERMINADO ya no bloquea CI (ADR-0012) y hoy el harness admite que «no hay datos de cuántos Casos quedan indeterminados en una suite completa». Este ticket hace ese número medible.
