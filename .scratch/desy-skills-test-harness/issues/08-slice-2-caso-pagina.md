# 08: Slice 2 — Caso-página contra Gold (patron-pagina-paso-1-nombre-nif)

**What to build:** El segundo camino vertical: un Caso-página que parte del Gold oficial `patron-pagina-paso-1-nombre-nif` (Gold-HTML + Captura de Gold al prompt) y se evalúa con encadenado, a11y de página y fidelidad estructural contra el Gold-HTML (ancho de container, escala tipográfica, gaps). Demuestra que el encadenado de skills funciona de punta a punta.

**Blocked by:** 02, 04, 06, 07

**Status:** ready-for-agent

- [ ] El Gold-HTML y su Captura de Gold están como fixtures del Caso
- [ ] El prompt del Caso incluye la Captura de Gold como referencia visual
- [ ] Se valida el encadenado esperado (preflight → choose-page-template → implement-* → design-match → validate-accessibility)
- [ ] Se validan guards de a11y y fidelidad estructural contra el Gold-HTML
- [ ] El scorecard muestra guards OK + grade de calidad antes de escalar

