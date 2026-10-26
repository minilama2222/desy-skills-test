# Dos tipos de Caso: Caso-componente y Caso-página

> **Actualización (ADR-0011):** este ADR fija los **dos tipos anclados a HTML**.
> Un tercero, el **Caso-decisión**, se añadió después para los skills cuyo output
> no es HTML (identificar componentes, elegir plantilla o librería). Ver
> [`0011-caso-decision.md`](./0011-caso-decision.md).

Los Casos se tipan explícitamente en dos: **Caso-componente** (contrato de un componente aislado, sin Gold) y **Caso-página** (página completa desde un Gold). Cada tipo determina un Framework de checks base (guards comunes como h1 único, skip-link, fieldset+legend) que el grader combina con los checks propios.

Alternativas descartadas: dejar el Gold como opcional por Caso (invisible el "por qué" de qué se mide) y anclar todo componente suelto a un fragmento de un Gold (Gold artificial y ruidoso). Tipar el Caso hace explícito qué se mide y mapea al arranque por slices: el componente aislado valida el harness, la página valida el encadenado.
