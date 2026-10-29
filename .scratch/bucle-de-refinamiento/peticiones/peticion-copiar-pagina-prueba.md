# Copiar la página de prueba a un fichero propio en vez de editarla

**Fichero destino:** `skills/desy-implement-component/SKILL.md` (y, si el texto es común, `desy-implement-pattern`)

**Origen:** `HALLAZGO-tokens-fichero-de-ejemplo.md:78`, decisión del 27/10

**Estado:** propuesta

---

## 1. El cambio, en una frase

Que `desy-implement-*` indique que **se copia** `pagina-prueba-EDITA-PARA-EMPEZAR.html` a un fichero propio antes de trabajar, en vez de editar el de ejemplo.

## 2. Por qué (evidencia)

Ningún check falla por esto: el harness lo **acepta** a propósito, porque juzgar dónde escribió sería juzgar algo fuera del contrato. Esto es una **expectativa del skill**, no un bug del harness: el nombre del fichero invita a editarlo y el output del usuario acaba mezclado con el andamio del starter.

## 3. La sección que lo causa

Hoy el skill no dice nada: `grep pagina-prueba vendor/desy-skills/skills/` → 0 coincidencias.

## 4. Restricciones

- No es un Guard: si algún día se gradúa, es un **Quality** con assert estructural («existe un `src/*.html` nuevo distinto del de ejemplo»), nunca de vocabulario.
- No se añade penalización en `desy-skills-test` por esto.

## 5. Cómo se valida

- [ ] `npm run run implement-component/boton-primario` con pin local: el agente crea un `src/*.html` propio.
- [ ] **PASA sostenido**: dos corridas consecutivas PASA.
- [ ] Sin regresión en el resto de Casos del skill.

## 6. Skills sugeridos

- `desy-implement-component`
- `desy-implement-pattern`

## 7. Lo que no debe hacer

- No tocar el harness.
- No añadir un check de vocabulario.

## 8. Declaración de cierre

<Pendiente.>
