Traduce este componente de `desy-html` a `desy-angular`. El target final es
Angular 19.

```njk
{{ componentButton({
  "text": "Enviar",
  "classes": "c-button--primary"
}) }}
```

Escribe el **template Angular** (`desy-button` con sus bindings) en
`src/boton-primario-angular.html`. No inventes equivalencias: usa el patrón
general de macro → selector + `[binding]`.
