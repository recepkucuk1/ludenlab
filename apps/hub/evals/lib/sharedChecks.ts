// apps/hub/evals/lib/sharedChecks.ts
import { yasakKalipBul } from "@/lib/prompts/ortakBloklar";
import { extractJson } from "@studio/lib/utils";

/* Her araçta ortak, ücretsiz kontroller. Puanlar 0–1. */

export const lower = (s: string) => s.toLocaleLowerCase("tr-TR");
export const str = (v: unknown) => (typeof v === "string" ? v : "");
/** Boş liste → 0: ölçülecek öğe yoksa başarısızlık sayılır. */
export const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
/** Boş liste → 0: ölçülecek öğe yoksa başarısızlık sayılır. */
export const frac = <T>(xs: T[], ok: (x: T) => boolean) => (xs.length ? xs.filter(ok).length / xs.length : 0);

/** Model çıktısındaki bir dizi alanını kayıt listesine çevirir: dizi değilse boş; nesne olmayan öğe (null, metin, sayı,
    iç içe dizi) boş nesne `{}` olur. Kontroller ve hakem çizimi `null` bir adım/satırda çökmesin, öğe sayısı korunsun. */
export const kayitlar = (v: unknown): Record<string, unknown>[] =>
  (Array.isArray(v) ? v : []).map((x) => (x && typeof x === "object" && !Array.isArray(x) ? (x as Record<string, unknown>) : {}));

/**
 * "hasta"/"terapist" (çekimli biçimler dahil; hastane/hastalık/hastalanmak ve "hasta ol-" (rahatsızlanmak)
 * hariç) sert dil hatasıdır.
 *
 * İstisna (OPT-IN, yalnız Atölye): `opts.konusmaTerapistiMuaf` true ise "(dil ve) konuşma terapisti"
 * meşru bir meslek unvanıdır — ATOLYE_SYSTEM çıktıdan dil-konuşma katkısını ister, bu unvan yasaklı
 * "terapist" üslubu (öğrenciyi hasta/terapi nesnesi gibi anlatan dil) değildir; `terapist` sayımına girmez.
 * Varsayılan (false) her "terapist" sayılır: Studio'da okuyucunun KENDİSİ konuşma terapistidir ve
 * istemler "terapist" sözcüğünü tümden yasaklar ("Konuşma terapistinizle okuyun" sert hatadır).
 * Kelime içi geçiş ("fizyoterapist") iki durumda da sayılmaz.
 *
 * Ödül/çıkartma sayımı yalnız ayrıntıda raporlanır, `score`'a girmez — olumsuz bağlam
 * ("dışsal ödül önerilmez") ve eş seslilik ("toplama-çıkartma", "dil çıkartma") sert hata
 * üretmesin; nüans hakemin `dil_etik` ölçütünde. "puan" tek başına bilerek sayılmaz
 * (BEP/ölçme metinlerinde meşru).
 */
export function dilKurali(
  text: string,
  opts: { konusmaTerapistiMuaf?: boolean } = {},
): { hasta: number; terapist: number; odul: number; score: number } {
  const t = lower(text);
  const hasta = (t.match(/(?<!\p{L})hasta(?!ne|l[ıi][kğ]|lan)(?!\s+ol)/gu) ?? []).length;
  const terapistRe = opts.konusmaTerapistiMuaf ? /(?<!\p{L})(?<!konuşma\s+)terapist/gu : /(?<!\p{L})terapist/gu;
  const terapist = (t.match(terapistRe) ?? []).length;
  const odul = (t.match(/(?<!\p{L})(ödül|çıkartma|puan tablosu|yıldız tablosu)/gu) ?? []).length;
  return { hasta, terapist, odul, score: hasta + terapist === 0 ? 1 : 0 };
}

/**
 * Görsel sağlayıcısına giden alanlar: bu alanlarda rumuz BİLEREK kalır, görsel sağlayıcıya
 * gerçek ad gitmez. `src/modules/studio/lib/pseudonym.ts` `restoreNameDeep` ile eşzamanlı
 * tutulmalı.
 */
const IMAGE_PROMPT_KEYS = new Set(["visualPrompt", "imagePrompt", "scenePrompt"]);

