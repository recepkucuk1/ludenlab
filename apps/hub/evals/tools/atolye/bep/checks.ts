// apps/hub/evals/tools/atolye/bep/checks.ts
import { ALAN, TASLAK_NOTU, type Alan } from "@atolye/lib/bep";
import type { CheckResult } from "../../../lib/core";
import { dilKurali, frac, lower, markdownHeadings, mean, rumuzYok, yasakKalip } from "../../../lib/sharedChecks";

export interface BepBody {
  alanlar: Alan[];
  gucluYonler?: string;
  guclukAlanlari: string;
  ekNotlar?: string;
  mebHedefKod?: string;
  mebDavranisKodlari?: string[];
}

/** Ölçülebilir hedef imzası: yüzde, oran, ardışık/denemede, sayı+birim. */
const OLCUT = /%\s?\d|\d+\s?\/\s?\d+|ardışık|\d+\s+denemede|\d+\s+(kelime|dakika|saniye|hece|soru)/iu;
const TANI = /(disleksi|dehb|diskalkuli|disgrafi)k?'?(dir|dır|tir|tır)(?!\p{L})|tanısı (vardır|konmuştur|mevcuttur)/iu;
const ALT_BOLUMLER = ["uzun dönem", "kısa dönem", "yöntem", "ölçme"];

function bulletsUnder(text: string, heading: RegExp): string[] {
  const lines = text.split("\n");
  const out: string[] = [];
  let inside = false;
  for (const l of lines) {
    if (/^#{2,3}\s/.test(l)) inside = heading.test(l);
    else if (inside && /^\s*[-*]\s+/.test(l)) out.push(l.replace(/^\s*[-*]\s+/, ""));
  }
  return out;
}

export function bepChecks(args: { body: BepBody; output: unknown; rawText: string; alias: string | null }): CheckResult {
  const { body, output, rawText, alias } = args;
  const text = typeof output === "string" ? output : "";
  const hard: string[] = [];
  const details: CheckResult["details"] = {};
  if (!text.trim()) hard.push("cikti_yok");

  const headings = markdownHeadings(text).map(lower);
  const alanFrac = frac(body.alanlar, (a) => headings.some((h) => h.includes(lower(ALAN[a]).split(" ")[0]!)));
  const altFrac = mean(ALT_BOLUMLER.map((b) => Math.min(1, headings.filter((h) => h.includes(b)).length / body.alanlar.length)));
  const hedefler = bulletsUnder(text, /kısa dönem/i);
  const olcutluHedef = hedefler.length ? frac(hedefler, (h) => OLCUT.test(h)) : 0;
  const taslakVar = text.trim().endsWith(TASLAK_NOTU) ? 1 : 0;
  if (text.trim() && !taslakVar) hard.push("taslak_notu_yok");
  const mebKod = body.mebHedefKod ? (text.includes(body.mebHedefKod) ? 1 : 0) : 1;
  const isbirligi = /iş\s?birliği/iu.test(text) ? 1 : 0;
  const taniCumlesi = TANI.test(text) ? 1 : 0;

  const talimat = text.trim() ? mean([alanFrac, altFrac, olcutluHedef, taslakVar, mebKod, isbirligi, taniCumlesi ? 0 : 1]) : 0;

  const dk = dilKurali(rawText);
  const yk = yasakKalip(rawText);
  const rz = rumuzYok(text, alias);
  if (dk.score === 0) hard.push("dil_kurali");
  if (rz === 0) hard.push("rumuz_sizintisi");

  Object.assign(details, {
    alan_basliklari: alanFrac,
    alt_bolumler: altFrac,
    hedef_sayisi: hedefler.length,
    olcutlu_hedef: olcutluHedef,
    taslak_notu: taslakVar,
    meb_kod: body.mebHedefKod ? (text.includes(body.mebHedefKod) ? 1 : 0) : "—",
    isbirligi,
    tani_cumlesi: taniCumlesi,
    hasta: dk.hasta,
    terapist: dk.terapist,
    odul: dk.odul,
    yasak_kalip: yk.found.join("|"),
  });
  return { scores: { talimat, dil_kurali: dk.score, rumuz_yok: rz, yasak_kalip: yk.score }, details, hard_fail: hard };
}
