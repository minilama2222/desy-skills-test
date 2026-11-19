# 11: Documentar el bucle y su vocabulario

**What to build:** Que el flujo de trabajo sea explicable sin esta conversación: README, GLOSSARY y la plantilla de Petición.

**Blocked by:** 01, 02, 03, 04, 05, 06, 07, 08, 09, 10

**Status:** done

- [x] `GLOSSARY.md` gana: Petición, Versión de skills, Presupuesto de intentos, PASA sostenido, Legado, árbolHash — cada uno con su `_Avoid_`
- [x] `README.md` explica el bucle: editar → checklist → run → informe → decidir → suite → cerrar Pin → petición
- [x] `.scratch/bucle-de-refinamiento/peticiones/_plantilla.md` existe y está enlazada desde el README
- [x] Se documenta el flujo manual (qué hace la persona y qué el agente) paso a paso
- [x] `npm run verificar-readme` sigue pasando

## Notas de implementación

- **Cinco de los seis términos ya estaban** (`Versión de skills`, `Presupuesto de
  intentos`, `PASA sostenido`, `Legado`, y `arbolHash` vivía como una frase dentro
  de `Pin`/`Versión de skills`). Faltaban `Petición` y `Bucle de refinamiento`; el
  segundo no estaba en la casilla y sin él el vocabulario no nombra el ciclo. Se
  añadieron también `Contexto limpio`, que es la razón de ser del ticket, y las dos
  entradas que se quedaban cortas se completaron: `arbolHash` pasa a término propio
  (con el fichero que lo calcula) y `PASA sostenido` dice que **lo lee la persona**.
- **`Petición` se documenta, pero no se finge validada.** El ticket pedía el término
  y nada más; lo que no existía —ni existe— es un validador de peticiones, ni el
  cierre automático que la spec describe. El glosario lo dice con esas palabras, y
  la spec lleva la nota de que su «ADR-0017» no se escribió: el acuerdo vigente es
  `refinar-skill`.
- **El flujo manual es una tabla de seis pasos**, con la columna «la persona» y la
  del agente separadas, los gates marcados, y dónde queda cada cosa. No repite
  `FASES.md`: lo enlaza. El mapa y las fases son dos cosas distintas, y copiar el
  segundo al primero hace que uno de los dos envejezca.
- **Dos correcciones de prosa que el ticket no pedía**, decididas antes de escribir:
  la consecuencia del ADR-0016 decía que `pasaSostenido` «ya tiene de dónde leer
  las dos corridas» y lo cierto es que **nadie la llama desde `src/`**; y la spec
  citaba un ADR-0017 inexistente. Hacer que `diff-versiones` diga «refinado» es
  trabajo aparte, no de este ticket; aquí solo se deja de prometer que se hace.
- **Hallazgo, arreglado aquí: los enlaces de la prosa no los miraba nadie.**
  Documentar el bucle añadía enlaces a `refinar-skill`, a la plantilla de Petición
  y a la spec, y una ruta movida dejaba un enlace muerto en la puerta de entrada en
  verde. `verificar-readme` gana `problemasDeEnlaces` (puro, con el FS en el
  adaptador): comprueba que la **ruta** existe, no su ancla `#…` —una sección
  renombrada es juicio, no mecánica—. Cubre `README.md`, `GLOSSARY.md` y
  `AGENTS.md`, que son los tres documentos donde un enlace roto duele. Comprobado con
  un roto real en el README y en el glosario: `exit 1`.
- **La revisión de código cazó tres cosas de ese guardarraíl**, y están corregidas:
  la regex exigía `)` final y se comía el último carácter de la ruta; el adaptador
  hacía `decodeURIComponent` y una ruta con `%` mal formado **mataba el script con
  `URIError`** (ahora es un hallazgo, con su test); y el script re-implementaba la
  regex con otra variante, que ya había divergido. La regla vive en un sitio y el
  script pregunta al FS.
- **Dos afirmaciones mías no aguantaron la revisión de Spec**, y se corrigieron: dije
  que el `arbolHash` era el guardarraíl del `vendor/` (es el de árbol **sucio**, con
  `git status`; el hash nombra lo medido, no lo valida) y describí el fichero de
  ciclo como si existiera (`ciclos/` aún no está: el agente lo **crea**). Se quitó
  además `Contexto limpio`: era vocabulario sin respaldo en el ticket ni en la spec.
- **El README había dejado de nombrar el bucle**: solo enlazaba el tracker del
  harness. Ahora lo enlaza en el índice y la sección está antes del tier rápido.
- `AGENTS.md` gana una sección corta: el mapa está en el README, las fases en
  `refinar-skill`, y nada valida una Petición.