// packages/ai/src/pseudonym/index.ts içindeki SUFFIXES ile eşzamanlı tutulmalı
const EKLER = "nden|ndan|nde|nda|nin|nın|nun|nün|den|dan|ten|tan|ler|lar|yle|yla|yi|yı|yu|yü|ye|ya|de|da|te|ta|in|ın|un|ün|le|la|li|lı|lu|lü";
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* Son kullanılan adın RegExp'i: bir çıktının tüm string'leri aynı adla tarandığında bir kez kurulur.
   `g` bayrağı YOK → `test` durumsuz, paylaşmak güvenli. */
let sonAd: { ad: string; re: RegExp } | null = null;
function adRegex(ad: string): RegExp {
  if (sonAd?.ad !== ad) {
    sonAd = {
      ad,
      re: new RegExp(`(?<!\\p{L})(?:${esc(ad)}|${esc(ad.toLocaleUpperCase("tr-TR"))})(?:'|’)?(?:${EKLER})?(?!\\p{L})`, "u"),
    };
  }
  return sonAd.re;
}

/**
 * `ad` metinde bütün kelime olarak geçiyor mu? Kesmeli/kesmesiz Türkçe ek (`EKLER`) ve tr-TR
 * büyük harf biçimi de sayılır; kelime içi geçiş ("Ela" ⊄ "Elastik") sayılmaz. Boş ad → false.
 * ÇIKTI sızıntısı kontrolü (`rumuzYok`) bu DAR kuralı kullanır: uygulamanın uzmana gösterdiği içerikte
 * "Elastik" gibi bir sözcük yanlış hata olarak puanı bozmasın. Runner'ın PII tuzak teli ise bilerek
 * daha geniş `adIzi`'dir (aksan katlama + kelime başı öneki): tuzak teli geniş, çıktı sızıntısı dar —
 * yanlış alarm koşuyu görünür durdurur, kaçak sessiz geçerdi; çıktıda ise tersi.
 */
export function adGeciyorMu(text: string, ad: string): boolean {
  if (!ad) return false;
  return adRegex(ad).test(text);
}

/** Bir değerin içindeki tüm string'leri (derinlemesine) `out`'a toplar; `atla` anahtarları yürünmez. */
function collectStrings(v: unknown, out: string[], atla?: ReadonlySet<string>): string[] {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) for (const x of v) collectStrings(x, out, atla);
  else if (v && typeof v === "object") {
    for (const [k, x] of Object.entries(v)) if (!atla?.has(k)) collectStrings(x, out, atla);
  }
  return out;
}

/**
 * Bir değerdeki HER string'i (özyinelemeli; string'in kendisi de dahil) sırayla döndürür — "hangi metin var"
 * sorusu için. `rumuzYok`'un yürüyüşünün aksine `visualPrompt` türü anahtarlar da DAHİLDİR.
 * Satır sonları korunur: ayrı alanlar `join("\n")` ile birleştirilince satır başı sözcükleri
 * (`JSON.stringify`ın `\n` kaçışı bir harf yapıştırırdı) kelime sınırı kurallarında doğru eşleşir.
 */
export function metinler(v: unknown): string[] {
  return collectStrings(v, []);
}

/**
 * Uygulamanın uzmana gösterdiği içerikte rumuz kalmamalı (gerçek ad geri konmuş olmalı).
 * Rumuz bütün kelime olarak (Türkçe ekleri ve büyük harf biçimiyle) aranır; görsel prompt
 * alanları hariç.
 */
export function rumuzYok(output: unknown, alias: string | null): number {
  if (!alias || output == null) return 1;
  return collectStrings(output, [], IMAGE_PROMPT_KEYS).some((s) => adGeciyorMu(s, alias)) ? 0 : 1;
}

const YASAK_KALIP_TOLERANSI = 4; // bu kadar kalıpta puan 0'a iner (uzunluktan bağımsız, bilinçli sadelik)

export function yasakKalip(text: string): { found: string[]; score: number } {
  const found = yasakKalipBul(text);
  return { found, score: Math.max(0, 1 - found.length / YASAK_KALIP_TOLERANSI) };
}

/** Route'taki `extractJson` ile aynı kural (doğrudan onu kullanır); hata yerine null. */
export function parseJsonLoose(raw: string): Record<string, unknown> | null {
  try {
    return extractJson(raw);
  } catch {
    return null;
  }
}

