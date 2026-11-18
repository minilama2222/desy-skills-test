# 17: El vigilante acusa un fichero que el mantenedor estaba editando

**What to build:** decidir si el vigilante del ticket 16 debe distinguir una fuga
del SUT de una edición del mantenedor. Hoy no distingue: compara el árbol y no
los procesos. El 18/11/2026 abortó una corrida acusando `test/sandbox.test.ts`,
un fichero que el mantenedor estaba editando, con `git status` limpio y el
contenido idéntico al commit.

**Blocked by:** —

**Status:** ready-for-human

**Status depende de:** la decisión de qué cuenta como escritura del SUT, que es
cambiar la vara de medir. El 18/11/2026 el mantenedor eligió **documentar el
límite y no estrechar el detector** (ver ADR-0019, «Límite conocido»); este ticket
queda abierto para que la decisión esté escrita y se pueda revertir con evidencia.

- [ ] Se decide si el vigilante acusa sólo ficheros **nuevos**, o también los
      rastreados que cambiaron
- [ ] Si se estrecha, hay un test que fija el caso adverso: un fichero rastreado
      con la fecha cambiada y el contenido intacto **no** se acusa
- [ ] `docs/adr/0019` deja de llamarlo «límite conocido» o lo mantiene con la
      decisión y su fecha

## El hallazgo, medido

```
$ git status --porcelain
(vacío)

$ stat -f "%Sm" test/sandbox.test.ts
Nov 18 23:09:29 2026        ← editado a las 23:09

$ git log -1 --format=%cd -- test/sandbox.test.ts
23:14:09                    ← committeado a las 23:14
```

La suite corrió a las ~23:24. La foto del vigilante se tomó con la fecha previa;
al terminar, la firma `tamaño:mtime` había cambiado y lo acusó.

## Por qué es un falso positivo

Un guardarraíl que salta mientras el mantenedor trabaja se acaba ignorando. El
coste no es el código: es la confianza en el aviso.

## Las dos salidas evaluadas

- **Acusar sólo ficheros nuevos.** El fallo del ticket 16 fue `?? src/pages/…`:
  un fichero que antes no existía. Cubre el caso real y no puede confundir una
  edición con una fuga. Pierde el caso «el SUT reescribe una página existente
  fuera del sandbox».
- **Rastreados que estaban limpios al arrancar.** Mantiene ese caso y perdía el
  ruido si el fichero ya estaba sucio. Cuesta un `git status` más en la foto.
