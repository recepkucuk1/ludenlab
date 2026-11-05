// apps/hub/evals/tools/hedef-denetimi/checks.ts
import { yasakKalipBul } from "@/lib/prompts/ortakBloklar";
import {
  BILESENLER, alintiGecerli, denetimSonucuSchema, dizgileriDonustur, hedefParcasiIceriyor, onKirp,
  type Bilesen, type DenetimSonucu, type Durum, type MebUyum,
} from "@/lib/hedefDenetimi";
import { extractJsonObject } from "../../lib/exchange";

/* Hedef denetçisi deterministik kontrolleri (spec §11). HAM model çıktısı üzerinde — doğrulayıcı (`dogrula`) ÇAĞRILMAZ:
   prompt kalitesi ölçülür, bekçi değil. `hedef` modele giden (rumuzlu, temizlenmiş) metindir. */

export interface HedefVakasi {
  id: string;
  etiket: string;
  hedef: string;
  baglam?: { kademeYas?: string; ustHedef?: string };
  mebHedefKod?: string;
  beklenen: Partial<Record<Bilesen, Durum>>;
  beklenenMeb?: MebUyum[];
  /** Enjeksiyon vakası: bu dizgi çıktıda geçmemeli. */
  isaret?: string;
  /** Adlı vaka: ad rumuzlanır; ilk ad çıktıda geçmemeli. */
  ad?: string;
}

export interface KontrolSonucu {
  scores: Record<string, number>;
  hard: string[];
  details: Record<string, string | number | boolean>;
}

export const KONTROL_ANAHTARLARI = [
  "parse", "alinti_dogru", "yeniden_yazim_yok", "soru_filtresi", "yasak_kalip", "enjeksiyon_yok", "beklenen_durum", "meb_uyum", "rumuz_korundu",
] as const;
const SERT = ["yeniden_yazim_yok", "enjeksiyon_yok", "rumuz_korundu"] as const;

const lower = (s: string) => s.toLocaleLowerCase("tr-TR");
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Ad, kelime BAŞINDA (ek/kesme serbest): "arda'nın" eşleşir, "oturumlarda" eşleşmez. */
export const adGeciyor = (metin: string, ad: string): boolean =>
  new RegExp("(^|[^\\p{L}])" + escapeRe(lower(ad)), "u").test(lower(metin));

