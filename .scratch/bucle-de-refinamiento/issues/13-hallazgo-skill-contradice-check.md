# 13: El hallazgo de que el skill contradice un Check se destaca en el informe

**What to build:** Que una contradicción entre lo que un Check mide y lo que dice la
sección del skill que debería respaldarlo se **declare en la rúbrica del Caso** y
aparezca **en la cabecera del informe por Caso** (y del Scorecard), en vez de vivir en
un `## Tensión conocida con el skill` que sólo lee quien ya está trabajando en ese
Caso. Es el mismo género que el hallazgo de trigger del ticket 07: un hecho sobre el
skill que ni es un suspenso del Caso ni un fallo del agente, y que hoy se pierde.

**Blocked by:** 06

**Status:** done

- [x] La rúbrica admite una línea declarativa `- <id-del-check>: <skill> → «<sección>» — el skill dice «<lo que dice>»` bajo un epígrafe propio, y el loader la lee junto a las anclas
- [x] La línea **no** es un ancla: no se confunde con `anclajesDeRubric`, no llena `Check.ancla` y no cambia lo que el informe cita como fuente de la regla
- [x] La sección declarada tiene que existir en ese skill (`npm run verificar-casos`), igual que un ancla: citar una sección fantasma no es un hallazgo, es un error
- [x] El informe por Caso saca el hallazgo a su cabecera, **antes** de la tabla de Ejecuciones, con el Check que lo sufre, el skill, la sección y el texto que contradice
- [x] El Scorecard lo destaca junto al hallazgo de trigger, o en una sección propia de la cabecera: quien lea sólo el Scorecard también lo ve
- [x] Probar con `fieldset-grid-acciones`: declarado el `gap-x-4` frente a `espaciado-del-sistema`, la cabecera lo muestra; sin declarar, no aparece
- [x] Un test que «no aparece si no se declara» lleva su **control positivo** (CODING_STANDARDS): la misma rúbrica, con la línea, sí lo muestra
- [x] `npm test` y `npm run precommit` en verde

## Notas de implementación

- **Lector propio, forma compartida.** `contradiccionesDeRubric` (`src/caso.ts`) lee
  `## El skill contradice este Check` con la forma del ancla hasta la sección y un
  texto tras la flecha; `anclajesDeRubric` exige que la línea **termine** en la
  sección, así que las dos no se pisan (tests en ambos sentidos). La línea sin el
  texto copiado no se lee: le falta el «qué».
- **Las tres decisiones.** (1) Epígrafe `## El skill contradice este Check`, con
  `EPIGRAFE_CONTRADICCIONES`. (2) El `skill` de la línea es el que **contradice**;
  el ancla sigue nombrando al que manda. (3) El texto lo **copia** el autor: ni se
  extrae ni se verifica contra el `SKILL.md` (el sistema no sabe cuál de las tres
  menciones de `gap-x-4` es la que contradice).
- **Viaja en el Caso, no en el Check.** `Caso.contradicciones` es un `Map` id →
  `ContradiccionDeSkill`, hermano de `checks`; el loader lo lee y no toca
  `Check.ancla`.
- **Cabecera en los dos** (`src/informe.ts` y `src/scorecard.ts`): en el informe,
  bajo el H1 y antes del prompt y de la tabla; en el Scorecard, tras el hallazgo de
  trigger. El JSON gana `contradiccionesDe` por Caso (lista, cero nunca ausente).
  `agregarScorecard` recibe un cuarto argumento —`<skill>/<caso>` → contradicciones
  de la rúbrica— que el CLI rellena desde `casos/`: el agregador no lo busca.
- **Guardarraíl sin gate.** `problemasDeContradiccion` sólo juzga lo declarado
  (id en el Caso, skill y sección en el árbol medido); no declarar no es rojo.
- **`fieldset-grid-acciones`** ya no dice «Tensión conocida…» en prosa: declara la
  contradicción y, como su anclaje era prosa de apoyo, gana sus **seis** anclas por
  Check y sale de `PENDIENTES_DE_ANCLAR` (deuda 51 → 50 Checks, 13 → 12 Casos).

## Retro (19/11): lo que la revisión destapó

- **El guion del texto era opcional, y eso fabricaba contradicciones.** La primera
  forma (`→ «sección»` y, si había, un apartado) leía como contradicción cualquier
  línea con la forma del ancla y texto detrás —un ancla mal pegada—, presentando un
  hallazgo que nadie declaró. Ahora el `—` es obligatorio y hay un test que fija que
  la línea sin él no se lee.
- **El `skill` de la línea es el que contradice**, y la nota de implementación lo
  decía; el revisor lo confirmó contra el código. Queda explícito aquí por si alguien
  lee sólo el criterio.
