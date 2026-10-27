import { join } from "node:path";
import { CASOS_DIR, cargarCaso } from "../src/caso-loader.js";
import { grado } from "../src/grader.js";

/**
 * Comprobación de que el arreglo de los comentarios Nunjucks **no** ha abierto
 * un colador: una entrega con utilidades de Tailwind reales (fuera de
 * comentario) tiene que seguir suspendiendo.
 *
 * Uso: npx tsx scripts/verificar-tokens-no-es-colador.ts
 */
const CASO = join(CASOS_DIR, "implement-component", "componente", "boton-primario");
const caso = cargarCaso(CASO);

const BOTON = `{% from "components/button/_macro.button.njk" import componentButton %}
{{ componentButton({ "text": "Enviar", "type": "submit", "classes": "c-button--primary" }) }}`;

const casos: { nombre: string; html: string; debeFallar: boolean }[] = [
  {
    nombre: "botón correcto + envoltorio con p-2 de verdad",
    html: `${BOTON}\n<div class="p-2">envoltorio</div>`,
    debeFallar: true,
  },
  {
    nombre: "botón correcto + envoltorio con tokens DESY",
    html: `${BOTON}\n<div class="mt-base mb-base">envoltorio</div>`,
    debeFallar: false,
  },
  {
    nombre: "botón correcto + comentario con p-2 (el falso negativo)",
    html: `${BOTON}\n{# <div class="p-2"></div> #}`,
    debeFallar: false,
  },
];

let fallos = 0;
for (const c of casos) {
  const { grade } = grado(
    {
      artefactos: { files: { "index.html": c.html } },
      transcript: { invocaciones: ["preflight-check", "implement-component"] },
    },
    { tipo: caso.tipo, checks: caso.checks },
  );
  const falla = grade === "INACEPTABLE";
  const correcto = falla === c.debeFallar;
  if (!correcto) fallos++;
  console.log(`${correcto ? "OK   " : "MAL  "} ${c.nombre} -> ${grade}`);
}

console.log(
  fallos === 0
    ? "\nEl guard sigue atrapando lo que debe y ya no se contamina con lo comentado."
    : `\n${fallos} caso/s incorrectos: el arreglo cambió el comportamiento que no debía.`,
);
process.exit(fallos === 0 ? 0 : 1);
