import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, dirname, sep } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readPin } from "../src/pin.js";
import {
  createSandbox,
  datosDirDeHome,
  entornoDelSandbox,
  skillsDirDeConfig,
  VENDOR_SKILLS_DIR,
} from "../src/runner.js";

const pin = readPin(join(process.cwd(), "pin.json"));

function skillsVendoreados(): string[] {
  return readdirSync(VENDOR_SKILLS_DIR).filter((entry) =>
    existsSync(join(VENDOR_SKILLS_DIR, entry, "SKILL.md")),
  );
}

describe("createSandbox", () => {
  let cleanup: (() => void) | undefined;

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
  });

  it("crea un HOME/config temporal aislado por Ejecución", () => {
    const sandbox = createSandbox();
    cleanup = () => sandbox.cleanup();

    expect(existsSync(sandbox.home)).toBe(true);
    expect(existsSync(sandbox.configDir)).toBe(true);
    expect(existsSync(sandbox.workDir)).toBe(true);
    expect(sandbox.configDir.startsWith(tmpdir())).toBe(true);
  });

  it("expone el skillsDir en la ruta que descubre opencode V2 (<config>/opencode/skills)", () => {
    const sandbox = createSandbox();
    cleanup = () => sandbox.cleanup();

    // No es `~/.config/opencode/skills`: V2 no escanea esa ruta y la skill falla
    // al cargar (medido en la 2.1.2, ADR-0013).
    //
    // La raíz de config es la del `HOME` del sandbox (`home/.config`), que es lo
    // que va en `XDG_CONFIG_HOME` menos el `opencode` final. Antes se le pasaba a
    // `skillsDirDeConfig` el `configDir` —que ya termina en `opencode`— y este
    // test, construido sobre la misma confusión, fijaba
    // `…/opencode/opencode/skills` como correcto.
    const raizConfig = join(sandbox.home, ".config");
    expect(sandbox.configDir).toBe(join(raizConfig, "opencode"));
    expect(sandbox.skillsDir).toBe(skillsDirDeConfig(raizConfig));
    expect(sandbox.skillsDir).toBe(join(raizConfig, "opencode", "skills"));
    expect(existsSync(sandbox.skillsDir)).toBe(true);

    // Y lo que `opencode.jsonc` declara es exactamente esa ruta.
    sandbox.configurar();
    const config = JSON.parse(readFileSync(join(sandbox.configDir, "opencode.jsonc"), "utf8"));
    expect(config.skills).toEqual([sandbox.skillsDir]);
    expect(config.skills[0]).not.toContain(`opencode${sep}opencode`);
  });

  it("copia los skills del Pin al skillsDir que descubre el SUT", () => {
    const sandbox = createSandbox();
    cleanup = () => sandbox.cleanup();

    sandbox.copySkills();

    for (const skill of skillsVendoreados()) {
      const copied = join(sandbox.skillsDir, skill, "SKILL.md");
      expect(existsSync(copied)).toBe(true);
      expect(readFileSync(copied)).toEqual(
        readFileSync(join(VENDOR_SKILLS_DIR, skill, "SKILL.md")),
      );
    }
  });

  it("recolecta los artefactos del directorio pedido, sin el resto del working dir", () => {
    const sandbox = createSandbox();
    cleanup = () => sandbox.cleanup();

    mkdirSync(join(sandbox.workDir, "dist"));
    mkdirSync(join(sandbox.workDir, "src"));
    writeFileSync(join(sandbox.workDir, "dist", "pagina.html"), "<h1>Hola</h1>");
    writeFileSync(join(sandbox.workDir, "src", "pagina.html"), "{% block x %}");
    writeFileSync(join(sandbox.workDir, "nota.txt"), "no es output");

    expect(sandbox.listArtefactos("src")).toEqual([
      { path: "src/pagina.html", contenido: "{% block x %}" },
    ]);
    expect(sandbox.listArtefactos("dist")).toEqual([
      { path: "dist/pagina.html", contenido: "<h1>Hola</h1>" },
    ]);
  });

  it("al limpiarse elimina el sandbox y no toca la instalación real de skills", () => {
    const sandbox = createSandbox();
    sandbox.copySkills();
    const root = sandbox.home;

    sandbox.cleanup();

    expect(existsSync(root)).toBe(false);
    expect(existsSync(VENDOR_SKILLS_DIR)).toBe(true);
  });

  it("configurar deja el opencode.jsonc que encierra el sandbox y copia solo el auth.json", () => {
    // HOME real de mentira: el test no lee ni toca el del usuario que lo corre.
    const homeReal = mkdtempSync(join(tmpdir(), "home-real-"));
    const authReal = join(datosDirDeHome(homeReal), "auth.json");
    mkdirSync(dirname(authReal), { recursive: true });
    writeFileSync(authReal, '{"deepinfra":{"type":"api"}}');
    writeFileSync(join(homeReal, "no-copiar.txt"), "estado del usuario");
    const sandbox = createSandbox({ homeReal });
    cleanup = () => {
      sandbox.cleanup();
      rmSync(homeReal, { recursive: true, force: true });
    };

    sandbox.copySkills();
    sandbox.configurar();

    const config = JSON.parse(readFileSync(join(sandbox.configDir, "opencode.jsonc"), "utf8"));
    expect(config.policies).toEqual([
      { action: "provider.use", resource: "*", effect: "deny" },
      { action: "provider.use", resource: "deepinfra", effect: "allow" },
    ]);
    expect(config.permissions).toContainEqual({
      action: "external_directory",
      resource: "*",
      effect: "deny",
    });
    expect(config.skills).toEqual([sandbox.skillsDir]);
    expect(readFileSync(join(datosDirDeHome(sandbox.home), "auth.json"))).toEqual(
      readFileSync(authReal),
    );
    // Solo las cuentas: nada más del HOME real entra en el sandbox.
    expect(existsSync(join(sandbox.home, "no-copiar.txt"))).toBe(false);
  });

  it("datosDirDeHome sigue a HOME en las tres plataformas, macOS incluida", () => {
    // Medido con `opencode debug paths` en la 2.2.1: el directorio de datos sale
    // de `HOME` también en macOS (`~/.local/share/opencode`), no de
    // `~/Library/Application Support`. La regla de la 2.1.2 caducó con el binario,
    // y una ruta que caduca en silencio rompe los tests con un error que habla de
    // la máquina (ADR-0013). Las tres ramas se prueban sin depender de la
    // plataforma actual.
    expect(datosDirDeHome("/home/ana", "linux")).toBe("/home/ana/.local/share/opencode");
    expect(datosDirDeHome("C:\\Users\\ana", "win32")).toBe(
      "C:\\Users\\ana/.local/share/opencode",
    );
    expect(datosDirDeHome("/Users/ana/", "darwin")).toBe("/Users/ana/.local/share/opencode");
  });

  it("un auth.json en la ruta que usaba la 2.1.2 no cuenta: el de macOS es el de HOME", () => {
    // El escenario adversario, entero: el fichero que la ruta vieja buscaba
    // **existe**, y el de la ruta real **no**. Un `configurar()` que siguiera
    // mirando `Application Support` copiaría el viejo y este test pasaría por el
    // motivo equivocado; con la regla nueva se niega y lo dice.
    const homeReal = mkdtempSync(join(tmpdir(), "home-real-viejo-"));
    const authViejo = join(homeReal, "Library", "Application Support", "opencode", "auth.json");
    mkdirSync(dirname(authViejo), { recursive: true });
    writeFileSync(authViejo, '{"deepinfra":{"type":"api"}}');
    const sandbox = createSandbox({ homeReal });
    cleanup = () => {
      rmSync(homeReal, { recursive: true, force: true });
    };

    try {
      sandbox.copySkills();
      expect(() => sandbox.configurar()).toThrow(/auth\.json/);
      expect(existsSync(join(datosDirDeHome(sandbox.home), "auth.json"))).toBe(false);
    } finally {
      sandbox.cleanup();
      cleanup = undefined;
    }
  });

  it("entornoDelSandbox lleva la clave de cada proveedor que el auth.json declare", () => {
    // Ticket 15: con la 2.2.1, copiar `auth.json` no basta para que el SUT
    // resuelva el modelo, porque el catálogo de proveedores no viaja. Lo que sí
    // funciona —medido, y con la clave incorrecta da otro error— es la
    // **variable de entorno** del proveedor. El sandbox ya hereda `process.env`,
    // así que la clave se pone ahí desde el `auth.json` que el propio sandbox
    // copia: no viaja nada nuevo del usuario, y el mantenedor no exporta nada.
    const homeReal = mkdtempSync(join(tmpdir(), "home-real-entorno-"));
    const authReal = join(datosDirDeHome(homeReal), "auth.json");
    mkdirSync(dirname(authReal), { recursive: true });
    writeFileSync(
      authReal,
      JSON.stringify({ deepinfra: { type: "api", key: "clave-de-fixture" } }),
    );
    const sandbox = createSandbox({ homeReal });
    cleanup = () => {
      rmSync(homeReal, { recursive: true, force: true });
    };

    try {
      const entorno = entornoDelSandbox({
        home: sandbox.home,
        configDir: sandbox.configDir,
        workDir: sandbox.workDir,
        authOrigen: authReal,
      });

      expect(entorno["DEEPINFRA_API_KEY"]).toBe("clave-de-fixture");
      // Y el entorno del SUT pinta `PWD` con su `workDir` (ticket 16, ADR-0019):
      // sin él, las rutas relativas del SUT caen en el directorio del lanzador.
      expect(entorno["PWD"]).toBe(sandbox.workDir);
    } finally {
      sandbox.cleanup();
      cleanup = undefined;
    }
  });
});
