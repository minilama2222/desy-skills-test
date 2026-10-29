# Pin local: medir un checkout del usuario, declarado como `local (sin commit)`

Un bucle de refinamiento exige correr el mismo Caso contra el texto de un skill
que el mantenedor **acaba de editar**. Hoy eso ocurre en `vendor/desy-skills/`
—una copia—, sobre la que las reglas del repo prohíben escribir: un árbol vendido
sucio miente sobre el Pin (ADR-0003, ticket 04). Y `npm run bump-pin` no sirve
para iterar: reescribe `vendor/` entero y mueve el Pin a un ref publicado, así que
cada frase editada costaría un commit upstream.

El ticket 05 añade una forma **declarada** de medir otra cosa: `--skills-local
<ruta>` copia los skills de `<ruta>/skills/` al sandbox en vez de los de
`vendor/`, y el Scorecard dice `local (sin commit)` en vez de un commit.

## Decisiones

- **El Pin local no lleva SHA.** `commit: "local"` no es un SHA a propósito, y el
  Scorecard lo pinta como `local (sin commit)` en el JSON, en el H1 del Markdown y
  en la línea de resumen por consola. La alternativa —poner el HEAD del checkout—
  es peor: el HEAD no es lo que se midió, porque un checkout sucio tiene cambios
  por encima. Una regla así obligaría a confiar en el guardarraíl de árbol sucio
  para que el número fuera verdad, en vez de no tener el número.
- **La identidad de lo medido es el `arbolHash` del ticket 04**, que ya se calcula
  sobre lo copiado al sandbox. Con un Pin local no hay ``commit`` con el que
  comparar dos corridas: el hash es la única identidad, y por eso el 05 depende de
  que el 04 exista.
- **El mismo guardarraíl, sobre el árbol que se mide.** Un checkout con cambios
  sin commitear en `skills/` no se mide, exactamente como `vendor/`. No es una
  contradicción con «iterar sin re-pinear»: se puede medir un árbol limpio o
  commitear en el checkout propio; lo que no se hace es medir en silencio. Lo que
  cambia fuera de `skills/` no cuenta, porque no es lo que el SUT ve.
- **El modo local nunca escribe en `vendor/` ni en `pin.json`.** `bump-pin` sigue
  siendo el único comando que reescribe el vendor, y sigue siendo veto del bucle.
- **Canónico sigue siendo upstream por SHA (ADR-0003).** El resultado de una
  corrida local es reportable y diffable (por hash), pero no es «el commit que se
  medirá en CI»: para eso se aplica el cambio en `desy-skills` y se bump-ea el
  Pin.

## Consecuencias

- `runCaso(caso, pin, deps)` **lee** el Pin: de ahí sale de qué árbol copia los
  skills. Era el parámetro que se recibía y no se usaba, la causa del fallo 3 de
  la spec del bucle.
- `ResultadoEjecucion` gana `fecha` y `salida` (stdout/stderr sin fusionar), y
  `npm run report` deja de re-etiquetar con `pin.json`: el Pin de un informe sale
  de las Ejecuciones. Sin eso, un informe de una corrida local heredaría el commit
  de `pin.json` y volvería a mentir.
- Las rutas del informe son **relativas al repo**, para no grabar la ruta de la
  máquina del mantenedor en lo que se versiona (ticket 09).
- **Hallazgo: la ruta de skills del sandbox duplicaba `opencode`.**
  `skillsDirDeConfig` espera la raíz de config (`home/.config`) y construye
  `opencode/skills`; el sandbox le pasaba el `configDir`, que ya termina en
  `opencode`, así que las skills aterrizaban en `…/opencode/opencode/skills` y V2
  —que escanea `XDG_CONFIG_HOME/opencode/skills`— no las ve. El `opencode.jsonc`
  declaraba esa misma ruta mal, así que no lo delataba; lo destapó el test de
  `--skills-local`, que comprueba qué ve el SUT en su `HOME`. Se corrige en el
  sandbox y el test de `sandbox.test.ts` fija la ruta desde la raíz de config.

- **El guardarraíl pregunta por el propio árbol.** `problemasDeVendorSucio` hacía
  `git status <dir>` desde `vendor/`: git filtra por ruta pero **no** por repo —los
  modos de fichero y los tags no se filtran, y en este repo `vendor/desy-skills` no
  es un repositorio propio: su toplevel es la raíz del harness. Funcionaba de
  milagro. Ahora el `cwd` es el árbol que se mide y el pathspec es `.`, la misma
  regla para el vendor y para un checkout local.

## Alternativas descartadas

- **Editar `vendor/` y confiar en el guardarraíl.** Es lo que el repo prohíbe: el
  árbol vendido debe ser siempre el commit de `pin.json`.
- **Un `bump-pin` a un ref de rama local.** Destruye el vendor, es irreversible, y
  copia un commit publicado en vez de lo que hay en el directorio.
- **Declarar el HEAD del checkout como commit.** Miente en cuanto hay algo sin
  commitear, que es el estado normal mientras se itera.
