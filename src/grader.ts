import type { Assert, Check, TipoCaso } from "./caso.js";
import { parseChecks } from "./caso.js";

export interface Artefactos {
  files: Record<string, string>;
}

export interface Transcript {
  invocaciones: string[];
}

export type { Assert, Check, TipoCaso };

export type Grade = "INACEPTABLE" | "ACEPTABLE" | "BUENO" | "EXCELENTE";

export interface DetalleCheck {
  id: string;
  severity: Check["severity"];
  passed: boolean;
}

export interface GradeResult {
  grade: Grade;
  detalle: DetalleCheck[];
}

export interface Evidencia {
  artefactos: Artefactos;
  transcript: Transcript;
}

const FRAMEWORK: Record<TipoCaso, Check[]> = {
  "caso-componente": [],
  "caso-pagina": [
    {
      id: "un-solo-h1",
      severity: "guard",
      weight: 0,
      assert: { kind: "un_solo_h1" },
    },
    {
      id: "skip-link",
      severity: "guard",
      weight: 0,
      assert: { kind: "skip_link" },
    },
    {
      id: "fieldset-con-legend",
      severity: "guard",
      weight: 0,
      assert: { kind: "fieldset_con_legend" },
    },
  ],
};

export function frameworkDeChecks(tipo: TipoCaso): Check[] {
  return FRAMEWORK[tipo].map((check) => ({ ...check }));
}

function html(artefactos: Artefactos): string {
  return Object.values(artefactos.files).join("\n");
}

function contar(html: string, re: RegExp): number {
  return (html.match(re) ?? []).length;
}

function evaluar(
  assert: Assert,
  artefactos: Artefactos,
  transcript: Transcript,
): boolean {
  const htmlText = html(artefactos);
  switch (assert.kind) {
    case "macro_presente":
      return Object.values(artefactos.files).some((archivo) =>
        archivo.includes(assert.macro),
      );
    case "un_solo_h1":
      return contar(htmlText, /<h1[\s>]/gi) === 1;
    case "skip_link":
      return /class="[^"]*skip-link[^"]*"/i.test(htmlText);
    case "fieldset_con_legend": {
      const fieldsets = htmlText.match(/<fieldset[\s>][\s\S]*?<\/fieldset>/gi) ?? [];
      return fieldsets.every((f) => /<legend[\s>]/i.test(f));
    }
    case "flujo_canonico": {
      let i = 0;
      for (const paso of transcript.invocaciones) {
        if (paso === assert.pasos[i]) i++;
        if (i === assert.pasos.length) break;
      }
      return i === assert.pasos.length;
    }
  }
}

export function grado(
  evidencia: Evidencia,
  caso: { tipo: TipoCaso; checks: Check[] },
): GradeResult {
  const checks = [...frameworkDeChecks(caso.tipo), ...caso.checks];

  const detalle: DetalleCheck[] = checks.map((check) => ({
    id: check.id,
    severity: check.severity,
    passed: evaluar(check.assert, evidencia.artefactos, evidencia.transcript),
  }));

  const guardFalla = detalle.some((d) => d.severity === "guard" && !d.passed);
  if (guardFalla) return { grade: "INACEPTABLE", detalle };

  let pesoTotal = 0;
  let pesoCumplido = 0;
  for (let i = 0; i < checks.length; i++) {
    const check = checks[i]!;
    if (check.severity !== "quality") continue;
    pesoTotal += check.weight;
    if (detalle[i]!.passed) pesoCumplido += check.weight;
  }

  const ratio = pesoTotal === 0 ? 1 : pesoCumplido / pesoTotal;
  const grade: Grade =
    ratio === 1 ? "EXCELENTE" : ratio >= 0.66 ? "BUENO" : "ACEPTABLE";

  return { grade, detalle };
}

export function gradoDeEvidencia(
  evidencia: Evidencia,
  caso: { tipo: TipoCaso; checksJson: string },
): GradeResult {
  return grado(evidencia, {
    tipo: caso.tipo,
    checks: parseChecks(caso.checksJson),
  });
}
