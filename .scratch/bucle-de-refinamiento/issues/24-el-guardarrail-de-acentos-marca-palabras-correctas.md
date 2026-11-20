# 24: El guardarraíl de acentos marca palabras correctas («funcionó»)

**What to build:** Que el guardarraíl de acentos marque **solo** la palabra sin
tilde. Hoy `funcionó` se denuncia como `funcion`, porque el límite derecho del
patrón es un `(?![A-Za-z0-9_-])` y la `ó` no está en esa clase: el corte cae entre
`funcion` y `ó` y la palabra correcta parece incorrecta.

**Blocked by:** —

**Status:** done

- [x] Los dos límites del patrón usan letras **Unicode** (`\p{L}`, `\p{M}`,
      `\p{N}`), no `A-Za-z`: una vocal acentuada es parte de la palabra
- [x] `funcionó`, `funcionar` y `funcionando` ya no se marcan; `funcion` solo,
      sí
- [x] El resto del listado sigue igual: `arbol` sí, `arbolado` no; `ejecucion` sí,
      «ejecuciones» no
- [x] Tests con los tres casos (forma sin tilde, forma flexionada correcta, y
      palabra que solo la contiene)

## La evidencia (20/11/2026)

Escribiendo el ADR-0006 apareció este rojo:

```
docs/adr/0006-artefacto-segun-tipo-de-caso.md:26: `funcion` sin tilde (¿querías "función"?)
```

La línea decía «No funcionó, y no por falta de instrucciones». Es castellano
correcto: el guardarraíl se equivocaba.

## La causa, en una línea

```ts
new RegExp(`(?<![A-Za-z0-9_-])${palabra}(?![A-Za-z0-9_-])`, "iu")
```

Con `funcion` + `ó`: la mirada negativa a la derecha pregunta «¿lo que sigue no es
`A-Za-z0-9_-`?», y `ó` no lo es, así que pasa. La misma trampa existe a la
izquierda. El comentario del propio fichero ya avisa de que `\b` no sirve por las
vocales acentuadas; el patrón manual heredó el mismo problema por otra puerta.
