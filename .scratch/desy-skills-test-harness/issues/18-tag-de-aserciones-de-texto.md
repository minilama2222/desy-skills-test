# 18: Un test que afirma sobre texto dice si el texto es prosa o salida del código

**What to build:** Que `npm run verificar-tests` cace una aserción sobre texto
que no declare de dónde sale el texto: `// prosa:` si es el contenido que importa,
`// decisión:` si lo produce el código y la aserción fija esa decisión.

**Blocked by:** —

**Status:** ready-for-human
**Status depende de:** el alcance depende de una medición pendiente (abajo); la
decisión de si la regla cubre toda la suite o solo los tests nuevos es del humano

- [ ] El guardarraíl `asercionesDeTextoSinTag` existe y tiene control positivo y
      negativo (un fichero con tag pasa, sin tag no)
- [ ] Está cableado en `scripts/verificar-tests.ts`
- [ ] La suite entera pasa con la regla activa, o los ficheros sin tag están
      enumerados con motivo
- [ ] `npm test` y `npm run precommit` en verde

## Por qué existe

La revisión de código del diff `465a071...HEAD` encontró cuatro tests cuyos
`toContain` buscaban cadenas que el propio código emite **sin condición**: verde
pasara lo que pasara (`test/anclaje-perdidas.test.ts` con `"1 sección/es"` y
`"fixture"` son los ejemplos). El estándar ya lo dice
(`CODING_STANDARDS.md` §"A test of a 'must not'… Check it goes red first"), pero
nadie lo mira: es un juicio que ningún tooling aplicaba y que los revisores
tampoco vieron en los cuatro tests nuevos.

La mitad mecánica posible no es «este test muerde» —eso no se decide sin revertir
el código— sino «este test dice por qué ese texto importa». Un test que no puede
escribir el tag en una línea es ya sospechoso: no sabe si afirma prosa o salida.

## Cómo resolverlo

1. **Mide el alcance antes de escribir la regla.** `grep -c "toContain\|toMatch("`
   sobre `test/` da la cifra; hoy son **39 de 56 ficheros** con al menos una
   aserción sobre texto. Muchos afirman sobre líneas de un informe o un scorecard,
   que es legítimo; el tag los deja pasar, pero exige tocarlos **todos**.
2. Decide el alcance con esa cifra delante: (a) toda la suite, con un commit de
   tags mecánico revisado a mano, o (b) solo los ficheros que añade el diff, con
   una lista exenta que crezca al mismo ritmo que la suite.
3. Escribe la regla y su control positivo/negativo, y cablédala.

## Notas

- **No la escribió el retro del 12.** Se intentó y se descartó al medir: son ~200
  aserciones de texto en 39 ficheros, sin distinguir las legítimas de las que
  reafirman la implementación. Meter eso en el commit del retro habría sumado
  ruido a un cambio que ya toca el gate.
- **El tell de la regla**: un `toContain` de una cadena que aparece en el `push`
  de la misma función es reafirmación, no comprobación. Es lo que el revisor debe
  mirar en cada tag `// decisión:`.
