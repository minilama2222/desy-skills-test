Valida la accesibilidad de esta página DESY **sin servidor** (el «Checklist sin
servidor» del skill, el de `grep` sobre el HTML compilado). Este es el
`dist/pagina.html`:

```html
<!doctype html>
<html lang="es">
  <body>
    <main id="main">
      <h1>Datos de identidad</h1>
      <h1>Otro título suelto</h1>

      <fieldset>
        <label for="nombre">Nombre y apellidos</label>
        <input id="nombre" name="nombre" type="text" />
      </fieldset>

      <input name="nif" type="text" />
    </main>
  </body>
</html>
```

Dime el resultado de **cada** comprobación del checklist (un solo `h1`,
`fieldset` con su `legend`, cada control con su `label`, skip-link).
