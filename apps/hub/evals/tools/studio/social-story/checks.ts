// apps/hub/evals/tools/studio/social-story/checks.ts
import type { CheckResult } from "../../../lib/core";
import { dilKurali, frac, lower, mean, metinler, parseJsonLoose, rumuzYok, str, yasakKalip } from "../../../lib/sharedChecks";

export interface SocialStoryBody {
  situation: string;
  environment: "Okul" | "Ev" | "Park" | "Market" | "Hastane" | "Rehabilitasyon merkezi";
  length: "short" | "medium" | "long";
}

const LEN: Record<SocialStoryBody["length"], [number, number]> = { short: [3, 5], medium: [6, 10], long: [11, 15] };
const TYPES = new Set(["descriptive", "perspective", "directive", "affirmative"]);
/** Carol Gray: betimleyici (tanımlayıcı + perspektif + olumlu) cümleler yönlendiricilerin en az iki katı. */
const BETIMLEYICI = new Set(["descriptive", "perspective", "affirmative"]);

/** Zorunluluk kipi: -malı/-meli (kişi/bildirme ekli ya da cümle sonunda yalın), "zorunda", "gerek(ir|iyor)/lazım/şart".
    Küçük harfe (tr-TR) indirilmiş metne uygulanır. */
const ZORUNLU = new RegExp(
  [
    "(?<=\\p{L})(?:malı(?:yım|sın(?:ız)?|yız|dır|lar)|meli(?:yim|sin(?:iz)?|yiz|dir|ler))(?!\\p{L})",
    "(?<=\\p{L})(?:malı|meli)(?=\\s*(?:[.!?…]|$))",
    "(?<!\\p{L})zorunda(?:yım|sın(?:ız)?|yız|dır|lar)?(?!\\p{L})",
    "(?<!\\p{L})(?:gerek(?:ir|iyor)|lazım|şart(?:tır)?)(?!\\p{L})",
  ].join("|"),
  "u",
);
const zorunlu = (s: Record<string, unknown>) => ZORUNLU.test(lower(str(s.text)));

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

  // JSON dışındaki düzyazı uzmana hiç ulaşmaz: dil/kalıp kontrolü çözülen JSON'un string'lerine bakar; çözülemezse ham metne.
  // JSON.stringify DEĞİL: "\n" kaçışı satır başındaki sözcüğün önüne bir harf yapıştırır ("\nTerapist" → "nterapist").
  const gorunen = raw ? metinler(raw).join("\n") : rawText;
  const dk = dilKurali(gorunen);
  const yk = yasakKalip(gorunen);
  const rz = rumuzYok(output, alias);
  if (dk.score === 0) hard.push("dil_kurali");
  if (rz === 0) hard.push("rumuz_sizintisi");

  Object.assign(details, {
    cumle: n,
    tip_gecerli: tipFrac,
    tanimlayici_oran: tanimlayiciOran,
    gray_orani_ok: grayOk,
    gorsel_dolu: gorselFrac,
    yonlendirici_dil: yonlendiriciDil,
    zorunlu_toplam: zorunluToplam,
    alanlar,
    hasta: dk.hasta,
    terapist: dk.terapist,
    odul: dk.odul,
    yasak_kalip: yk.found.join("|"),
  });
  return { scores: { talimat, dil_kurali: dk.score, rumuz_yok: rz, yasak_kalip: yk.score }, details, hard_fail: hard };
}
