// apps/hub/evals/tools/studio/ai-profile/checks.ts
import type { ToolCheckOut } from "../../../lib/adapterFactory";
import { basligiNormalle } from "../../../lib/markdown";
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
   - Bu yüzden bölüm gövdeleri Markdown başlığına göre kesilir. Kalın tek satır ("**Önemli:**") başlık DEĞİL gövde etiketidir; yalnız beklenen bir
     bölüm adıysa ("**Tanının Klinik Açıklaması**") başlık yerine yazılmış sayılır (içerik yine bulunur, başlık biçimi `yapi`/`fazlalik`ta cezasız kalır). */
const BASLIK = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
/** Yalnız kalın metinden oluşan satır; bölüm başlığı yerine yazılmışsa (beklenen başlık adı) başlık sayılır, aksi halde ("**Önemli:**") gövde etiketidir. */
const KALIN = /^\s*(?:\d+[.)]\s*)?\*\*([^*]+)\*\*:?\s*$/;
const HR = /^\s*([-*_])(?:\s*\1){2,}\s*$/;
const MADDE = /^(\s*)(?:[-*+•]|\d+[.)])\s+(.*)$/;
const girinti = (s: string) => s.replace(/\t/g, "    ").length;
const temiz = (s: string) => s.replace(/\*\*|__|[*`]/g, "").replace(/\s+/g, " ").trim();

interface Bolum {
  level: number;
  heading: string;
  lines: string[];
}
const beklenen = (h: string) => PROFIL_BOLUMLERI.some((re) => re.test(h));
function bolumler(text: string): Bolum[] {
  const out: Bolum[] = [];
  for (const line of text.split("\n")) {
    const m = BASLIK.exec(line);
    const kalin = m ? null : KALIN.exec(line);
    if (m) out.push({ level: m[1]!.length, heading: basligiNormalle(m[2]!), lines: [] });
    else if (kalin && beklenen(basligiNormalle(kalin[1]!))) out.push({ level: 9, heading: basligiNormalle(kalin[1]!), lines: [] });
    else out.at(-1)?.lines.push(line);
  }
  return out;
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

const aralik = (n: number | null, alt: number) => n !== null && n >= alt && n <= 5;

/**
 * AI profiline özgü kontroller (Markdown). Ortak olanlar (bölüm başlıklarının oranı `yapi`, dil kuralı, rumuz, yasak kalıp, tanı cümlesi)
 * `studioAdapter`dadır; talimatı fabrika bunlarla bu puanlardan hesaplar (burada `talimat` yok).
 * Kural: bir puan YALNIZ çıktı sistem prompt'unun söylediği ya da arayüzün okuduğu bir şeyi bozuyorsa düşer.
 *   - `ana_baslik`: iki ana başlık "## " satırı (arayüz yalnız bunlarda böler; aksi halde bölüm kartı oluşmaz ya da önceki karta karışır).
 *   - `bolum_cumle`: prompt "3-5 cümle" der YALNIZ Tanının Klinik Açıklaması, Beklenen Gelişim ve Müfredat Modülleriyle İlişki için;
 *     "Öncelikli Çalışma Alanları" için "en önemli 3-5 hedef" (madde sayısı, madde yoksa cümle). Diğer üç uzman bölümünün (yaklaşım, dikkat,
 *     aile) sayı kuralı yoktur: cümle sayıları yalnız ayrıntıdadır. Modül atanmamışken (`modulSayisi` 0) "Müfredat Modülleriyle İlişki"
 *     3 cümleye zorlanmaz: dürüst "modül yok" yanıtı kısa olabilir (üst sınır sürer).
 *   - `ayrac`: prompt iki ana bölüm arasında `---` ister (arayüz hr'yi çizmez; yine de istenen yapıdır).
 *   - `fazlalik`: "başka hiçbir şey eklemeden": ilk "## "tan önce metin (önsöz, kod çiti) ve istenmeyen ##/### başlık (ör. "Sonuç") yok. */
export function profileChecks(args: { body: ProfileBody; output: unknown; raw?: unknown; text?: string; alias?: string | null }): ToolCheckOut {
  const text = typeof args.output === "string" ? args.output : "";
  const lines = text.split("\n");
  const bs = bolumler(text);

  const ust = lines.flatMap((l, i) => (l.startsWith("## ") ? [{ i, h: basligiNormalle(l.slice(3).replace(/\s*#+\s*$/, "")) }] : []));
  const ustKonum = (re: RegExp) => ust.find((u) => re.test(u.h))?.i ?? -1;
  const anaBaslik = frac([B.kavramsal, B.uzmana], (re) => ustKonum(re) >= 0);

  const k = ustKonum(B.kavramsal);
  const u = ustKonum(B.uzmana);
  const ayrac = k >= 0 && u > k && lines.slice(k + 1, u).some((l) => HR.test(l)) ? 1 : 0;

  const onsoz = lines.slice(0, ust[0]?.i ?? lines.length).some((l) => l.trim());
  const istenmeyen = bs.some((b) => b.level <= 3 && !beklenen(b.heading));
  // Boş çıktıda "fazlalık yok" kanıtlanamaz: 0.
  const fazlalik = text.trim() && !onsoz && !istenmeyen ? 1 : 0;

  const bul = (re: RegExp) => {
    const s = bs.find((b) => re.test(b.heading));
    return s ? bloklar(s.lines) : null;
  };
  const cumle = (re: RegExp) => {
    const b = bul(re);
    return b ? cumleSayisi(b) : null;
  };
  const oncelik = bul(B.oncelik);
  const nOncelik = oncelik ? maddeSayisi(oncelik) || cumleSayisi(oncelik) : null;
  const n = {
    tani: cumle(B.tani),
    gelisim: cumle(B.gelisim),
    mufredat: cumle(B.mufredat),
    oncelik: nOncelik,
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

