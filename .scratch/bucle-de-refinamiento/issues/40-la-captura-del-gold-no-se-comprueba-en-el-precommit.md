# 40: La captura del Gold no se comprueba en el precommit

**What to build:** Que el precommit detecte un `gold.png` que ya no corresponde a
su `gold.html`. Hoy el manifiesto `gold.captura.json` guarda la clave, pero nadie
la contrasta: si cambias el HTML y olvidas recapturar, el PNG viejo se queda y la
suite mide contra una referencia que ya no es la del Caso.

**Blocked by:** —

**Status:** done

- [x] Regla pura `problemaDeCapturaDesactualizada(dirInput)`:
      - sin `gold.png` y sin manifiesto → sin problema
      - `gold.png` sin manifiesto → problema (no se sabe con qué se capturó)
      - manifiesto sin `gold.png` → problema (la captura desapareció)
      - clave del manifiesto distinta de la del `gold.html` actual → problema,
        con el comando para recapturar
- [x] `npm run verificar-casos` la aplica a cada Caso-página con captura
- [x] Tests de los cuatro casos

## La evidencia (21/11/2026)

Hay un Caso-página con captura (`implement-pattern/patron-pagina-paso-1-nombre-nif`)
y su manifiesto coincide. Pero la comprobación no existe: `capturaVigente` sólo
la usa `capturar-gold`, que es un comando manual. El ADR-0008 dice que el
manifiesto «hace auditable de un vistazo» la captura; sin un guardarraíl, la
auditoría depende de que alguien se acuerde.

## Implementado (21/11/2026)

- `problemaDeCapturaDesactualizada(dirInput)` en `src/captura-gold.ts`:
  distingue captura vigente, HTML cambiado, PNG sin manifiesto y manifiesto sin
  PNG; el mensaje dice el comando para recapturar.
- `npm run verificar-casos` la aplica a cada Caso-página y la suma a sus
  hallazgos (precommit).
- Tests: los cinco casos en `test/captura-gold.test.ts`.
- Medido: el árbol actual pasa (`OK: todos los Casos…`); el único Caso-página
  con captura es `patron-pagina`.
