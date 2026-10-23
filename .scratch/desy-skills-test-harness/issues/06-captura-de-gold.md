# 06: Captura de Gold

**What to build:** Dado un Gold-HTML, se produce la Captura de Gold: un screenshot a 1900px de ancho vía `agent-browser`, pre-capturado y cacheado como fixture, con invalidación cuando cambia el Gold-HTML o el viewport. No se regenera en cada Ejecución.

**Blocked by:** 01

**Status:** done

- [x] Se genera un screenshot a 1900px desde un Gold-HTML
- [x] La captura se cachea como fixture y las Ejecuciones la leen
- [x] Cambiar el Gold-HTML o el viewport invalida la caché
- [x] Test de integración acotado sobre la invalidación
- [x] El formato/almacenamiento de la captura es estable y versionable

## Cómo quedó

Decisión de almacenamiento: **fixture versionada** junto al Gold-HTML del Caso
(`casos/<skill>/pagina/<id>/input/gold.png`), con manifiesto
`input/gold.captura.json`. Ver `docs/adr/0008-captura-de-gold-fixture-con-cache-por-clave.md`.

Seams:

- **Puras** (`src/captura-gold.ts`): `claveDeCaptura({html, ancho})` (hash del
  Gold-HTML + ancho) y `capturaVigente(manifiesto, claveEsperada)` (la regla de
  invalidación). El test de invalidación es determinista y no abre navegador.
- **Adaptador**: `asegurarCaptura(dir, {ancho, capturar})` regenera sólo si la
  clave caducó; el capturador se inyecta, así que el test usa uno falso.
- **Adaptador real**: `capturarConAgentBrowser(goldHtml, ancho)` abre el HTML a
  1900px y hace screenshot `--full`.
- **Comando de autoría**: `npm run capturar-gold -- --skill <skill> --case <caso>`.
- **Caso-página**: expone `goldImagenPath` (`input/gold.png`) para que el prompt
  de la Ejecución lo lea (lo consume el ticket 08).

Evidencia de la captura real:

- Adaptador real probado contra un Gold-HTML de prueba: el PNG sale a
  **1900×1080** (cabecera IHDR leída), 12.5 KB.
- Smoke saltable: `test/captura-gold.test.ts` genera un PNG real y comprueba que
  el ancho es 1900; se salta si no hay `agent-browser` (p. ej. CI).

Nota de plataforma: en Windows `agent-browser` se instala como shim `.cmd`, no
como `.exe`; `spawnSync` no lo resuelve para subcomandos, así que el adaptador lo
invoca vía `cmd.exe /c`. `opencode` sí es un `.exe` y no lo necesita.

No genera la captura el runner: es un paso de autoría del Caso. El runner sólo
lee la fixture.
