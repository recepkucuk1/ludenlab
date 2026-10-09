// apps/hub/evals/tools/studio/social-story/checks.ts
import type { ToolCheckOut } from "../../../lib/adapterFactory";
import type { CheckResult } from "../../../lib/core";
import { frac, mean, str, zorunluKip } from "../../../lib/sharedChecks";

export interface SocialStoryBody {
  situation: string;
  environment: "Okul" | "Ev" | "Park" | "Market" | "Hastane" | "Rehabilitasyon merkezi";
  length: "short" | "medium" | "long";
}

const LEN: Record<SocialStoryBody["length"], [number, number]> = { short: [3, 5], medium: [6, 10], long: [11, 15] };
const TYPES = new Set(["descriptive", "perspective", "directive", "affirmative"]);
/** Carol Gray: betimleyici (tanımlayıcı + perspektif + olumlu) cümleler yönlendiricilerin en az iki katı. */
const BETIMLEYICI = new Set(["descriptive", "perspective", "affirmative"]);

const zorunlu = (s: Record<string, unknown>) => zorunluKip(str(s.text));

/** Sosyal hikâyeye özgü kontroller (fabrikanın `checks` imzası). JSON geçerliliği, çıktı varlığı, dil kuralı,
    rumuz ve yasak kalıp `studioAdapter`da ortaktır. */
export function socialStoryChecks(args: { body: SocialStoryBody; output: unknown; raw: Record<string, unknown> | null }): ToolCheckOut {
  const { body, output, raw } = args;
  const story = (output ?? null) as Record<string, unknown> | null;
  const sents = (Array.isArray(story?.sentences) ? story!.sentences : []) as Record<string, unknown>[];
  const hard: string[] = [];

  const [lo, hi] = LEN[body.length];
  const n = sents.length;
  // Bütçeden ±1 sapma yalnız puanı düşürür (countOk); daha fazlası ya da boş hikâye sert hatadır.
  const countOk = n >= lo && n <= hi ? 1 : 0;
  if (story && (n === 0 || n < lo - 1 || n > hi + 1)) hard.push("cumle_sayisi");
  const tipFrac = frac(sents, (s) => TYPES.has(str(s.type)));
  const tanimlayiciOran = n ? sents.filter((s) => str(s.type) === "descriptive").length / n : 0;
  const yonlendiriciler = sents.filter((s) => str(s.type) === "directive");
  const betimleyici = sents.filter((s) => BETIMLEYICI.has(str(s.type))).length;
  const yonlendirici = yonlendiriciler.length;
  const grayOk = yonlendirici === 0 ? 1 : betimleyici >= 2 * yonlendirici ? 1 : 0;
  const gorselFrac = frac(sents, (s) => str(s.visualPrompt).trim().length > 0);
  const metinFrac = frac(sents, (s) => str(s.text).trim().length > 0);
  const yonlendiriciDil = yonlendirici ? frac(yonlendiriciler, (s) => !zorunlu(s)) : 1;
  const zorunluToplam = sents.filter(zorunlu).length;
  const alanlar = mean([str(story?.title).trim() ? 1 : 0, str(story?.expertNotes).trim() ? 1 : 0, str(story?.homeGuidance).trim() ? 1 : 0]);
  const talimat = story && raw ? mean([countOk, tipFrac, grayOk, gorselFrac, metinFrac, yonlendiriciDil, alanlar]) : 0;

  const details: CheckResult["details"] = {
    cumle: n,
    tip_gecerli: tipFrac,
    tanimlayici_oran: tanimlayiciOran,
    gray_orani_ok: grayOk,
    gorsel_dolu: gorselFrac,
    yonlendirici_dil: yonlendiriciDil,
    zorunlu_toplam: zorunluToplam,
    alanlar,
  };
  return { scores: { talimat }, details, hard };
}
