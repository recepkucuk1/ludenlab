// apps/hub/evals/tools/atolye/ortak.ts
import { mebToPrompt } from "@atolye/lib/meb-program";
import { MADDE, TABLO, bulletsUnder, durumsuz, sections, type Section } from "../../lib/markdown";
import { lower } from "../../lib/sharedChecks";

/* Atölye araçlarının (seans planı, davranış, okuma…) kontrollerinde ortak yardımcılar:
   bölüm ağacı, madde çözümü, "yasaklı şey ÖNERİLİYOR mu" (olumsuzlama korumalı) ve hakemin göreceği MEB satırları. */

/** Başlık düzeyi sırası (`bulletsUnder` ile aynı sözleşme): `##` < `###` < `####` < kalın sözde başlık. */
const SIRA = { 2: 2, 3: 3, 4: 4, bold: 5 } as const;
export const derinlik = (s: { level: Section["level"] }) => SIRA[s.level];

/**
 * Başlığı `re`ye uyan İLK bölüm ve altındaki daha derin bölümler ([kök, ...alt bölümler]; aynı ya da üst düzey
 * başlıkta durulur). `re` küçük harf, `i` bayraksız (başlıklar normalleştirilmiştir). Bölüm yoksa boş dizi.
 * Model alt başlık kullandığında (`### Isınma (5 dk)`, `**ABC tablosu**`) içerik kökün altında aranır.
 * `durak`: kök kalın sözde başlıksa (`**Etkinlik Akışı**`) alt bölümler de kalın olur ve düzeyle ayrılamaz; bu durumda
 * kalın başlıklar, başlığı `durak`a uyan (araç şablonunun diğer bölümleri) başlığa kadar alt bölüm sayılır.
 */
export function bolumAgaci(text: string, re: RegExp, durak?: RegExp): Section[] {
  const r = durumsuz(re);
  const d = durak && durumsuz(durak);
  const secs = sections(text);
  const i = secs.findIndex((s) => r.test(s.heading));
  if (i < 0) return [];
  const kok = secs[i]!;
  const alt: Section[] = [];
  for (const t of secs.slice(i + 1)) {
    const kardesKalin = d && kok.level === "bold" && t.level === "bold" && !d.test(t.heading);
    if (derinlik(t) <= derinlik(kok) && !kardesKalin) break;
    alt.push(t);
  }
  return [kok, ...alt];
}

/** Bölüm ağacının ham satırları (alt başlıkların metni dahil); bölüm yoksa `null`. */
export function bolumSatirlari(text: string, re: RegExp, durak?: RegExp): string[] | null {
  const [kok, ...alt] = bolumAgaci(text, re, durak);
  return kok ? [...kok.lines, ...alt.flatMap((s) => [s.heading, ...s.lines])] : null;
}

/** Ham satırlardaki maddeler (`lib/markdown`ın madde çözümüyle AYNI: üst maddeye katılan girintili alt maddeler,
    tablo gövde satırları " · " ile). Satırlar tek bölümün satırlarıdır; başlık içermez. */
export const maddeler = (lines: string[]): string[] => bulletsUnder(`## b\n${lines.join("\n")}`, /^b$/);

/* ── Olumsuzlama: "ceza KULLANILMAZ" bir ihlal değildir ── */

/**
 * Cümlede kaçınma/olumsuzlama izi (tr-TR küçük harfe indirilmiş metinde): asla/hiçbir/yok/değil/yerine/olmadan,
 * kaçın-, uzak dur-, yasak-; olumsuz fiil (-maz/-mez, -mayın/-meyin(iz), -mayacak, -mayan, -madı, -mamış, -mamalı/-memeli; ekler serbest: -mamıştır, -değildir).
 * "yerine koyma (davranışı)" bir terimdir, "instead of" değildir.
 * Heuristik: "Time-out uygulanmaz" ve "cezasız" geçer; "Ceza vermeyin, ancak time-out uygulayın" tek cümlede olumsuzlama
 * taşıdığı için kaçar (bilinen sınır).
 */
const OLUMSUZ = new RegExp(
  [
    String.raw`(?<!\p{L})(?:asla|hiçbir\p{L}*|yok(?:tur|tu)?|değil\p{L}*|yerine(?!\s+koy)|olmadan|olmaksızın|kaçın\p{L}*|uzak (?:dur|kal)\p{L}*|yasak\p{L}*)(?!\p{L})`,
    String.raw`(?<=\p{L}{2})(?:ma|me)(?:z|zl[ae]r|y[ıi]n(?:[ıi]z)?|yacak|yecek|yan|yen|d[ıi]|m[ıi]ş)\p{L}*`,
    String.raw`(?:mama|meme)l[ıi]\p{L}*`,
  ].join("|"),
  "u",
);
export const olumsuzMu = (cumle: string): boolean => OLUMSUZ.test(lower(cumle));

/**
 * `re`nin (tr-TR küçük harfe indirilmiş metinde, `u` bayraklı; `g` eklenir) OLUMSUZLAMASIZ geçişleri.
 * Bir geçiş sayılmaz, eğer (a) kendi cümlesinde ya da (b) bir madde/tablo satırıysa ait olduğu başlığın/etiketin
 * satırında ("**Kaçınılacak stratejiler:**", "## Kullanılmayacak yöntemler") olumsuzlama izi varsa.
 * Cümleler satır sonunda ve ". ! ? …" + boşlukta bölünür ("3.2.5" bölünmez).
 */
export function olumluGecisler(text: string, re: RegExp): string[] {
  const r = new RegExp(re.source, "gu");
  const bulunan: string[] = [];
  let etiket = ""; // en yakın madde-dışı satır (başlık, kalın etiket, paragraf)
  for (const satir of lower(text).split("\n")) {
    if (!satir.trim()) continue;
    const madde = MADDE.test(satir) || TABLO.test(satir);
    if (!madde) etiket = satir;
    const baglamOlumsuz = madde && olumsuzMu(etiket);
    for (const cumle of satir.split(/(?<=[.!?…])\s+/)) {
      if (baglamOlumsuz || olumsuzMu(cumle)) continue;
      bulunan.push(...(cumle.match(r) ?? []));
    }
  }
  return bulunan;
}

/** Hakem görevi için MEB satırları: kod + aracın modele verdiği hedef bloğu (`mebToPrompt`; hedef davranış metinleri
    hakemin "MEB hedef davranışlarına hizmet ediyor mu" ölçütünü yargılayabilmesi için gerekir). Kod yoksa boş. */
export function mebSatirlari(kod: string | undefined, davranisKodlari: string[] = []): string[] {
  if (!kod) return [];
  const blok = mebToPrompt({ hedefKod: kod, davranisKodlari });
  return [`- MEB hedef kodu: ${kod}`, ...(blok ? blok.split("\n") : [])];
}
