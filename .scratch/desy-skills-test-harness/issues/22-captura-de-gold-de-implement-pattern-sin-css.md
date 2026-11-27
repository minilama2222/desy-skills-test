# 22: La Captura de Gold de `implement-pattern` está sin CSS

**What to build:** Arreglar la fixture visual del Caso-página
`implement-pattern/patron-pagina-paso-1-nombre-nif`: su `input/gold.png` es el
HTML renderizado **sin la hoja de estilos**, así que el SUT recibe como
«referencia visual del Gold» una página que no se parece al Gold oficial.

**Blocked by:** —

**Status:** ready-for-agent

## La evidencia

- `input/gold.html:7` enlaza `css/styles.css`.
- En `input/` solo hay `gold.html`, `gold.png`, `gold.captura.json` y
  `prompt.md`: **no existe `css/`**.
- `capturarConAgentBrowser` abre el Gold como `file://…/gold.html`; el navegador
  no encuentra `file://…/input/css/styles.css` y renderiza con los estilos por
  defecto del navegador.
- La captura enseña el spinner («Espera por favor, la página se está cargando»)
  y el skip-link, que el CSS debería ocultar; tipografía serif y enlaces azules.
  Es el render por defecto, no el Gold.
- El manifiesto `gold.captura.json` dice `ancho: 1900` y su clave coincide con la
  del `gold.html` actual, así que `asegurarCaptura` considera la imagen vigente y
  `verificar-casos` pasa: **el guardarraíl no detecta que falta el CSS**.
- El PNG mide **1885×1178** y el manifiesto declara 1900; `problemaDePng` no se
  aplica a la fixture commiteada, solo a una captura sintética de
  `verificar-captura-gold`.

## Qué debe quedar

- [ ] Decidir cómo se sirve el CSS: copiar el `styles.css` compilado oficial a
      `input/css/styles.css` (fixture self-contained) o capturar el Gold desde la
      URL viva. La primera opción es la que permite recapturar sin red.
- [ ] Recapturar `input/gold.png` y comprobar visualmente que el CSS se aplica:
      sin spinner ni skip-link visibles, con la tipografía y la rejilla del Gold.
- [ ] Que `capturar-gold` falle si `gold.html` referencia un CSS local que no
      existe, en vez de capturar una página sin estilos.
- [ ] Que el guardarraíl compruebe las dimensiones del `gold.png` commiteado (o
      ajuste el ancho esperado si los 1885 px son el scrollbar y no un error).
- [ ] Pasar `npm run precommit` y `npx tsx scripts/verificar-captura-gold.ts`.
- [ ] Re-medir `implement-pattern/patron-pagina-paso-1-nombre-nif` para confirmar
      que la nueva referencia visual no rompe el Caso. No se toca ningún Check
      para que pase: si el Gold cambia, se revisa el Caso, no el skill.

## Por qué es un ticket de harness

El Gold-imagen es una **fixture de medida**, no una salida del skill. Un PNG sin
CSS invalida la parte visual de `design-match` y engaña al SUT, pero no dice nada
de `desy-implement-pattern`. La corrección es del harness: captura, assets y
guardarraíles de la fixture.
