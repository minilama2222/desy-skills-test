import type { Assert, Check } from "./caso.js";

/**
 * La traza de un Check: qué pide su aserción (`exige`) y qué lo tumba
 * (`tumba`). Es la mitad del informe por Caso (ticket 06 del bucle de
 * refinamiento) que sale del **propio Check**, no del artefacto: quien lee el
 * informe tiene que poder juzgar si el rojo es del skill o del check, y para eso
 * necesita ver la regla escrita, no sólo que un predicado del grader devolvió
 * `false`.
 *
 * Es **pura** y se deriva del `assert`: nada aquí consulta al grader ni al
 * artefacto. Por eso puede vivir en la Ejecución persistida, y el informe no
 * depende de recargar el Caso (que además pudo cambiar después).
 */
export interface TrazaCheck {
  /** La aserción en castellano, tal como la entiende quien lee el informe. */
  exige: string;
  /** Lo que hace fallar al Check: la frase se completa como «tumba el Check …». */
  tumba: string;
}

/**
 * La traza de la aserción de un Check: una frase por tipo de assert, con los
 * valores del Caso interpolados (`assert.macro`, `assert.clase`…). Se escribe en
 * castellano —las reglas son de gente, no de un intérprete— y **sin veredicto**:
 * dice qué exige y qué lo tumba, no si la culpa es del skill.
 */
export function trazaDeAssert(assert: Assert): TrazaCheck {
  switch (assert.kind) {
    case "macro_presente":
      return {
        exige: `El artefacto contiene la macro \`${assert.macro}\`.`,
        tumba: `ningún artefacto nombra \`${assert.macro}\` (HTML suelto copiado a mano no cuenta)`,
      };
    case "un_solo_h1":
      return {
        exige: "El artefacto tiene exactamente un `<h1>`.",
        tumba: "hay cero `<h1>` o más de uno",
      };
    case "skip_link":
      return {
        exige: "El artefacto tiene un enlace de salto (clase `skip-link`).",
        tumba: "ninguna clase del artefacto contiene `skip-link`",
      };
    case "fieldset_con_legend":
      return {
        exige: "Cada `<fieldset>` lleva su `<legend>`.",
        tumba: "algún `<fieldset>` no declara `<legend>`",
      };
    case "labels_visibles":
      return {
        exige:
          "Cada `input`/`select`/`textarea` tiene `id` y un `<label for>` que lo nombra.",
        tumba: "algún control visible no tiene `id` o ningún `<label for>` lo apunta",
      };
    case "flujo_canonico":
      return {
        exige: `El Flujo observado pasa por, en orden: ${assert.pasos.join(" → ")}.`,
        tumba: `el Flujo observado se salta un paso de ${assert.pasos.join(" → ")} o los hace en otro orden`,
      };
    case "sin_utility_por_defecto":
      return {
        exige:
          "Toda clase del artefacto es del sistema: ni escala numérica de Tailwind, ni valores arbitrarios.",
        tumba: "alguna clase es una utilidad por defecto de Tailwind o un valor arbitrario (`[372px]`, `gap-x-4`, …)",
      };
    case "espaciado_del_sistema":
      return {
        exige: "Toda utilidad de espaciado usa un token del sistema.",
        tumba: "alguna clase de espaciado no es un token (`p-4` en vez de `p-base`)",
      };
    case "color_del_sistema":
      return {
        exige: "Toda utilidad de color usa un token del sistema.",
        tumba: "alguna clase de color no es un token de la paleta",
      };
    case "usa_clase_tipografica":
      return {
        exige: `El artefacto usa la clase tipográfica \`${assert.clase}\`.`,
        tumba: `la clase \`${assert.clase}\` no aparece en el artefacto`,
      };
    case "macro_con_clase":
      return {
        exige: `La llamada a \`${assert.macro}\` lleva \`${assert.clase}\` en \`classes\`.`,
        tumba: `ninguna llamada a \`${assert.macro}\` pone \`${assert.clase}\` en \`classes\``,
      };
    case "sin_props_inventados":
      return {
        exige: `Toda prop de \`${assert.macro}\` existe en el catálogo del macro.`,
        tumba: `alguna prop de \`${assert.macro}\` no existe en el catálogo, o el macro no está en el catálogo`,
      };
    case "macro_sin_clase":
      return {
        exige: `La llamada a \`${assert.macro}\` no lleva \`${assert.clase}\`.`,
        tumba: `alguna llamada a \`${assert.macro}\` pone \`${assert.clase}\` en \`classes\``,
      };
    case "fidelidad_estructural":
      return {
        exige: `El artefacto reproduce el hecho «${assert.hecho}» que fija el Gold-HTML, sobre el mismo elemento.`,
        tumba: `el hecho «${assert.hecho}» no se reproduce (o no hay Gold contra el que medirlo)`,
      };
    case "estructura_grid":
      return {
        exige: `Un elemento que es rejilla (\`grid\`) lleva \`lg:grid-cols-${assert.columnas}\` en el mismo elemento.`,
        tumba: `no hay un elemento con \`grid\` y \`lg:grid-cols-${assert.columnas}\` juntos, o la rejilla no es responsive`,
      };
    case "contiene_texto":
      return {
        exige: `El artefacto contiene el texto «${assert.texto}».`,
        tumba: `el texto «${assert.texto}» no aparece (comparado sin contar espacios repetidos)`,
      };
    case "declara_decision":
      return {
        exige: `El texto de la decisión declara «${assert.valor}».`,
        tumba: `el texto de la decisión no nombra «${assert.valor}»`,
      };
    case "no_declara_decision":
      return {
        exige: `El texto de la decisión no declara «${assert.valor}».`,
        tumba: `el texto de la decisión nombra el valor prohibido «${assert.valor}»`,
      };
    case "no_declara_ejecucion":
      return {
        exige: `El artefacto no reclama haber ejecutado «${assert.accion}».`,
        tumba: `alguna línea reclama en pasado haber ejecutado «${assert.accion}»`,
      };
    case "declara_fallo": {
      const veredicto =
        assert.veredicto === undefined ? "un marcador de fallo" : `el veredicto «${assert.veredicto}»`;
      return {
        exige: `El informe declara «${assert.hecho}» con ${veredicto}, en la misma línea.`,
        tumba: `ninguna línea que nombra «${assert.hecho}» lleva ${veredicto}`,
      };
    }
    case "reconoce_componente": {
      const variante =
        assert.variante === undefined
          ? ""
          : ` con la variante documentada «${assert.variante}» en esa misma fila`;
      return {
        exige: `Una fila de la tabla identifica el componente \`${assert.componente}\`${variante}.`,
        tumba:
          `ninguna fila identifica \`${assert.componente}\` contra el catálogo` +
          (assert.variante === undefined ? "" : `, o la variante está en otra fila`),
      };
    }
  }
}

