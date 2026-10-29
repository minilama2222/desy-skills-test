# 01: Veredicto sobre entregas y PASA sostenido

**What to build:** El veredicto de un Caso se calcula sobre las Ejecuciones que **entregaron** Artefacto, no sobre todas las que alcanzaron el skill. Cero entregas ⇒ **INDETERMINADO**, nunca SUSPENDE. Entregar-mal sigue siendo SUSPENDE. Y el criterio de cierre del bucle («refinado») es **PASA sostenido**: dos corridas consecutivas PASA.

**Blocked by:** —

**Status:** done

- [x] `veredictoDe` cuenta solo `entrega === "con-artefacto"` en el denominador de decisión
- [x] 0 entregas ⇒ `INDETERMINADO`; ≥1 entrega y ninguna correcta ⇒ `SUSPENDE`; alguna correcta ⇒ `PASA`
- [x] `sin-artefacto` sigue contándose y mostrándose en el scorecard (no desaparece, solo no condena)
- [x] Un predicado puro `pasaSostenido(ultima, anterior)` con el criterio de dos corridas consecutivas
- [x] Tests de borde: 0/1/3 entregas, todas mal, una bien, entrega en la primera y no en la segunda

## Notas de implementación

- **ADR-0014 escrito antes del código** (`docs/adr/0014-veredicto-sobre-las-entregas.md`),
  y el ADR-0007 enmendado con una sección que remite al nuevo: el 0007 ya descartó
  «pasar sin descartar los no-arranques», así que la extensión a los no-entregas
  tenía que declararse como ampliación, no como contradicción silenciosa.
- `entregadasDe` filtra sobre `conDatoDe`, no sobre la lista cruda: los dos
  descartes se componen y ninguno re-mezcla el eje que separó el ticket 15.
- `pasaSostenido` recibe **veredictos**, no Ejecuciones, y mira sólo las dos
  últimas. INDETERMINADO no es un aprobado blando: `PASA, INDETERMINADO` no cierra.
- **Una predicción mía falló y el código estaba bien.** Anticipé que
  `suite-cli.test.ts` cambiaría de expectativa; no cambió, porque ese test entrega
  **tres artefactos malos**, no cero. Mi aviso era impreciso. Pero al mirarlo apareció
  un hueco real: ningún test de la CLI fijaba «cero entregas ⇒ exit 0 e
  INDETERMINADO», que es justo lo que el ADR cambia. Se añadió uno.
- **El hueco estaba también en el scorecard**: ninguno de los 20 tests existentes
  fijaba «alcanzó el skill, no entregó, sin entregas correctas ⇒ SUSPENDE», que es el
  comportamiento que este ticket cambia. Lo llena `test/caso-veredicto-entregas.test.ts`.
- GLOSSARY (`Veredicto de un Caso`, y entrada nueva `PASA sostenido`) y README
  actualizados: describían la política anterior.

## Lo que este ticket NO cierra

`pasaSostenido` ya existe como regla, pero **nadie la llama todavía**: comparar dos
corridas necesita el versionado de scorecards (ticket 09). Hasta entonces el criterio
de cierre se aplica a mano, leyendo dos scorecards.
