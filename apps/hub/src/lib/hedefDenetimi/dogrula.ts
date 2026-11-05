// apps/hub/src/lib/hedefDenetimi/dogrula.ts
import { BILESENLER, BUTCE, MEB_UYUM, denetimSonucuSchema, type DenetimGirdisi, type DenetimSonucu } from "./schema";

/* Sunucu doğrulayıcı (spec §4.3) — "yeniden yazmaz" ilkesinin teknik güvencesi:
   önce kırp → şema → alıntı doğrulama → yeniden yazım bekçisi → soru filtresi → MEB. */

export class DenetimHatasi extends Error {
  constructor(
    public kod: "parse",
    mesaj = "Denetim çıktısı çözülemedi",
  ) {
    super(mesaj);
    this.name = "DenetimHatasi";
  }
}

export const OZET_YEDEK = "Hedefin bileşenleri yukarıda işaretlendi.";

/** Tek normalizasyon: NFC, tipografik kesmeler → ', tr-TR küçük harf, boşluk tekleme. */
const normalize = (s: string) =>
  s.normalize("NFC").replace(/[’‘ʼ´`]/g, "'").toLocaleLowerCase("tr-TR").replace(/\s+/g, " ").trim();
/** Kesmeler hiçe iner ("8'inde" → "8inde", tek sözcük); diğer noktalama boşluk olur. */
const kelimeler = (s: string) =>
  normalize(s).replace(/'/g, "").replace(/[^\p{L}\p{M}\p{N}%\s]/gu, " ").split(/\s+/).filter(Boolean);

/** Alıntı, hedef metninin (normalize) alt dizisi mi? Boş alıntı geçersiz. */
export function alintiGecerli(hedef: string, alinti: string): boolean {
  const a = normalize(alinti);
  return a.length > 0 && normalize(hedef).includes(a);
}

/** Bekçi penceresi: hedef ≥4 kelime → 4; 2–3 kelime → 2; daha kısa → 0 (bekçi kapalı). */
export function bekciPenceresi(hedef: string): number {
  const n = kelimeler(hedef).length;
  return n >= 4 ? 4 : n >= 2 ? 2 : 0;
}

/** `metin`, hedefin ardışık `pencere` kelimesini içeriyor mu (yeniden yazım izi)? */
export function hedefParcasiIceriyor(hedef: string, metin: string): boolean {
  const p = bekciPenceresi(hedef);
  if (!p) return false;
  const h = kelimeler(hedef);
  const gramlar = new Set<string>();
  for (let i = 0; i + p <= h.length; i++) gramlar.add(h.slice(i, i + p).join(" "));
  const m = kelimeler(metin);
  for (let i = 0; i + p <= m.length; i++) if (gramlar.has(m.slice(i, i + p).join(" "))) return true;
  return false;
}

/** Yeniden yazım izi taşıyan alan: ilk cümleye kırpılır; o da taşıyorsa boşalır. */
function yenidenYazimsiz(hedef: string, metin: string): string {
  if (!hedefParcasiIceriyor(hedef, metin)) return metin;
  const ilk = metin.split(/(?<=[.!?…])\s+/)[0] ?? "";
  return ilk !== metin && !hedefParcasiIceriyor(hedef, ilk) ? ilk : "";
}

const kirp = (s: string, max: number) => (s.length > max ? s.slice(0, max - 1).trimEnd() + "…" : s);
const str = (v: unknown, max: number) => (typeof v === "string" ? kirp(v.trim(), max) : "");
const nesne = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

/** Şemadan ÖNCE: bütçeyi aşan dizgiler kırpılır, bozuk girdiler hoşgörüyle düzeltilir/atılır
    (küçük model sürçmesi parse hatası olmasın). Sorular: bozuk → "var" bileşen → yinelenen → ilk 3. */
export function onKirp(ham: unknown, hedef?: string): unknown {
  const h = nesne(ham);
  const b = nesne(h.bilesenler);
  const bilesenler: Record<string, unknown> = {};
  for (const k of BILESENLER) {
    const x = nesne(b[k]);
    // alıntı: ek "…" YOK — geçerli alt dizinin öneki hâlâ alt dizidir
    const alinti = typeof x.alinti === "string" ? x.alinti.trim().slice(0, BUTCE.alinti).trimEnd() : "";
    bilesenler[k] = { durum: x.durum, alinti, not: str(x.not, BUTCE.not) };
  }
  const mu = nesne(h.mebUyum);
  const muDurum = typeof mu.durum === "string" && (mu.durum.toLocaleLowerCase("tr") === "kısmen" || mu.durum.toLowerCase() === "kismen") ? "kismen" : mu.durum;
  const meb = (MEB_UYUM as readonly unknown[]).includes(muDurum) ? { durum: muDurum, not: str(mu.not, BUTCE.not) } : null;
  const gorulen = new Set<unknown>();
  const sorular = (Array.isArray(h.sorular) ? h.sorular : [])
    .map((s) => {
      const x = nesne(s);
      return { bilesen: x.bilesen, soru: str(x.soru, BUTCE.soru), ornek: str(x.ornek, BUTCE.ornek) };
    })
    .filter((q) => (BILESENLER as readonly unknown[]).includes(q.bilesen) && q.soru)
    .filter((q) => {
      const x = nesne(bilesenler[q.bilesen as string]);
      // hedef verildiyse kanıtsız (uydurma alıntılı) "var" gerçekte "var" sayılmaz: dogrula onu belirsize indirecek
      const gercekVar = x.durum === "var" && (hedef === undefined || alintiGecerli(hedef, String(x.alinti)));
      return !gercekVar;
    })
    .filter((q) => (gorulen.has(q.bilesen) ? false : (gorulen.add(q.bilesen), true)))
    .slice(0, BUTCE.soruSayisi);
  return { bilesenler, mebUyum: meb, sorular, ozet: str(h.ozet, BUTCE.ozet) || OZET_YEDEK };
}

export function dogrula(ham: unknown, girdi: DenetimGirdisi): DenetimSonucu {
  const parsed = denetimSonucuSchema.safeParse(onKirp(ham, girdi.hedef));
  if (!parsed.success) {
    throw new DenetimHatasi("parse", parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  }
  const s = parsed.data;
  const hedef = girdi.hedef;

  for (const k of BILESENLER) {
    const b = s.bilesenler[k];
    if (b.alinti && !alintiGecerli(hedef, b.alinti)) b.alinti = ""; // uydurma alıntı
    if (b.durum === "var" && !b.alinti) b.durum = "belirsiz"; // kanıtsız "var" yok
    b.not = yenidenYazimsiz(hedef, b.not);
  }
  s.sorular = s.sorular
    .filter((q) => s.bilesenler[q.bilesen].durum !== "var")
    .filter((q, i, arr) => arr.findIndex((x) => x.bilesen === q.bilesen) === i)
    .filter((q) => !hedefParcasiIceriyor(hedef, q.soru)) // soru hedefi yeniden yazamaz: DÜŞER
    .slice(0, BUTCE.soruSayisi)
    .map((q) => ({ ...q, ornek: hedefParcasiIceriyor(hedef, q.ornek) ? "" : q.ornek }));
  s.ozet = yenidenYazimsiz(hedef, s.ozet) || OZET_YEDEK;
  if (!girdi.baglam?.meb) s.mebUyum = null;
  else if (s.mebUyum) s.mebUyum.not = yenidenYazimsiz(hedef, s.mebUyum.not);
  return s;
}
