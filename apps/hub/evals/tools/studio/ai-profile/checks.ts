// apps/hub/evals/tools/studio/ai-profile/checks.ts
import type { ToolCheckOut } from "../../../lib/adapterFactory";
import { baslikMi, basligiNormalle, sections, type Section } from "../../../lib/markdown";
import { countSentences, frac } from "../../../lib/sharedChecks";

/** Profil üretiminde HİÇ gönderilmez (gövde yok); yalnız kontrol ve hakem notu için vaka verisi. `modulSayisi`: öğrenciye atanmış müfredat modülü
    sayısı (fikstürün `curriculumTitles` uzunluğu; adaptör testi eşitliği doğrular). Verilmezse (ya da > 0 ise) modül atanmış sayılır. */
export interface ProfileBody {
  modulSayisi?: number;
}

/** Sistem prompt'unun (generateProfile.ts PROFILE_SYSTEM_PROMPT) istediği 2 ana + 7 alt başlık (normalleştirilmiş başlıkta aranır). */
const B = {
  kavramsal: /kavramsal arka plan/,
  tani: /tanının klinik açıklaması/,
  gelisim: /beklenen gelişim/,
  mufredat: /müfredat modülleriyle ilişki/,
  uzmana: /uzmana öneriler/,
  oncelik: /öncelikli çalışma alanları/,
  yaklasim: /etkili yaklaşım/,
  dikkat: /dikkat edilmesi gereken/,
  aile: /aile ile paylaşılabilecek/,
};
export const PROFIL_BOLUMLERI: RegExp[] = Object.values(B);

/* Markdown yapısı (modelin biçim seçiminden bağımsız, ama arayüzün okuduğu biçimle uyumlu):
   - Arayüz profili YALNIZ "## " ile başlayan satırlarda böler (students/[id]/page.tsx parseProfileSections); ilk "## "tan önceki metin atılır,
     her "## " bir kart olur, "### " kartın içinde alt başlık olarak çizilir, "---" (hr) hiç çizilmez.
   - Bölüm gövdeleri `lib/markdown.ts` `sections` ile bulunur ve (bulletsUnder gibi) DAHA DERİN başlıkları (`####`, tek satırlık kalın etiket)
     kapsar; aynı/üst düzey başlıkta ya da beklenen başka bir bölüm adında durur. Başlık metni gövdeye girmez (etiket cümle sayılmaz). */
