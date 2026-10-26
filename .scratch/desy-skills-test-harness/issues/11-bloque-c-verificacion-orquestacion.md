# 11: Bloque C — verificación y orquestación

**What to build:** Casos para los skills de verificación y orquestación: `design-match`, `validate-accessibility`, `styles-reference`, `preflight-check`, `scaffold-project` y `angular-translator`. Los skills cuyo output no es HTML se gradúan con guards de decisión (p. ej. "identificó PROYECTO_NO_EXISTE", "no scaffoldea sin permiso").

**Blocked by:** 05, 08

**Status:** done

- [x] Caso de `design-match` que valida la clasificación de discrepancias (trivial/afinable/bloqueante)
- [x] Caso de `validate-accessibility` que valida el checklist sin servidor
- [x] Caso de `styles-reference` que valida que devuelve la utility exacta y no una de Tailwind por defecto
- [x] Caso de `preflight-check` con guards de decisión (PROYECTO_NO_EXISTE, librería/versión)
- [x] Caso de `scaffold-project` con guard "no scaffoldea sin permiso"
- [x] Caso de `angular-translator` que valida la traducción Nunjucks → Angular de un componente validado

## Notas de implementación

Siete Casos nuevos (el ticket cubre 6 skills; `preflight-check` lleva **dos**
Casos, uno por cada rama del skill):

| Caso | Tipo | Directorio |
|---|---|---|
| `design-match` / afinado-paso-1 | decisión | `casos/design-match/decision/afinado-paso-1/` |
| `validate-accessibility` / checklist-sin-servidor | decisión | `casos/validate-accessibility/decision/checklist-sin-servidor/` |
| `styles-reference` / token-espaciado | decisión | `casos/styles-reference/decision/token-espaciado/` |
| `preflight-check` / proyecto-no-existe | decisión | `casos/preflight-check/decision/proyecto-no-existe/` |
| `preflight-check` / proyecto-ok-libreria-version | decisión | `casos/preflight-check/decision/proyecto-ok-libreria-version/` |
| `scaffold-project` / no-scaffoldea-sin-permiso | decisión | `casos/scaffold-project/decision/no-scaffoldea-sin-permiso/` |
| `angular-translator` / boton-primario-angular | componente | `casos/angular-translator/componente/boton-primario-angular/` |

Cinco skills producen **texto** (una tabla, un informe, una recomendación), así
que son **Caso-decisión** (artefacto = el texto del SUT, Framework de checks
vacío). `angular-translator` produce **código**, así que es **Caso-componente**
(artefacto = el fuente que el SUT escribe en `src/`, como el Bloque B).

### Dos asserts nuevos (sobre los de decisión existentes)

Los guards que el ticket nombra —«no scaffoldea sin permiso»— y los hechos de un
informe de a11y no eran expresables con `declara_decision` / `no_declara_decision`
/ `reconoce_componente`. Se añaden dos **asserts de decisión**, con la regla de
`CODING_STANDARDS.md` («el Guard es la declaración positiva») presente:

- **`no_declara_ejecucion`** (`src/caso.ts` + `src/grader.ts`): el SUT **no
  declara haber ejecutado** una acción. Distingue la **plantilla** (mostrar
  `git clone` para que lo corra el usuario) de la **ejecución** (reclamar «he
  clonado»). Falla sólo ante una reclamación en **pasado**; el texto español se
  busca **crudo** porque el pretérito lleva tilde (`cloné`) y el imperativo no
  (`clone`), y la normalización los confundiría. Es el Guard de
  `scaffold-project`.
- **`declara_fallo`** (`src/caso.ts` + `src/grader.ts`): el SUT declara el
  **veredicto** de un hecho **en la misma línea** que lo nombra. Sin
  `veredicto`, basta un marcador de fallo (el informe de a11y: «skip-link:
  ausente → FALLA»); con `veredicto`, se exige ese veredicto concreto (la
  categoría de una discrepancia: «h1.mb … bloqueante»). Evita que un «check OK»
  pase por una línea que no declara el hallazgo.

Los demás no-negociables del Bloque C **no** son Guards frágiles: donde el SUT
puede *nombrar* el valor prohibido al descartarlo (`p-4`, `gap-7`, `componentButton`,
`choose-page-template`), el no-declara va como **Quality** (ADR-0011).

### Decisiones tomadas

- **`styles-reference`**: los Quality negativos originales (`no_declara_decision`
  de `gap-7` / `p-[13px]`) se cambiaron por Quality **positivos** (`declara_decision`
  de `1rem` / `gap-base`): el prompt nombra `p-4`/`gap-7`, así que una respuesta
  correcta los repite — un negativo pasaría por construcción. La escala numérica
  se deja como **Quality**, no Guard.
- **`angular-translator`**: el no-declara del macro `componentButton` es
  **Quality**, no Guard: el artefacto es el fuente, y el SUT puede nombrar el
  macro al explicar la equivalencia. El Guard es el selector `desy-button`.
- **`design-match`** (corregido en la review): el Guard es **reportar la fila**
  del elemento (`declara_decision` de `h1.mb` / `lead.mb`); la **categoría**
  (bloqueante) es un **Quality** con `declara_fallo { hecho, veredicto }`. Un
  Guard sobre la categoría era **vocabulario-dependiente** (el skill la escribe
  con emoji, `🔴 bloqueante`), justo lo que `CODING_STANDARDS.md` prohíbe en un
  Guard. El veredicto tolera el **formato** (el emoji del skill vale por su
  palabra) sin aflojar el hecho.

### Verificación

`test/casos-bloque-c.test.ts` (42 tests, un `describe` por Caso, como
`CODING_STANDARDS.md` manda para un Bloque) fija que cada salida dorada da
EXCELENTE y que cada error concreto suspende o baja el Grade — incluidas las
fronteras que distinguen el Guard: «nombrar el check diciendo OK no satisface el
informe», «mostrar el comando no es ejecutarlo», «declarar la categoría solo con
el emoji del skill satisface el Quality». `test/caso-decision.test.ts` (24
tests) cubre los dos asserts nuevos en aislamiento.

Suite completa en verde (454 tests), `tsc --noEmit` limpio, y los guardarraíles
(`verificar-casos`, `verificar-readme`, `verificar-tests`, `verificar-tracker`)
OK. README actualizado a 14 Casos.

### Review (dos ejes)

Pasó `code-review` sobre `10a413e...HEAD` (Standards + Spec, en paralelo). Ambos
ejes coincidieron en un defecto real, **corregido**:

- **Standards**: el rubric de `styles-reference` describía los Quality originales
  (`no-escala-numerica` / `no-valor-arbitrario`) que ya no existían en su
  `checks.json` — violaba «claim only what is built and measured». Reescrito
  para describir los checks reales.
- **Spec**: el Guard de `design-match` exigía la **etiqueta** de categoría
  (`bloqueante`), vocabulario-dependiente. Rehecho: el Guard es reportar la fila;
  la categoría es Quality y tolera el emoji del skill.

Smells de juicio (Duplicated Code en los dos predicados de línea de `grader.ts`;
Primitive Obsession en `accion`/`hecho`) evaluados y **dejados**: el repo no los
prohíbe, el contrato de `declara_decision{valor}` marca el precedente, y extraer
una abstracción para un `split("\n")` sería Generalidad Especulativa.