/** Zorunluluk kipi: -malı/-meli (kişi/bildirme ekli ya da cümle sonunda yalın), "zorunda", "gerek(ir|iyor)/lazım/şart".
    Küçük harfe (tr-TR) indirilmiş metne uygulanır. */
export const ZORUNLU = new RegExp(
  [
    "(?<=\\p{L})(?:malı(?:yım|sın(?:ız)?|yız|dır|lar)|meli(?:yim|sin(?:iz)?|yiz|dir|ler))(?!\\p{L})",
    "(?<=\\p{L})(?:malı|meli)(?=\\s*(?:[.!?…]|$))",
    "(?<!\\p{L})zorunda(?:yım|sın(?:ız)?|yız|dır|lar)?(?!\\p{L})",
    "(?<!\\p{L})(?:gerek(?:ir|iyor)|lazım|şart(?:tır)?)(?!\\p{L})",
  ].join("|"),
  "u",
);
/** Metinde zorunluluk kipi var mı (`ZORUNLU`; tr-TR küçük harfe indirerek). Araçlar arası ortak (ilk kullanan:
    sosyal hikâye yönlendiricileri). */
export const zorunluKip = (s: string) => ZORUNLU.test(lower(s));

/** Sezgisel: cümle sonu işaretinden sonra YENİ cümle ancak büyük harf, rakam, yüzde işareti ("%70 doğrulukla…") ya da açılış
    tırnağı/parantezle başlıyorsa bölünür (işaretten sonra kapanış tırnağı/parantezi olabilir: `?” Ela`); böylece "2. dersi", "…", "vb. oyuncakları", "dk. boyunca", "ör. top", "? sorusuna" gibi küçük harfle
    süren devamlar cümleyi bölmez. Tek kelimelik parça cümle sayılmaz. Sınır: kısaltmadan sonra büyük harfle başlayan
    sözcük ("5 dk. Sonra") yine böler. */
export function countSentences(text: string): number {
  return text
    .split(/(?<=[.!?…][)"”’]*)\s+(?=[\p{Lu}\p{N}"“‘'(%])/u)
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).length >= 2).length;
}

const SURE_SAYI = String.raw`\d+(?:[.,]\d+)?`;
const SURE_BIRIM = String.raw`saniye|sn|saat|dakika|dk|'`;
/** İlk sayı + ona bitişik birim; isteğe bağlı aralık ucu ("5-10 dk", "5 dk - 10 dk") kendi birimiyle. Birim sonrası ek harfler ("saniyelik") yutulur. */
const SURE_RE = new RegExp(String.raw`(${SURE_SAYI})\s*(${SURE_BIRIM})?(?:\s*[-–—]\s*(${SURE_SAYI})\s*(${SURE_BIRIM})?)?`, "u");
const birimDk = (birim: string | undefined, deger: number) => (birim === "saniye" || birim === "sn" ? deger / 60 : birim === "saat" ? deger * 60 : deger);
/**
 * Süre metni → dakika. Birim yalnız İLK sayıya bağlıdır ("5 dk (30 sn)" → 5): sn/saniye ÷ 60, saat × 60, dakika/dk/kesme ya da
 * birimsiz → dakika; aralık ("5-10 dk", "5 dk - 10 dk") → ortalama: birim tireden önce, sonra ya da iki uçta da yazılmış olabilir (bir uçta
 * yoksa diğerininki kullanılır; uçlar kendi birimiyle dakikaya çevrilir: "30 sn - 1 dk" → 0,75); sayı girdisi aynen. Sayı yoksa ya da
 * sonlu değilse `null` ("yarım saat", "kısa").
 */
export function sureDk(text: unknown): number | null {
  if (typeof text === "number") return Number.isFinite(text) ? text : null;
  if (typeof text !== "string") return null;
  const m = SURE_RE.exec(lower(text));
  if (!m) return null;
  const n = (v: string) => Number(v.replace(",", "."));
  if (m[3] === undefined) return birimDk(m[2], n(m[1]!));
  return (birimDk(m[2] ?? m[4], n(m[1]!)) + birimDk(m[4] ?? m[2], n(m[3]))) / 2;
}

