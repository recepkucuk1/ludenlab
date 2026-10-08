// apps/hub/evals/tools/studio/social-story/checks.ts
import type { CheckResult } from "../../../lib/core";
import { dilKurali, frac, mean, parseJsonLoose, rumuzYok, str, yasakKalip } from "../../../lib/sharedChecks";

export interface SocialStoryBody {
  situation: string;
  environment: "Okul" | "Ev" | "Park" | "Market" | "Hastane" | "Rehabilitasyon merkezi";
  length: "short" | "medium" | "long";
}

const LEN: Record<SocialStoryBody["length"], [number, number]> = { short: [3, 5], medium: [6, 10], long: [11, 15] };
const TYPES = new Set(["descriptive", "perspective", "directive", "affirmative"]);
const ZORUNLU = /(malısın|melisin|malıyım|meliyim|zorundasın|zorundayım)(?!\p{L})/iu;

export function socialStoryChecks(args: { body: SocialStoryBody; output: unknown; rawText: string; alias: string | null }): CheckResult {
  const { body, output, rawText, alias } = args;
  const raw = parseJsonLoose(rawText);
  const story = (output ?? null) as Record<string, unknown> | null;
  const sents = (Array.isArray(story?.sentences) ? story!.sentences : []) as Record<string, unknown>[];
  const hard: string[] = [];
  const details: CheckResult["details"] = {};

  if (!raw) hard.push("json_gecersiz");
  if (!story) hard.push("cikti_yok");

  const [lo, hi] = LEN[body.length];
  const n = sents.length;
  const countOk = n >= lo && n <= hi ? 1 : 0;
  if (story && !countOk) hard.push(`cumle_sayisi_${n}`);
  const tipFrac = frac(sents, (s) => TYPES.has(str(s.type)));
  const tanimlayiciOran = n ? sents.filter((s) => str(s.type) === "descriptive").length / n : 0;
  const gorselFrac = frac(sents, (s) => str(s.visualPrompt).trim().length > 0);
  const metinFrac = frac(sents, (s) => str(s.text).trim().length > 0);
  const yonlendirici = sents.filter((s) => str(s.type) === "directive");
  const yonlendiriciDil = yonlendirici.length ? frac(yonlendirici, (s) => !ZORUNLU.test(str(s.text))) : 1;
  const alanlar = mean([str(story?.title).trim() ? 1 : 0, str(story?.expertNotes).trim() ? 1 : 0, str(story?.homeGuidance).trim() ? 1 : 0]);
  const talimat = story && raw ? mean([countOk, tipFrac, tanimlayiciOran >= 0.5 ? 1 : 0, gorselFrac, metinFrac, yonlendiriciDil, alanlar]) : 0;

  const dk = dilKurali(rawText);
  const yk = yasakKalip(rawText);
  const rz = rumuzYok(output, alias);
  if (dk.score === 0) hard.push("dil_kurali");
  if (rz === 0) hard.push("rumuz_sizintisi");

  Object.assign(details, {
    cumle: n,
    tip_gecerli: tipFrac,
    tanimlayici_oran: tanimlayiciOran,
    gorsel_dolu: gorselFrac,
    yonlendirici_dil: yonlendiriciDil,
    alanlar,
    hasta: dk.hasta,
    terapist: dk.terapist,
    odul: dk.odul,
    yasak_kalip: yk.found.join("|"),
  });
  return { scores: { talimat, dil_kurali: dk.score, rumuz_yok: rz, yasak_kalip: yk.score }, details, hard_fail: hard };
}
