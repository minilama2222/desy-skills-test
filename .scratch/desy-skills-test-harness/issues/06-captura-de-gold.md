# 06: Captura de Gold

**What to build:** Dado un Gold-HTML, se produce la Captura de Gold: un screenshot a 1900px de ancho vía `agent-browser`, pre-capturado y cacheado como fixture, con invalidación cuando cambia el Gold-HTML o el viewport. No se regenera en cada Ejecución.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Se genera un screenshot a 1900px desde un Gold-HTML
- [ ] La captura se cachea como fixture y las Ejecuciones la leen
- [ ] Cambiar el Gold-HTML o el viewport invalida la caché
- [ ] Test de integración acotado sobre la invalidación
- [ ] El formato/almacenamiento de la captura es estable y versionable

