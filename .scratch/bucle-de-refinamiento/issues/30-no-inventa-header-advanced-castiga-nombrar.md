# 30: `no-inventa-header-advanced` castiga nombrar el componente al descartarlo

**What to build:** Que el Check mida si el SUT **identificó** `header-advanced`
como componente de la imagen, no si la palabra aparece en el texto. Hoy una
respuesta que lo descarta —«es `header-mini`, **NO** `header` ni
`header-advanced`»— suspende el Check por nombrarlo.

**Blocked by:** 29 (sin la prosa, el artefacto no tiene filas que mirar)

**Status:** done

- [x] El Check es estructural: falla si la **tabla** de identificación tiene una
      fila que nombre `header-advanced`, no si el término aparece en una nota
- [x] Una respuesta que lo menciona para descartarlo pasa
- [x] Una respuesta que lo pone como fila, no
- [x] Tests del Caso con los dos textos
- [x] Re-medir `component-recognizer/reconocimiento-login`: 3 de 3 EXCELENTE

## La evidencia (21/11/2026)

`no_declara_decision` sobre `header-advanced` cuenta cualquier aparición. La
respuesta real, decodificada:

> …sin nombre de portal → es `header-mini`, **NO** `header` ni
> `header-advanced`. Regla 5 del skill…

Es decir: el SUT hace justo lo que el Check quiere —descartar el componente
equivocado— y el Check lo tumba por decirlo.

## Es el mismo defecto que el ticket 28

`no-arranca-implementacion` prohibía *nombrar* `choose-page-template`; éste
prohíbe *nombrar* `header-advanced`. Los dos confunden «el texto menciona X» con
«el SUT afirma X». En un Caso-decisión el artefacto **es** el texto, así que esa
confusión castiga al que explica.

La forma que ya funciona en este repo es la estructural: leer la tabla y mirar
sus filas (`reconoceComponente`), no buscar la palabra en la prosa. Aquí hace
falta la simétrica: «ninguna fila nombra este componente».

## La re-medida (21/11/2026, 02:10)

Con el artefacto en prosa y el Check mirando la tabla: `reconocimiento-login` pasa
a **2 de 3 EXCELENTE** en la primera medición y a **3 de 3** con el ticket 31. La
respuesta que descarta `header-advanced` ya no pierde el Check.