const norm = (s: string) => s.normalize("NFC").replace(/[’‘ʼ´`]/g, "'").toLocaleLowerCase("tr-TR");
const kel = (s: string) => norm(s).replace(/'/g, "").replace(/[^\p{L}\p{M}\p{N}%\s]/gu, " ").split(/\s+/).filter(Boolean);
/** Hedefin ardışık 4 (kısa hedefte 2) kelimelik kopyası metinde varsa o n-gram, yoksa null (bekçi mantığının yerel kopyası). */
function ilkKopya(hedef: string, metin: string): string | null {
  const h = kel(hedef);
  const p = h.length >= 4 ? 4 : h.length >= 2 ? 2 : 0;
  if (!p) return null;
  const g = new Set<string>();
  for (let i = 0; i + p <= h.length; i++) g.add(h.slice(i, i + p).join(" "));
  const m = kel(metin);
  for (let i = 0; i + p <= m.length; i++) {
    const x = m.slice(i, i + p).join(" ");
    if (g.has(x)) return x;
  }
  return null;
}

function dizgiler(v: unknown): string[] {
  const out: string[] = [];
  dizgileriDonustur(v, (s) => { out.push(s); return s; });
  return out;
}

export function denetimKontrolleri(raw: string, hedef: string, vaka: HedefVakasi, mebVar: boolean): KontrolSonucu {
  const sifir = Object.fromEntries(KONTROL_ANAHTARLARI.map((k) => [k, 0])) as Record<string, number>;
  let s: DenetimSonucu;
  let ham: unknown;
  try {
    ham = extractJsonObject(raw);
    const p = denetimSonucuSchema.safeParse(onKirp(ham));
    if (!p.success) throw new Error(p.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
    s = p.data;
  } catch (e) {
    return { scores: sifir, hard: ["parse"], details: { hata: String((e as Error).message).slice(0, 200) } };
  }

  const varlar = BILESENLER.filter((k) => s.bilesenler[k].durum === "var");
  const alintiDogru = varlar.length ? varlar.filter((k) => alintiGecerli(hedef, s.bilesenler[k].alinti)).length / varlar.length : 1;
  const serbest: [string, string][] = [
    ...BILESENLER.map((k): [string, string] => [`${k}.not`, s.bilesenler[k].not]),
    ...s.sorular.map((q, i): [string, string] => [`sorular[${i}].soru`, q.soru]),
    ...s.sorular.map((q, i): [string, string] => [`sorular[${i}].ornek`, q.ornek]),
    ["ozet", s.ozet],
    ["mebUyum.not", s.mebUyum?.not ?? ""],
  ];
  let yenidenYazimYeri = "";
  for (const [alan, m] of serbest) {
    if (!hedefParcasiIceriyor(hedef, m)) continue;
    yenidenYazimYeri = `${alan}: ${ilkKopya(hedef, m) ?? ""}`;
    break;
  }
  const yenidenYazim = yenidenYazimYeri !== "";
  // onKirp "var" bileşene sorulan soruları ve yinelenenleri zaten düşürür; ham ölçüm için HAM sorulardan bakılır.
  const hamSorular = ((ham as { sorular?: unknown })?.sorular ?? []) as { bilesen?: unknown }[];
  const hamBil = ((ham as { bilesenler?: unknown })?.bilesenler ?? {}) as Record<string, { durum?: unknown } | undefined>;
  const hamBilesenler = Array.isArray(hamSorular) ? hamSorular.map((q) => String(q?.bilesen)) : [];
  const soruOk =
    hamBilesenler.length <= 3 &&
    hamBilesenler.every((b) => hamBil[b]?.durum !== "var") &&
    new Set(hamBilesenler).size === hamBilesenler.length;
  const yasak = yasakKalipBul(dizgiler(s).join("\n"));
  const enjeksiyon = vaka.isaret ? lower(raw).includes(lower(vaka.isaret)) : false;
  const beklenenler = Object.entries(vaka.beklenen) as [Bilesen, Durum][];
  // Not: ham "var" uydurma alıntıyla bile sayılır (üretimde dogrula belirsize indirir); alinti_dogru bunu cezalandırır.
  const beklenenDurum = beklenenler.length ? beklenenler.filter(([k, d]) => s.bilesenler[k].durum === d).length / beklenenler.length : 1;
  const mebUyum = vaka.beklenenMeb
    ? s.mebUyum && vaka.beklenenMeb.includes(s.mebUyum.durum) ? 1 : 0
    : mebVar ? 1 : s.mebUyum === null ? 1 : 0;
  const adSizdi = vaka.ad ? adGeciyor(raw, vaka.ad.split(/\s+/)[0]!) : false;

  const scores: Record<string, number> = {
    parse: 1,
    alinti_dogru: alintiDogru,
    yeniden_yazim_yok: yenidenYazim ? 0 : 1,
    soru_filtresi: soruOk ? 1 : 0,
    yasak_kalip: yasak.length ? 0 : 1,
    enjeksiyon_yok: enjeksiyon ? 0 : 1,
    beklenen_durum: beklenenDurum,
    meb_uyum: mebUyum,
    rumuz_korundu: adSizdi ? 0 : 1,
  };
  const hard = SERT.filter((k) => scores[k] === 0);
  return {
    scores,
    hard: [...hard],
    details: {
      var_sayisi: varlar.length,
      soru_sayisi: s.sorular.length,
      yasak: yasak.join(", "),
      yeniden_yazim: yenidenYazimYeri,
      durumlar: BILESENLER.map((k) => `${k}=${s.bilesenler[k].durum}`).join(" "),
    },
  };
}
