# 18: Un macro comentado no es una llamada (el starter hacía suspender al SUT)

**What to build:** Que los Checks de contrato de macro lean el fuente **sin los
comentarios Nunjucks**. Hoy `llamadasAMacro` recorre el fichero entero, y el
ejemplo comentado del starter (`{# … componentButton({ "classes": "c-button--primary c-button--lg" }) … #}`)
cuenta como si la hubiera escrito el SUT.

**Blocked by:** —

**Status:** done

- [x] `llamadasAMacro` limpia con `sinComentariosNunjucks` antes de buscar
- [x] Tres tests con control negativo: `macro_sin_clase`, `macro_con_clase` y
      `sin_props_inventados` ignoran lo comentado y siguen midiendo lo real
- [x] `npm test` en verde (875) y `verificar-tests` en verde
- [x] Las 2 Ejecuciones de `reports/suite` que el replay marcaba como `DERIVA` se
      archivan en `reports/legado/suite-2026-11-18-macro-comentado/` y se retiran de
      `reports/suite`: el replay vuelve a verde con la evidencia archivada
- [x] Re-medido con el grader arreglado: `EXCELENTE`, cero Checks rojos

## Cómo apareció

Fase 1 del bucle de refinamiento (ticket 11), sobre la única Evidencia guardada.
El scorecard de versión `c75f7fe9…` decía **0 entregas**, y las dos Ejecuciones
reales lo contradecían: las dos entregaron artefacto. Al abrir el informe, el
único Check rojo de la Ejecución 2 señalaba la línea 36 del artefacto:

```nunjucks
32:   {# <p class="c-paragraph-base">Aqui un componente importado de desy-html:</p>
33:   {% from "components/button/_macro.button.njk" import componentButton %}
34:   {{ componentButton({
36:       "classes": "c-button--primary c-button--lg"
38:   <div class="pb-lg"></div> #}
```

Esa es la llamada de ejemplo **del propio starter**, comentada. La que escribió
el SUT está en la 43, sin clase de tamaño, y es la correcta. El check
`tamano-base-no-grande` tumbaba al agente por lo que escribió el repo.

No es un caso aislado de un Caso: `macro_con_clase` y `sin_props_inventados` leen
con la misma función, así que el mismo comentario podía acreditar una variante que
el SUT no puso, o acusar una prop inventada que nadie renderiza.

## Por qué no es «el grader mintió»

Es exactamente lo que `replay-grader` existe para ver: un cambio del grader que
mueve un Grade ya medido sale en segundos, sin gastar una corrida. Aquí lo destapó
la lectura del informe, y el replay lo confirma después.

## Lo que se decidió, y por qué

Un humano eligió **archivar** la Evidencia en vez de tirarla. El archivo es
`reports/legado/suite-2026-11-18-macro-comentado/`, y es el primero con la cabecera
`soloLectura`: dice **cómo se leyó** el fichero y **qué no se puede afirmar** de él,
en lugar de afirmar con qué regla contaban las entregas. Se apoya en un hecho
comprobado, no en una promesa: el `arbolHash` guardado (`c75f7fe9…`) no coincide con
el que mide el `vendor/` de hoy (`a9722412…`), así que la corrida no se puede
re-graduar y ningún Grade suyo se presenta como reproducible.

Archivar descubrió un fallo del propio archivador, y quedó tapado: volver a correr
`npm run archivar-legado` **pisó** el archivo del 27/10 con los ficheros que había
hoy en `reports/suite` (los del 18/11). `reports/` es volátil y el script lo daba por
bueno. Se restauró del commit, y ahora:

- `archivarCorrida` se **niega** si el directorio destino ya existe: archivar es
  escribir historia, no refrescarla;
- el script acepta el nombre de una corrida (`npm run archivar-legado -- <dir>`), para
  archivar una nueva sin re-correr —y sin poder pisar— las que ya están.

## Lo medido después

Con el grader arreglado, el mismo Caso corre a `EXCELENTE` con cero Checks rojos
(dos intentos, dos entregas). Antes salía `ACEPTABLE` por una línea de un comentario
del starter. Y sigue con **cero invocaciones del skill**: el hallazgo del ticket 19
se confirma con datos frescos, no con los de la corrida archivada.

## La evidencia de 23:35

`reports/suite/ejecuciones/implement-component/boton-primario` se escribió el 18/11
23:35 con un árbol de skills que **no está guardado**: solo se conserva su
`arbolHash` (`c75f7fe9…`) y el Pin `b523ca7`. El replay de hoy dice que las dos
Ejecuciones se re-gradúan **con los Checks del Caso de hoy** (la Evidencia no
guarda el peso), así que la Ejecución 2 sale hoy `EXCELENTE` y ayer `ACEPTABLE`.

Eso no permite afirmar que el cambio de hoy sea el único responsable, y por eso la
cabecera archivada no lo afirma.

Lo que tampoco se hizo: dar el `DERIVA` por bueno diciendo «era la trampa». La
trampa se demuestra con el test (una llamada comentada, tres kinds) y con la
re-medida; el salto del Grade guardado no se usa como prueba de nada.

## Notas de implementación

- El arreglo va en `llamadasAMacro` (`src/grader.ts`), el único punto por el que
  pasan los tres Checks de contrato de macro. Se reutiliza
  `sinComentariosNunjucks`, que ya existía para leer clases (ADR-0010): una regla,
  un sitio.
- **Lo que no arregla:** el otro hallazgo de la fase 1 —el SUT entregó correcto
  **sin invocar el skill**— sigue en pie. Es un problema de `description`
  (frontmatter) y su sitio es `desy-skills`, no este repo. Se trabaja en el
  ticket 19, **después** de este: sin el arreglo del macro comentado, medir un
  frontmatter nuevo da Grades que mezclan las dos causas.
