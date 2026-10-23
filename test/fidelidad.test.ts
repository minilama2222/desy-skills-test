import { describe, expect, it } from "vitest";
import {
  ambitoDeTokens,
  clasesDeMain,
  containerDeGold,
  escalaH1DeGold,
  gapDeGold,
  reproduceContainer,
  reproduceEscalaH1,
  reproduceGap,
  utilidadesDelGold,
} from "../src/fidelidad.js";

/**
 * Gold-HTML de juguete con la estructura del patrón de formulario DESY: main con
 * container, h1 con escala, y una rejilla con gap y columnas. Reproduce lo que
 * `src/fidelidad.ts` debe extraer.
 */
const GOLD = [
  "<!doctype html><html><body>",
  '<header><div class="container mx-auto gap-base">header</div></header>',
  '<main id="content" class="relative container mx-auto px-base">',
  '<h1 id="page-title" class="c-h1 w-full">Datos de identidad</h1>',
  '<div class="grid grid-cols-2 lg:grid-cols-4 gap-lg">',
  '<div class="col-span-2 lg:col-span-3">contenido</div>',
  "</div></main>",
  "</body></html>",
].join("");

describe("extracción de la firma estructural del Gold", () => {
  it("el container sale del <main>, no del header", () => {
    expect(containerDeGold(GOLD)).toEqual(["container", "mx-auto"]);
  });

  it("la escala del h1 se queda con lo tipográfico, no con el layout", () => {
    expect(escalaH1DeGold(GOLD)).toEqual(["c-h1"]);
  });

  it("el gap sale de la rejilla (gap + grid-cols), no de otro div con gap", () => {
    // El header tiene `gap-base`; la rejilla del contenido tiene `gap-lg`. La
    // firma debe ser la de la rejilla, no la del header.
    expect(gapDeGold(GOLD)).toEqual(["grid-cols-2", "lg:grid-cols-4", "gap-lg"]);
  });

  it("sin el hecho en el Gold, la firma es vacía (no se busca en cualquier parte)", () => {
    expect(containerDeGold("<main><h1>Sin container</h1></main>")).toEqual([]);
    expect(escalaH1DeGold("<main><h1 class='w-full'>T</h1></main>")).toEqual([]);
    expect(gapDeGold("<main><div class='gap-lg'>suelto</div></main>")).toEqual([]);
  });
});

describe("reproducción del hecho estructural sobre el mismo elemento", () => {
  it("una página que reproduce el Gold pasa los tres hechos", () => {
    expect(reproduceContainer(GOLD, GOLD)).toBe(true);
    expect(reproduceEscalaH1(GOLD, GOLD)).toBe(true);
    expect(reproduceGap(GOLD, GOLD)).toBe(true);
  });

  it("sin Gold no hay contra qué comparar: falla", () => {
    expect(reproduceContainer(GOLD, undefined)).toBe(false);
    expect(reproduceEscalaH1(GOLD, undefined)).toBe(false);
    expect(reproduceGap(GOLD, undefined)).toBe(false);
  });

  it("un `container` que sólo está en el header no satisface el hecho del <main>", () => {
    const sinContainerEnMain = GOLD.replace(
      '<main id="content" class="relative container mx-auto px-base">',
      '<main id="content" class="relative px-base">',
    );
    expect(reproduceContainer(sinContainerEnMain, GOLD)).toBe(false);
  });

  it("un gap-lg suelto no cuela si la rejilla no lo lleva", () => {
    const rejillaMal = GOLD.replace(
      "grid grid-cols-2 lg:grid-cols-4 gap-lg",
      "grid gap-base",
    ).replace('<header><div class="container mx-auto gap-base">', '<header><div class="container mx-auto gap-lg">');
    expect(reproduceGap(rejillaMal, GOLD)).toBe(false);
  });

  it("una escala tipográfica distinta en el h1 no satisface el hecho", () => {
    const sinEscala = GOLD.replace('class="c-h1 w-full"', 'class="text-3xl w-full"');
    expect(reproduceEscalaH1(sinEscala, GOLD)).toBe(false);
  });
});

describe("ambitoDeTokens", () => {
  it("recorta al <main> (el contenido del SUT), dejando fuera header y footer", () => {
    const html = "<body><header>h</header><main><p>contenido</p></main><footer>f</footer></body>";
    const ambito = ambitoDeTokens(html);
    expect(ambito).toContain("contenido");
    expect(ambito).not.toContain("header");
    expect(ambito).not.toContain("footer");
  });

  it("sin <main>, mira todo el documento (snippet de componente)", () => {
    const html = '<button class="c-button">Enviar</button>';
    expect(ambitoDeTokens(html)).toBe(html);
  });
});

describe("clasesDeMain", () => {
  it("devuelve las clases del <main>, o vacío si no hay", () => {
    expect(clasesDeMain(GOLD)).toContain("container");
    expect(clasesDeMain("<body><p>x</p></body>")).toEqual([]);
  });
});

describe("utilidadesDelGold", () => {
  it("recoge todas las clases que usa el Gold, en cualquier elemento", () => {
    const utilidades = utilidadesDelGold(GOLD);
    expect(utilidades.has("container")).toBe(true);
    expect(utilidades.has("gap-base")).toBe(true); // la del header
    expect(utilidades.has("c-h1")).toBe(true);
  });

  it("exime las clases legadas del Gold (mr-2, pt-0.5) pero no otras del sistema", () => {
    const conLegado = '<main><div class="mr-2 pt-0.5 p-4">x</div></main>';
    const utilidades = utilidadesDelGold(conLegado);
    expect(utilidades.has("mr-2")).toBe(true);
    expect(utilidades.has("pt-0.5")).toBe(true);
    expect(utilidades.has("p-4")).toBe(true);
  });

  it("sin Gold no exime nada", () => {
    expect(utilidadesDelGold(undefined).size).toBe(0);
  });
});
