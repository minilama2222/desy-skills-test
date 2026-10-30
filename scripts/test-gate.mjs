// El gate de la suite: el exit code **es** el veredicto, sin ruido.
//
// Vitest escribe el detalle de los fallos por **stderr**. PowerShell convierte
// cualquier salida de stderr de un proceso nativo en un `NativeCommandError` y,
// al pie de un fichero `.ps1` o de un `&&` del shell, deja el exit 1 aunque el
// proceso haya salido con 0: es el «rojo de Windows» que `AGENTS.md` se veía
// obligado a explicar («confirma con git log»). Ese aviso dependía de que el
// agente lo leyera, y se columpió más de una vez.
//
// Aquí vitest corre como **hijo** con los dos canales en tubería. Node los
// recoge, así que PowerShell sólo ve lo que este proceso escribe por stdout. El
// exit code del hijo es el que sale: 1 si hay un fallo de verdad, 0 si la suite
// pasa. Un `failed` ya no se puede confundir con ruido del terminal.
//
// Uso: node scripts/test-gate.mjs [args de vitest…]
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const vitest = join(raiz, "node_modules", "vitest", "vitest.mjs");

const { status, stdout, stderr, error } = spawnSync(
  process.execPath,
  [vitest, "run", ...process.argv.slice(2)],
  { cwd: raiz, encoding: "utf8" },
);

if (stdout) process.stdout.write(stdout);
// El detalle del fallo sí importa cuando lo hay; va por stdout, que es lo que
// PowerShell no interpreta como error.
if (stderr) process.stdout.write(stderr);
if (error) {
  console.error(error.message);
  process.exit(1);
}

// Sin status (matado por una señal) es un fallo: el gate no puede dar verde
// por una corrida que no terminó.
process.exit(status ?? 1);