const BASLIK = /^(#{1,3})\s+(.*?)\s*#*\s*$/; // istenmeyen başlık taraması: # / ## / ### (sections `#` ve ##### görmez)
/** Yatay çizgi (`---`, `***`, `___`, `- - -`): CommonMark'ta aynı işaretle ≥ 3 tekrar, aralarda boşluk serbest. */
export const HR = /^\s*([-*_])(?:\s*\1){2,}\s*$/;
const MADDE = /^(\s*)(?:[-*+•]|\d+[.)])\s+(.*)$/;
const girinti = (s: string) => s.replace(/\t/g, "    ").length;
const temiz = (s: string) => s.replace(/\*\*|__|[*`]/g, "").replace(/\s+/g, " ").trim();

const beklenen = (h: string) => PROFIL_BOLUMLERI.some((re) => re.test(h));
const SIRA: Record<string, number> = { 2: 2, 3: 3, 4: 4, bold: 5 };

interface Govde {
  /** Bölümün kendi satırları (ilk derin başlıktan önce). */
  kendi: string[];
  /** Kendi + derin bölümlerin satırları (başlık metinleri hariç). */
  tum: string[];
  /** Bölümün altındaki derin başlıklar (aynı düzeyde ya da üstte durulur). */
  derin: Section[];
}
/** Başlığı `re`ye uyan ilk bölümün gövdesi; yoksa null. */
function govde(secs: Section[], re: RegExp): Govde | null {
  const i = secs.findIndex((x) => re.test(x.heading));
  if (i < 0) return null;
  const s = secs[i]!;
  const derin: Section[] = [];
  for (let j = i + 1; j < secs.length; j++) {
    const t = secs[j]!;
    if (SIRA[t.level]! <= SIRA[s.level]! || beklenen(t.heading)) break;
    derin.push(t);
  }
  return { kendi: s.lines, tum: [...s.lines, ...derin.flatMap((d) => d.lines)], derin };
}

interface Blok {
  madde: boolean;
  girinti: number;
  metin: string;
}
/** Satırları bloklara böler: her madde ayrı blok (girintili devam satırları ona katılır); madde olmayan ardışık satırlar tek paragraf
    (kaydırılmış paragraf), boş satır ve yatay çizgi paragrafı bitirir. */
function bloklar(lines: string[]): Blok[] {
  const out: Blok[] = [];
  let acik = false; // son blok devam alabilir (araya boş satır/ayraç girmedi)
  for (const l of lines) {
    if (!l.trim() || HR.test(l)) {
      acik = false;
      continue;
    }
    const m = MADDE.exec(l);
    if (m) {
      out.push({ madde: true, girinti: girinti(m[1]!), metin: m[2]! });
      acik = true;
      continue;
    }
    const son = out.at(-1);
    if (acik && son && (!son.madde || girinti(l.match(/^\s*/)![0]) > son.girinti)) son.metin += ` ${l.trim()}`;
    else {
      out.push({ madde: false, girinti: 0, metin: l.trim() });
      acik = true;
    }
  }
  return out.map((b) => ({ ...b, metin: temiz(b.metin) }));
}
/** Üst düzey madde sayısı (alt maddeler sayılmaz); madde yoksa 0. */
function maddeSayisi(bs: Blok[]): number {
  const m = bs.filter((b) => b.madde);
  if (!m.length) return 0;
  const en = Math.min(...m.map((b) => b.girinti));
  return m.filter((b) => b.girinti === en).length;
}
/** Cümle sayısı: paragraflar `countSentences` ile; her madde (noktasız da olsa) en az bir cümle. */
function cumleSayisi(bs: Blok[]): number {
  return bs.reduce((t, b) => t + (b.madde ? Math.max(1, countSentences(b.metin)) : countSentences(b.metin)), 0);
}

/** "Öncelikli Çalışma Alanları" hedef sayısı: kendi satırlarındaki üst düzey maddeler (madde/numaralı satır) + en sığ derin başlık düzeyindeki
    başlıklar (her `#### 1. Hedef` ya da tek satırlık kalın etiket bir hedeftir; altlarındaki maddeler ve paragraflar o hedefin açıklamasıdır).
    Hiçbiri yoksa cümle sayısı. */
function ogeSayisi(g: Govde): number {
  const en = g.derin.length ? Math.min(...g.derin.map((d) => SIRA[d.level]!)) : 0;
  const basliklar = g.derin.filter((d) => SIRA[d.level] === en).length;
  return maddeSayisi(bloklar(g.kendi)) + basliklar || cumleSayisi(bloklar(g.kendi)); // hiç başlık yoksa derin gövde de yoktur
}

const aralik = (n: number | null, alt: number) => n !== null && n >= alt && n <= 5;

/**
 * AI profiline özgü kontroller (Markdown). Ortak olanlar (bölüm başlıklarının oranı `yapi`, dil kuralı, rumuz, yasak kalıp, tanı cümlesi)
 * `studioAdapter`dadır; talimatı fabrika bunlarla bu puanlardan hesaplar (burada `talimat` yok).
 * Kural: bir puan YALNIZ çıktı sistem prompt'unun söylediği ya da arayüzün okuduğu bir şeyi bozuyorsa düşer.
 *   - `ana_baslik`: iki ana başlık "## " satırı (arayüz yalnız bunlarda böler; aksi halde bölüm kartı oluşmaz ya da önceki karta karışır).
 *   - `bolum_cumle`: prompt "3-5 cümle" der YALNIZ Tanının Klinik Açıklaması, Beklenen Gelişim ve Müfredat Modülleriyle İlişki için;
 *     "Öncelikli Çalışma Alanları" için "en önemli 3-5 hedef" (üst düzey madde/numaralı satır + `####` başlık ya da tek satırlık kalın etiket sayısı;
 *     hiçbiri yoksa cümle). Gövdeler `sections` ile, derin başlıklar dahil bulunur. Diğer üç uzman bölümünün (yaklaşım, dikkat,
 *     aile) sayı kuralı yoktur: cümle sayıları yalnız ayrıntıdadır. Modül atanmamışken (`modulSayisi` 0) "Müfredat Modülleriyle İlişki"
 *     3 cümleye zorlanmaz: dürüst "modül yok" yanıtı kısa olabilir (üst sınır sürer).
 *   - `ayrac`: prompt iki ana bölüm arasında `---` ister (arayüz hr'yi çizmez; yine de istenen yapıdır). Ana başlıklar HER düzeyde bulunur:
 *     yanlış düzeyli başlık yalnız `ana_baslik`ta cezalanır, ayracı ayrıca düşürmez.
 *   - `fazlalik`: "başka hiçbir şey eklemeden": ilk "## "tan önce metin (önsöz, kod çiti) ve istenmeyen ##/### başlık (ör. "Sonuç") yok. */
export function profileChecks(args: { body: ProfileBody; output: unknown; raw?: unknown; text?: string; alias?: string | null }): ToolCheckOut {
  const text = typeof args.output === "string" ? args.output : "";
  const lines = text.split("\n");
  const secs = sections(text);

  const ust = lines.flatMap((l, i) => (l.startsWith("## ") ? [{ i, h: basligiNormalle(l.slice(3).replace(/\s*#+\s*$/, "")) }] : []));
  const ustKonum = (re: RegExp) => ust.find((u) => re.test(u.h))?.i ?? -1;
  const anaBaslik = frac([B.kavramsal, B.uzmana], (re) => ustKonum(re) >= 0);

  // Ayraç, ana başlıkları HERHANGİ bir biçimde bulur (`##`, `###`, `####`, tek satırlık kalın): tek bir başlık düzeyi hatası `ana_baslik`ta
  // bir kez cezalanır, ayraçta ikinci kez cezalanmaz.
  const baslikKonumu = (re: RegExp) => lines.findIndex((l) => {
    const b = baslikMi(l);
    return b !== null && re.test(b.heading);
  });
  const k = baslikKonumu(B.kavramsal);
  const u = baslikKonumu(B.uzmana);
  const ayrac = k >= 0 && u > k && lines.slice(k + 1, u).some((l) => HR.test(l)) ? 1 : 0;

  const onsoz = lines.slice(0, ust[0]?.i ?? lines.length).some((l) => l.trim());
  const istenmeyen = lines.some((l) => {
    const m = BASLIK.exec(l);
    return m !== null && !beklenen(basligiNormalle(m[2]!));
  });
  // Boş çıktıda "fazlalık yok" kanıtlanamaz: 0.
  const fazlalik = text.trim() && !onsoz && !istenmeyen ? 1 : 0;

  const cumle = (re: RegExp) => {
    const g = govde(secs, re);
    return g ? cumleSayisi(bloklar(g.tum)) : null;
  };
  const oncelik = govde(secs, B.oncelik);
  const n = {
    tani: cumle(B.tani),
    gelisim: cumle(B.gelisim),
    mufredat: cumle(B.mufredat),
    oncelik: oncelik ? ogeSayisi(oncelik) : null,
    yaklasim: cumle(B.yaklasim),
    dikkat: cumle(B.dikkat),
    aile: cumle(B.aile),
  };
  const mufredatAlt = args.body.modulSayisi === 0 ? 1 : 3;
  const bolumCumle = frac([aralik(n.tani, 3), aralik(n.gelisim, 3), aralik(n.mufredat, mufredatAlt), aralik(n.oncelik, 3)], Boolean);

  const scores = { ana_baslik: anaBaslik, bolum_cumle: bolumCumle, ayrac, fazlalik };
  const say = (v: number | null) => v ?? "yok";
  return {
    scores,
    details: {
      ...scores,
      cumle_tani: say(n.tani),
      cumle_gelisim: say(n.gelisim),
      cumle_mufredat: say(n.mufredat),
      oge_oncelik: say(n.oncelik),
      cumle_yaklasim: say(n.yaklasim),
      cumle_dikkat: say(n.dikkat),
      cumle_aile: say(n.aile),
    },
    hard: [],
  };
}