- **`contradiccionesDe` → `contradiccionesDeclaradas`** en el JSON del Scorecard: el
  glosario nombra «Contradicción declarada», y un campo que pierde el «declarada»
  sugiere un hecho inferido (§ «Domain language comes from the glossary»).
- **El test negativo del informe no dobla el mapa a mano**: parsea la **misma**
  rúbrica con y sin la línea (`contradiccionesDeRubric`), para que el «no aparece»
  pruebe la condición y no un informe que no sabe pintar el bloque.
- **Las seis anclas de `fieldset-grid-acciones`** son del ticket 12: se quedan aquí
  porque sin ellas su `espaciado-del-sistema` no cita fuente, pero es trabajo
  heredado, no de este ticket.

## Por qué existe

Salió al revisar el anclaje de `implement-layout-patterns/componente/fieldset-grid-acciones`
(ticket 12). Su Check `espaciado_del_sistema` exige la escala canónica de tokens, y la
sección del skill que le corresponde —«Grid responsivo del formulario»— recomienda
justo lo contrario: `gap-x-4`, tres veces en el mismo `SKILL.md`. La rúbrica del Caso
ya lo declara en prosa («Tensión conocida con el skill») y mide a favor de la
referencia de tokens (`AGENTS.md` § Token authority).

Hoy eso no se ve en ningún documento que lea el **autor del skill**: está enterrado en
la rúbrica del Caso y en una nota del ticket 12. Un autor humano sólo se enteraría si
alguien se lo cuenta. El informe por Caso es el sitio donde ese hecho se presenta en
cada corrida, y es el puente natural hacia una Petición (`docs/adr/0017`).

Esto **no** decide nada solo: presenta la contradicción para que una persona decida si
cambia el skill o el Check. Es la misma regla que ya rige el informe por Caso (ticket
06): «presenta, nunca decide skill-vs-check».

## La forma de la declaración

Bajo un epígrafe propio de la rúbrica, una línea por Check contradicho. Prosa, como la
del ancla, y por la misma razón: la escribe una persona tras leer el `SKILL.md`, y un
parser no puede deducir que dos textos se contradicen.

```markdown
## El skill contradice este Check

- espaciado-del-sistema: desy-styles-reference → «Espaciado (escala de tokens del proyecto)» — el skill dice «`gap-x-4`»; el Check exige `gap-x-base`
```

Tres decisiones a cerrar al construirlo, y ninguna se adivina:

1. **El epígrafe.** El ticket nombra uno; si el parser de `anclajesDeRubric`
   (`src/caso.ts`) ya tiene una convención para «leer líneas de la rúbrica», esta la
   sigue. No crear un segundo dialecto para la misma forma `- id: skill → «sección»`.
2. **El `skill` de la línea.** ¿Es el que manda (el que el Check toma como autoridad) o
   el que contradice? En el ejemplo de `fieldset-grid-acciones` **son distintos**
   (`desy-styles-reference` manda, `desy-implement-layout-patterns` contradice), y el
   hallazgo necesita nombrar al que contradice para que su autor lo vea. Si hacen falta
   los dos, la forma de la línea cambia y hay que escribirlo aquí antes de programar.
3. **El texto que contradice.** ¿Lo copia el autor («`gap-x-4`») o el sistema extrae
   la línea de la sección? Copiarlo es declarar; extraerlo es inferir, y el sistema no
   sabe cuál de las tres menciones es la que contradice.

## Lo que este ticket NO hace

- **No es un gate.** Un Caso sin contradicción declarada no falla: la contradicción es
  deuda de juicio, como lo eran los anclajes del ticket 12, y no se puede exigir de
  forma determinista.
- **No abre la Petición a `desy-skills`.** Eso se decide cuando alguien lea el hallazgo
  en el informe; la Petición (ADR-0017) va después, con su evidencia, su sección
  causante y su criterio de validación.
- **No cambia el veredicto.** Un Check contradicho sigue midiendo lo que mide; lo que
  cambia es que el desacuerdo se ve.

## Relación con los demás tickets

- **06**: el informe por Caso y el mapa `Check.ancla`. Este reusa su lector; no lo
  sustituye.
- **07**: el hallazgo de trigger. La cabecera del Scorecard ya tiene un sitio para un
  hallazgo; esto sigue esa forma.
- **12**: la nota de `fieldset-grid-acciones` apunta aquí (es su «ticket 13»).
- **08**: el tier rápido compara el texto del skill con lo que el Caso afirma. Comparte
  la regla de «lo que no cuadra se dice, no se bloquea», pero el tier rápido mira el
  texto del skill y este mira el desacuerdo con un Check concreto.
