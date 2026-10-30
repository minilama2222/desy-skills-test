import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    // `suite-cli.test.ts` copia un scaffold de ~85 MB / 5.300 ficheros por
    // Ejecución y lleva su propio presupuesto de tiempo (CODING_STANDARDS). Con
    // todos los ficheros en paralelo, esa copia compite por el disco con el resto
    // y la misma corrida que tarda ~19 s aislada llega a 37 s: un rojo de
    // contienda, no del código (medido el 30/10). Dos workers dejan aire para el
    // fichero pesado sin serializar la suite entera. `minWorkers` tiene que ir a
    // juego: tinypool rechaza `maxThreads` menor que el `minThreads` por defecto.
    maxWorkers: 2,
    minWorkers: 1,
  },
});
