// apps/hub/evals/tools/studio/homework/checks.ts
import type { ToolCheckOut } from "../../../lib/adapterFactory";
import { frac, lower, mean, str, zorunluKip } from "../../../lib/sharedChecks";

export interface HomeworkBody {
  targetArea: string;
  duration: "10" | "15" | "20";
  parentLevel: "basic" | "detailed";
  materialType: "exercise" | "observation" | "daily_activity";
  extraNote?: string;
}
type Rec = Record<string, unknown>;
/** Temel veli düzeyinde geçmemesi gereken terimler. */
const TEKNIK = /fonem|fonolojik|artikülasyon|morfem|morfolojik|pragmatik|sentaks|semantik|reseptif|ekspresif|prozodi/u;

/** Dizi değilse boş; nesne olmayan öğe (null, metin) boş nesne sayılır — kontroller çökmesin, öğe sayısı korunsun. */
const recs = (v: unknown): Rec[] => (Array.isArray(v) ? v : []).map((x) => (x && typeof x === "object" ? (x as Rec) : {}));

export function homeworkChecks(args: { body: HomeworkBody; output: Rec | null; raw: Rec | null; text: string; alias: string | null }): ToolCheckOut {
  const { body, output } = args;
  const steps = recs(output?.steps);
  const hard: string[] = [];
  if (output && steps.length === 0) hard.push("adim_yok");
  const adimSayisi = steps.length >= 3 ? 1 : 0;
  const adimSira = steps.length && steps.every((s, i) => Number(s.stepNumber) === i + 1) ? 1 : 0;
  const materyal = Array.isArray(output?.materials) && (output!.materials as unknown[]).length ? 1 : 0;
  const alanlar = mean(["title", "introduction", "watchFor", "celebration", "frequency", "expertNotes", "adaptations"].map((k) => (str(output?.[k]).trim() ? 1 : 0)));
  const oneriKipi = steps.length ? frac(steps, (s) => !zorunluKip(str(s.instruction))) : 0;
  const veliMetni = [str(output?.introduction), ...steps.map((s) => `${str(s.instruction)} ${str(s.tip)}`), str(output?.watchFor), str(output?.celebration)].join(" ");
  const teknikTerim = body.parentLevel === "basic" ? (TEKNIK.test(lower(veliMetni)) ? 0 : 1) : 1;
  const scores = { adim_sayisi: adimSayisi, adim_sira: adimSira, materyal, alanlar, oneri_kipi: oneriKipi, teknik_terim: teknikTerim };
  return { scores: { ...scores, talimat: output ? mean(Object.values(scores)) : 0 }, details: { adim: steps.length, ...scores }, hard };
}
