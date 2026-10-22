# 07: Guards de a11y + comparación de Flujo

**What to build:** Los guards deterministas de accesibilidad sobre el HTML generado (un solo `h1`, `fieldset`+`legend`, skip-link, labels visibles) y la comparación del Flujo observado (transcript) contra el Flujo canónico. Sin navegador.

**Blocked by:** 03

**Status:** done

- [x] Guards que detectan un `h1` duplicado, fieldset sin legend, skip-link ausente y label no visible
- [x] El transcript se parsea y produce la secuencia de Invocaciones (Flujo observado)
- [x] Se compara Flujo observado contra Flujo canónico y falla si se salta un paso obligatorio
- [x] Estos guards se integran en el Framework de Caso-página
- [x] Tests unitarios con HTML y transcripts de ejemplo

## Notas de implementación

- Ya existían (del ticket 03) `un_solo_h1`, `fieldset_con_legend`, `skip_link` y
  `flujo_canonico`; el trabajo real era el cuarto guard de a11y y endurecer el
  flujo.
- **`labels_visibles`** (nuevo): anclado en el checklist de grep del propio skill
  `desy-validate-accessibility` (paso 4) — cada `input`/`select`/`textarea`
  (ignorando `type="hidden"`) necesita un `<label for="<id>">`. Un control sin
  `id` no es asociable y falla. Añadido al Framework de Caso-página.
- **Comodín en el Flujo canónico**: el glosario define el flujo con
  `implement-*`, pero `pasoCoincide` hacía comparación exacta, así que el flujo
  canónico **no era expresable**. Ahora un paso terminado en `-*` admite la
  familia (`implement-component`, `implement-pattern`, …). Tests con el flujo
  canónico completo del glosario.
- **Skip-link endurecido**: sólo casaba con comillas dobles; ahora acepta simples
  (un guard no debe producir INACEPTABLE falso por la forma de citar).

## Hallazgo abierto (bloquea el criterio 5 del ticket 05)

Ver `HALLAZGO-guards-macro-artefacto.md`: los guards de macro leen el macro en el
HTML **compilado**, donde ya se expandió, así que suspenden un output correcto.
Confirmado con el experimento de estabilidad (1 de 3 Ejecuciones produjo un
botón correcto y el harness le dio 3 fallos, ninguno del skill).

