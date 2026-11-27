# 22: La Captura de Gold de `implement-pattern` está sin CSS

**What to build:** Arreglar la fixture visual del Caso-página
`implement-pattern/patron-pagina-paso-1-nombre-nif`: su `input/gold.png` es el
HTML renderizado **sin la hoja de estilos**, así que el SUT recibe como
«referencia visual del Gold» una página que no se parece al Gold oficial.

**Fuente del Gold:** `https://desy.aragon.es/patron-pagina-paso-1-nombre-nif.html`.
El `gold.html` y el `gold.png` se toman de esa página: el HTML exacto que sirve
y una captura de la URL viva con el CSS aplicado. No se reconstruye el Gold
copiando un `styles.css` a mano.

**Blocked by:** —

**Status:** done

## La evidencia

- `input/gold.html:7` enlaza `css/styles.css`.
- En `input/` solo hay `gold.html`, `gold.png`, `gold.captura.json` y
  `prompt.md`: **no existe `css/`**.
- El `gold.html` commiteado no es el de la URL: pesa **12.064 bytes** y el que
  sirve `https://desy.aragon.es/patron-pagina-paso-1-nombre-nif.html` pesa
  **33.629 bytes**. El fixture actual es una versión recortada; la fuente de
  verdad es la URL.
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

- [x] Descargar el HTML exacto de
      `https://desy.aragon.es/patron-pagina-paso-1-nombre-nif.html` a
      `input/gold.html` y comprobar que sustituye a la versión recortada.
- [x] Capturar `input/gold.png` desde la **URL viva**, con el CSS aplicado; no
      desde un `file://` con un CSS copiado. Comprobar visualmente que no salen
      el spinner ni el skip-link y que la tipografía y la rejilla son las del
      Gold.
- [x] Recalcular `gold.captura.json` con el HTML nuevo y el ancho de la captura.
- [x] Que `capturar-gold` falle si el Gold se abre en local y referencia un CSS
      local que no existe, en vez de capturar una página sin estilos. Si la
      captura canónica pasa a ser la URL viva, documentar ese modo.
- [x] Que el guardarraíl compruebe las dimensiones del `gold.png` commiteado (o
      ajuste el ancho esperado si los 1885 px son el scrollbar y no un error).
- [x] Pasar `npm run precommit` y `npx tsx scripts/verificar-captura-gold.ts`.
- [x] Re-medir `implement-pattern/patron-pagina-paso-1-nombre-nif` para confirmar
      que la nueva referencia visual no rompe el Caso. No se toca ningún Check
      para que pase: si el Gold cambia, se revisa el Caso, no el skill.

## Por qué es un ticket de harness

El Gold-imagen es una **fixture de medida**, no una salida del skill. Un PNG sin
CSS invalida la parte visual de `design-match` y engaña al SUT, pero no dice nada
de `desy-implement-pattern`. La corrección es del harness: captura, assets y
guardarraíles de la fixture.

## Comments

### Cierre (2026-11-27)

Hecho en la rama `spec/harness-21-22`:

- `input/gold.html` es la copia exacta de
  `https://desy.aragon.es/patron-pagina-paso-1-nombre-nif.html` (33.629 bytes,
  frente a los 12.064 de la versión recortada).
- `input/gold.png` se capturó **desde la URL viva** con `agent-browser` a 1900×
  1080, con el CSS y las fuentes aplicados: cabecera, formulario, acciones y pie
  reales, sin spinner ni skip-link.
- `gold.captura.json` se recalculó con el HTML nuevo y declara además `url`, el
  origen del que salió la imagen; las próximas recapturas la reutilizan.
- `capturar-gold` acepta `--url` y, en modo local, **falla** si el Gold enlaza
  una hoja de estilo local inexistente, en vez de capturar una página sin CSS.
- `verificar-casos` comprueba las dimensiones del `gold.png` commiteado: el
  ancho ha de estar entre el del manifiesto y 20 px menos (franja del scrollbar).
- `npm run precommit` en verde y `npx tsx scripts/verificar-captura-gold.ts` en
  verde.

### Medición con el SUT (3 ejecuciones)

`npm run run -- --skill implement-pattern --case patron-pagina-paso-1-nombre-nif --n 3 --tope 3`:
`INACEPTABLE` × 3, todas por `encadenado-canonico`; la tercera falla además
`un-solo-h1` y `fidelidad-gap`.

La nueva referencia **no rompe el Caso**: los Checks de fidelidad estructural y
a11y del Gold siguen pasando en el test que reproduce el Gold, y dos de las tres
ejecuciones no fallan ningún Check de contenido. Los fallos son del Flujo
observado del SUT (orden distinto del canónico, o sin `validate-accessibility`),
no de la fixture. No se ha tocado ningún Check para que pase.