/** Düz nesne aynen; dizi, metin, sayı, null/undefined → boş nesne (model çıktısında beklenen nesne yerine ne gelirse çökmeden okunur). */
export const nesne = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
/** `nesne` ile aynı kural, ama nesne değilse `null` ("çıktı yok" ile "boş nesne"yi ayırmak için). */
export const nesneVeyaNull = (v: unknown): Record<string, unknown> | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null);

/** İngilizce görsel komutunda (prompt: visualPrompt İNGİLİZCE) Türkçe izi — SEZGİ, iki işaretten biri:
    (1) sözcüklerin en az YARISI Türkçeye özgü harf taşır ("kırmızı elma"; İngilizce komutta tek tük "döner", "çay",
    "über" serbesttir); (2) İngilizcede bulunmayan sık bir işlev sözcüğü tam sözcük olarak geçer (kesmeli "I've" içindeki
    "ve" sayılmaz). Kaçaklar: aksansız ve işlev sözcüğü taşımayan Türkçe ("su bardagi"), tamamı büyük harfli Türkçe, az harfli uzun Türkçe.
    Araçlar arası ortak (comm-board, eşleştirme, sesletim). */
const TURKCE_HARF = /[çğıöşüÇĞİÖŞÜ]/u; // ÖZGÜN yazıma bakılır: büyük "I" ("I am") belirsiz olduğundan sayılmaz
const TURKCE_SOZCUK = /(?<![\p{L}'’])(?:bir|ve|ile|için|gibi|olan|dolu|ama|veya|bu)(?![\p{L}'’])/u;
const SOZCUKLER = /\p{L}+(?:['’]\p{L}+)*/gu;
export function turkceMi(komut: string): boolean {
  if (TURKCE_SOZCUK.test(lower(komut))) return true;
  const sozcukler = komut.match(SOZCUKLER) ?? [];
  return sozcukler.length > 0 && sozcukler.filter((w) => TURKCE_HARF.test(w)).length * 2 >= sozcukler.length;
}

/** `anahtarlar` alanlarından metin içeren (boşluk dışında karakter) olanların oranı: Studio araçlarının `alanlar` puanı.
    Çıktı nesne değilse (null/undefined) hepsi boş sayılır → 0. */
export function alanlarDolu(output: Record<string, unknown> | null | undefined, anahtarlar: readonly string[]): number {
  return mean(anahtarlar.map((k) => (str(output?.[k]).trim() ? 1 : 0)));
}

export function markdownHeadings(text: string): string[] {
  return text
    .split("\n")
    .filter((l) => /^#{2,3}\s+/.test(l))
    .map((l) => l.replace(/^#{2,3}\s+/, "").trim());
}

/** Tuzak teli katlaması: tr-TR küçük harf, ı→i, aksanlar (NFD birleşik işaretler) atılır
    (ğ→g, ş→s, ö→o, ü→u, ç→c, â→a…). */
export const katla = (s: string): string =>
  lower(s)
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

/** TUZAK TELİ eşlemesi (koşturucunun PII kapısı): metin ve ad `katla` ile katlanır, ad bir kelimenin
    BAŞINDA geçiyorsa ilk eşleşmenin ÖZGÜN metindeki (katlanmamış) dizinini, yoksa −1 döndürür
    ("elanın", "gokce icin"). Katlama karakter karakter yapılır ve katlanmış dizin özgün dizine eşlenir
    (katlama uzunluğu değiştirebilir). Bilerek geniş: yanlış alarm koşuyu durdurur, kaçak sessiz geçerdi.
    Çıktı sızıntısı için `adGeciyorMu` kullan. */
export function adIziKonum(text: string, ad: string): number {
  const a = katla(ad.trim());
  if (!a) return -1;
  const re = new RegExp(`(?<![a-z])${esc(a)}`, "u");
  if (!re.test(katla(text))) return -1; // hızlı yol: eşleşme yoksa dizin eşlemesi kurulmaz
  let folded = "";
  const at: number[] = [];
  let i = 0;
  for (const ch of text) {
    const f = katla(ch);
    folded += f;
    for (let k = 0; k < f.length; k++) at.push(i);
    i += ch.length;
  }
  const m = re.exec(folded);
  return m ? (at[m.index] ?? 0) : 0;
}

/** `adIziKonum` bir eşleşme buluyorsa true. */
export function adIzi(text: string, ad: string): boolean {
  return adIziKonum(text, ad) >= 0;
}
