# 42: El orden canónico falla 5 de 9 sin causa de redacción

**What to build:** decidir qué hacer con `encadenado-canonico`. No es una
petición de prosa: el orden está escrito en **nueve sitios** (tabla y checklist
de `desy-preflight-check`, «Cargar»/«Posición»/«Siguiente skill típica» de
`desy-design-match`, y «Cargar»/«Posición»/«Related» de
`desy-validate-accessibility`), sin una sola contradicción. Aun así falla.

**Blocked by:** —

**Status:** ready-for-human

**Status depende de:** una decisión de diseño del harness o del Caso, en una de
dos direcciones:

1. **El guard es más estricto que la conducta que un SUT puede dar.** Seis
   guards independientes y un modelo estocástico: la secuencia se cumple «casi
   siempre», y el guard exige «siempre». Entonces el guard mide una perfección
   que no es del skill, y hay que decidir si eso es lo que se quiere medir.
2. **El flujo puede hacerse ineludible.** Hoy el orden se aprende al principio
   (preflight) y no se vuelve a leer en la transición. Si hay una forma de que
   cada skill compruebe el paso anterior antes de arrancar, eso sí es una
   petición con hipótesis.

- [ ] Elegir 1 o 2 (o descartar el guard como criterio de este Caso)
- [ ] Si es 2, escribir la petición con la hipótesis y medirla
- [ ] Si es 1, dejar escrito qué mide entonces el `encadenado-canonico`

## La evidencia

Árbol publicado `a0b29172`, nueve Ejecuciones (5, 6, 7, 12–17): **5 fallan**.

- **Inversión de los dos últimos pasos** (`validate-accessibility` antes de
  `design-match`): 5 y 7.
- **`design-match` adelantado al principio**, antes de `choose-page-template`:
  13, 14 y 15 (y la 8 del árbol anterior).

En las dos suites del 26/11: **3 de 9 intentos** del Caso fallan por orden (suite
1: el 3.º; suite 2: el 1.º y el 4.º).

Una petición ya intentó la mitad «valida la versión final» y **no funcionó**: 1
EXCELENTE de 4 y la inversión reapareció con la frase leída. Está en
[`peticion-validar-la-version-final.md`](../peticiones/peticion-validar-la-version-final.md),
descartada con medida.
