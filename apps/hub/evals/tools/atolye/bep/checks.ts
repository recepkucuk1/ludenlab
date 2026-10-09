// apps/hub/evals/tools/atolye/bep/checks.ts
import { ALAN, type Alan } from "@atolye/lib/bep";
import type { CheckResult } from "../../../lib/core";
import { ALT_KALIPLAR, OLCUT, TANI, TASLAK_NORM, basligiNormalle, bulletsUnder, notNormalize, sections } from "../../../lib/markdown";
import { dilKurali, frac, lower, mean, rumuzYok, yasakKalip } from "../../../lib/sharedChecks";

export interface BepBody {
  alanlar: Alan[];
  gucluYonler?: string;
  guclukAlanlari: string;
  ekNotlar?: string;
  mebHedefKod?: string;
  mebDavranisKodlari?: string[];
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Alan başlığında aranacak anahtar: parantez atılmış etiketin ilk kelimesi; kısaysa (ör. "öz") ilk iki kelime. */
function alanAnahtari(a: Alan): string {
  const w = basligiNormalle(ALAN[a].replace(/\(.*?\)/g, "")).split(" ").filter(Boolean);
  return (w[0]?.length ?? 0) >= 4 ? w[0]! : w.slice(0, 2).join(" ");
}

export function bepChecks(args: { body: BepBody; output: unknown; rawText: string; alias: string | null }): CheckResult {
  const { body, output, rawText, alias } = args;
  const text = typeof output === "string" ? output : "";
  const dolu = text.trim().length > 0;
  const hard: string[] = [];
  if (!dolu) hard.push("cikti_yok");

  const alanSayisi = Math.max(1, body.alanlar.length);
  const secs = sections(text);
  // Alan başlığı: `##` ya da hiçbir `##` başlığının altında olmayan (üst düzey) kalın sözde başlık.
  const ilkIki = secs.findIndex((s) => s.level === 2);
  const alanBasliklari = secs
    .filter((s, i) => s.level === 2 || (s.level === "bold" && (ilkIki < 0 || i < ilkIki)))
    .map((s) => s.heading);
  const alanFrac = frac(body.alanlar, (a) => alanBasliklari.some((h) => h.includes(alanAnahtari(a))));
  const altFrac = mean(ALT_KALIPLAR.map((re) => Math.min(1, secs.filter((s) => re.test(s.heading)).length / alanSayisi)));

  const hedefler = bulletsUnder(text, ALT_KALIPLAR[1]!).map(lower);
  const olcutluHedef = hedefler.length ? frac(hedefler, (h) => OLCUT.test(h)) : 0;
  const hedefSayisiOk = hedefler.length >= 3 * alanSayisi && hedefler.length <= 6 * alanSayisi ? 1 : 0;

  const satirlar = text.split("\n").filter((l) => l.trim());
  const metinNorm = notNormalize(text);
  const taslakSonda =
    notNormalize(satirlar[satirlar.length - 1] ?? "").includes(TASLAK_NORM) || metinNorm.endsWith(TASLAK_NORM) ? 1 : 0;
  if (dolu && !metinNorm.includes(TASLAK_NORM)) hard.push("taslak_notu_yok");

  const kodRe = body.mebHedefKod ? new RegExp(`(?<![\\d.])${esc(body.mebHedefKod.trim())}(?!\\d)`, "u") : null;
  // Kod verildiyse: kodu (ya da alt kodunu, ör. 3.2.5 → 3.2.5.1) taşıyan kısa dönem hedeflerin oranı.
  const mebKod = kodRe ? frac(hedefler, (h) => kodRe.test(h)) : null;
  const isbirligi = /iş\s?birliği/u.test(lower(text)) ? 1 : 0;
  const taniCumlesi = TANI.test(lower(text)) ? 1 : 0;

  const talimat = dolu
    ? mean([alanFrac, altFrac, olcutluHedef, hedefSayisiOk, taslakSonda, mebKod ?? 1, isbirligi, taniCumlesi ? 0 : 1])
    : 0;

  // Atölye: "(dil ve) konuşma terapisti" meşru unvandır (ATOLYE_SYSTEM dil-konuşma katkısını ister).
  const dk = dilKurali(rawText, { konusmaTerapistiMuaf: true });
  const yk = yasakKalip(rawText);
  const rz = rumuzYok(text, alias);
  if (dk.score === 0) hard.push("dil_kurali");
  if (rz === 0) hard.push("rumuz_sizintisi");

  const details: CheckResult["details"] = {
    alan_basliklari: alanFrac,
    alt_bolumler: altFrac,
    hedef_sayisi: hedefler.length,
    hedef_sayisi_ok: hedefSayisiOk,
    olcutlu_hedef: olcutluHedef,
    taslak_sonda: taslakSonda,
    meb_kod: mebKod ?? "—",
    isbirligi,
    tani_cumlesi: taniCumlesi,
    hasta: dk.hasta,
    terapist: dk.terapist,
    odul: dk.odul,
    yasak_kalip: yk.found.join("|"),
  };
  return { scores: { talimat, dil_kurali: dk.score, rumuz_yok: rz, yasak_kalip: yk.score }, details, hard_fail: hard };
}
