/**
 * Çocuk PII'si için takma-ad (pseudonymization) katmanı — 2026-08 güvenlik denetimi #09.
 *
 * AMAÇ: gerçek ad ASLA LLM sağlayıcısına (Anthropic/OpenAI/fal) gitmez. Yerine çocuk başına
 * SABİT bir rumuz gider; dönen metinde rumuz gerçek adla değiştirilir. Terapist her zaman
 * gerçek adı görür, sağlayıcı yalnız rumuzu bilir, eşleme bizde kalır.
 *
 * ── TÜRKÇE'NİN GETİRDİĞİ ZORUNLULUK ──────────────────────────────────────────────
 * LLM rumuzu ÇEKİMLER: "Ece'nin", "Ece'ye", "Ece'de". Dönüşte düz metin değiştirme
 * (`replace(rumuz, gerçekAd)`) ancak rumuz ile gerçek ad AYNI SES SINIFINDAYSA doğru Türkçe
 * üretir. Aksi hâlde:
 *
 *     rumuz "Deniz" → LLM "Deniz'in"  → değiştir → "Ali'in"   ✗ bozuk
 *     rumuz "Ece"   → LLM "Ece'nin"   → değiştir → "Ali'nin"  ✓ doğru
 *
 * Ek, çok kelimeli adlarda SON kelimeye takıldığı için ("Ali Yılmaz'ın") sınıf eşleşmesi
 * gerçek adın SON kelimesine göre yapılır.
 *
 * Ses sınıfını belirleyen üç etken (Türkçe ek uyumu):
 *   1. Son ünlünün uyum sınıfı — ince/kalın + düz/yuvarlak (küçük+büyük ünlü uyumu)
 *   2. Ünlüyle mi ünsüzle mi bitiyor — kaynaştırma ünsüzü (n/y): "Ece'nin" vs "Deniz'in"
 *   3. Son ünsüz ötümlü mü ötümsüz mü — "Mehmet'te" vs "Kerem'de"
 *
 * ── SINIR (dürüst olmak gerekirse) ───────────────────────────────────────────────
 * Bu ANONİMLEŞTİRME DEĞİL, takma adlaştırmadır: KVKK/GDPR veriyi hâlâ kişisel veri sayar
 * (nadir tanı + kesin yaş + şehir yeniden kimliklendirebilir). Adı kaldırmak en görünür
 * kanalı kapatır; veri minimizasyonu, alıcı beyanı ve granüler rıza AYRICA gereklidir.
 */

const VOWELS = "aeıioöuüâîû";
const FRONT = "eiöüî"; // ince
const ROUNDED = "oöuü"; // yuvarlak
/** Ötümsüz (sert) ünsüzler — "fıstıkçı şahap" kuralı. */
const VOICELESS = "fstkçşhp";

function lower(s: string): string {
  return s.toLocaleLowerCase("tr");
}

/**
 * Adın ek alan "kelimesi" — ek buna takılır ("Ali Yılmaz'ın").
 *
 * Son kelime ÜNLÜ İÇERMİYORSA (ör. "Eymen B" gibi tek harflik baş harf) sınıf
 * hesaplanamaz ve rumuz havuzu boş kalırdı → ad tamamen kaybolup "Öğrenci"ye düşerdi.
 * Bu yüzden ünlü içeren SON kelimeyi seçiyoruz. (Canlı veride 21 addan 1'i tam olarak
 * bu durumdaydı — birim testler kaçırmıştı, gerçek adlara karşı koşturunca çıktı.)
 */
export function suffixBearingToken(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  for (let i = parts.length - 1; i >= 0; i--) {
    if ([...lower(parts[i]!)].some((ch) => VOWELS.includes(ch))) return parts[i]!;
  }
  return parts[parts.length - 1]!;
}

/**
 * Bir adın EK DAVRANIŞI sınıfı. Aynı sınıftaki iki ad, her Türkçe ekini AYNI biçimde alır —
 * bu yüzden rumuz ile gerçek ad aynı sınıftaysa düz değiştirme güvenlidir.
 */
export function nameClass(name: string): string {
  const w = lower(suffixBearingToken(name)).replace(/[^a-zçğıöşüâîû]/g, "");
  if (!w) return "x";

  let lastVowel = "";
  for (const ch of w) if (VOWELS.includes(ch)) lastVowel = ch;
  if (!lastVowel) return "x";

  const front = FRONT.includes(lastVowel) ? "F" : "B"; // Front / Back
  const round = ROUNDED.includes(lastVowel) ? "R" : "U"; // Rounded / Unrounded

  const last = w[w.length - 1]!;
  if (VOWELS.includes(last)) return `${front}${round}-V`; // ünlüyle biter
  return `${front}${round}-C${VOICELESS.includes(last) ? "0" : "1"}`; // 0=ötümsüz 1=ötümlü
}

/**
 * Rumuz havuzu — yaygın Türkçe adlar. Sınıfları ÇALIŞMA ZAMANINDA `nameClass` ile hesaplanır
 * (elle etiketleme hataya açık olurdu). Her sınıfta birden çok seçenek bulunacak şekilde geniş.
 */
export const ALIAS_POOL = [
  // GÜNDELİK SÖZLÜK KELİMESİ OLAN ADLAR BİLEREK YOK (2026-09 denetimi): rumuz, çıktı
  // metninde nerede geçerse gerçek adla değiştirilir. Havuzda "Mavi", "Gül", "Öykü",
  // "Deniz" gibi adlar olunca "mavi kalem" → "Ali kalem", "Sosyal Öykü" → "Sosyal Ali"
  // oluyordu; klinik belgeyi bozan bu sınıfı kökten kapatmak için havuz ad-dışı
  // anlamı olmayan isimlerle sınırlandı. (İkinci savunma: rehydrate yalnız BÜYÜK
  // harfle başlayan geçişleri çevirir.)
  "Ayla", "Aslı", "Arda", "Asya", "Bora", "Buse", "Berk", "Bade",
  "Ceren", "Cansu", "Defne", "Derya", "Doruk", "Ece",
  "Efe", "Ela", "Elif", "Eren", "Esra", "Ezgi", "Filiz", "Fırat", "Gizem",
  "Göktuğ", "Hakan", "Hazal", "İlke", "İpek", "Kaan", "Kerem",
  "Levent", "Melis", "Meral", "Mert", "Mehmet",
  "Ozan", "Özge", "Pelin", "Pınar", "Poyraz",
  "Selin", "Serap", "Sinan", "Şule", "Tuna", "Tuğçe",
  "Yağmur", "Yiğit", "Zeynep", "Zehra", "Çisem",
  "Ferda", "Görkem", "Hira", "Kayra", "Nazlı", "Orkun", "Sarp",
] as const;

/** Basit, kararlı (deterministik) karma — aynı girdi hep aynı çıktıyı verir. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export interface PickAliasOptions {
  /** Çakışma alanı — genelde therapistId/accountId. Aynı uzmanda iki çocuk aynı rumuzu almasın. */
  scope?: string;
  /** Bu alanda ZATEN kullanılan rumuzlar. */
  taken?: readonly string[];
}

/**
 * Gerçek ad için KARARLI rumuz seç: aynı çocuk → hep aynı rumuz (kümülatif tutarlılık),
 * ve rumuz gerçek adın son kelimesiyle aynı ses sınıfında (Türkçe ekleri bozulmasın).
 */
export function pickAlias(realName: string, options: PickAliasOptions = {}): string {
  const cls = nameClass(realName);
  const realLower = lower(realName.trim());
  const realLast = lower(suffixBearingToken(realName));
  const taken = new Set((options.taken ?? []).map(lower));

  const bucket = ALIAS_POOL.filter(
    (n) => nameClass(n) === cls && lower(n) !== realLower && lower(n) !== realLast && !taken.has(lower(n)),
  );
  // Sınıf boşsa (çok sıra dışı ad) sınıf-dışına düşmeyiz — bozuk ek üretmektense
  // nötr bir etiket veririz; çağıran taraf yine de gerçek adı GÖNDERMEZ.
  if (bucket.length === 0) return "Öğrenci";

  const idx = hash(`${options.scope ?? ""}|${realLower}`) % bucket.length;
  return bucket[idx]!;
}

export interface NameMapping {
  real: string;
  alias: string;
}

/** Regex için kaçış. */
function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Karakter sınıfı İÇİNDE kaçırılması gerekenler. */
function escapeClass(s: string): string {
  return s.replace(/[\]\\^-]/g, "\\$&");
}

/**
 * Türkçe harf sınırı: ASCII `\b` Türkçe harflerde yanlış çalışır (ör. "Alic" içinde "Ali"yi
 * eşleştirir). Adın önünde/arkasında HARF olmamasını elle şart koşarız; ek işaretleri
 * (kesme, boşluk, noktalama) sınır sayılır → "Ali'nin" eşleşir, "Alic" eşleşmez.
 */
const LETTER = "A-Za-zÇçĞğıİÖöŞşÜüÂâÎîÛû";

/**
 * Aksansız yazım katlaması — "Gokce" yazan uzman "Gökçe"yi kastediyor (klavye alışkanlığı).
 *
 * i/İ ve ı/I ÇİFTLERİ BİLEREK YOK: Türkçe'de bunlar AYRI harflerdir ve "Ilgaz" ile "İlgaz"
 * ayrı adlardır. Katlamaya dahil edilseydi rumuz kapısı yanlış kişiyi eşleştirirdi.
 */
const ASCII_FOLD: Record<string, string> = {
  "ç": "c", "ğ": "g", "ö": "o", "ş": "s", "ü": "u", "â": "a", "î": "i", "û": "u",
};

/** Bir karakterin eşleşebileceği tüm biçimleri (Türkçe büyük/küçük + aksansız). */
function charVariants(ch: string): string[] {
  const set = new Set<string>([ch, ch.toLocaleLowerCase("tr"), ch.toLocaleUpperCase("tr")]);
  for (const v of [...set]) {
    const folded = ASCII_FOLD[v.toLocaleLowerCase("tr")];
    if (folded) {
      set.add(folded);
      set.add(folded.toLocaleUpperCase("tr"));
    }
  }
  return [...set];
}

function charClass(ch: string, upperOnly = false): string {
  if (/\s/.test(ch)) return "\\s+";
  const variants = upperOnly
    ? [...new Set(charVariants(ch).map((c) => c.toLocaleUpperCase("tr")))]
    : charVariants(ch);
  if (variants.length === 1) return escapeRe(variants[0]!);
  return `[${variants.map(escapeClass).join("")}]`;
}

/** Bir dizeyi, Türkçe biçim türevlerini de kabul eden regex desenine çevirir. */
function tokenPattern(token: string, capitalized = false): string {
  return [...token]
    .map((ch, i) => charClass(ch, capitalized && i === 0))
    .join("");
}

/**
 * Kesme işaretsiz yazılan ÇEKİM EKLERİ — "Alinin", "Aliye", "Aliden".
 *
 * Uzmanlar notlarını böyle yazıyor ve kapı yalnız "Ali'nin" biçimini görüyordu (2026-09
 * denetiminde çalıştırılarak kanıtlandı). Liste BİLEREK dar: yalnız iki harf ve üzeri
 * çekim ekleri. Tek harflik ekler ("Ali"+"m") ve iyelik ekleri listeye ALINMADI, çünkü
 * "canım" gibi gündelik kelimeleri bozarlardı. Ayrıca ek yalnız ad BÜYÜK HARFLE
 * başlıyorsa yutulur: böylece adı aynı zamanda sözlük kelimesi olan bir çocukta
 * ("Ada") küçük harfli "adada" kelimesi bozulmaz.
 */
const SUFFIXES = [
  "nden", "ndan", "nde", "nda", "nin", "nın", "nun", "nün",
  "den", "dan", "ten", "tan", "ler", "lar", "yle", "yla",
  "yi", "yı", "yu", "yü", "ye", "ya", "de", "da", "te", "ta",
  "in", "ın", "un", "ün", "le", "la", "li", "lı", "lu", "lü",
];
const SUFFIX_PATTERN = [...SUFFIXES]
  .sort((a, b) => b.length - a.length) // uzun ek önce denensin
  .map((sfx) => tokenPattern(sfx))
  .join("|");

/**
 * Metindeki `token` geçişlerini `replacement` ile değiştirir.
 *
 * İki dal: ① BÜYÜK harfle başlayan ad + bitişik çekim eki (ek korunarak yeniden yazılır),
 * ② herhangi bir yazımda sade ad. `capitalizedOnly` verilirse ikinci dal da büyük harf
 * ister — rumuzu gerçek ada çevirirken (rehydrate) gündelik kelimeleri bozmamak için.
 */
function replaceToken(
  text: string,
  token: string,
  replacement: string,
  capitalizedOnly = false,
): string {
  if (!token) return text;
  const withSuffix = tokenPattern(token, true);
  const plain = tokenPattern(token, capitalizedOnly);
  const re = new RegExp(
    `(^|[^${LETTER}])(?:(${withSuffix})(${SUFFIX_PATTERN})|(${plain}))(?![${LETTER}])`,
    "g",
  );
  return text.replace(
    re,
    (_m, pre: string, upperTok: string | undefined, suffix: string | undefined) =>
      `${pre}${replacement}${upperTok ? (suffix ?? "") : ""}`,
  );
}

/**
 * Gerçek adı (tam hâli + her bir kelimesi) metinden söker, yerine rumuzu koyar.
 * Terapist notlarına doğal olarak yazılan adları da yakalar — asıl sızıntı kanalı odur.
 */
export function pseudonymizeText(text: string, mappings: readonly NameMapping[]): string {
  if (!text) return text;
  let out = text;
  for (const { real, alias } of mappings) {
    const full = real.trim();
    if (!full) continue;
    // Önce tam ad (çok kelimeli), sonra tek tek kelimeler (kısa olanları atla).
    out = replaceToken(out, full, alias);
    for (const part of full.split(/\s+/).filter((p) => p.length >= 2)) {
      out = replaceToken(out, part, alias);
    }
  }
  return out;
}

/** LLM çıktısındaki rumuzu gerçek adla değiştirir (ekler korunur — sınıf eşleşmesi sayesinde). */
export function rehydrateText(text: string, mappings: readonly NameMapping[]): string {
  if (!text) return text;
  let out = text;
  for (const { real, alias } of mappings) {
    if (!alias) continue;
    // Yalnız BÜYÜK harfle başlayan geçiş çevrilir: rumuz gündelik bir kelimeyle
    // aynı yazılsa bile ("mavi kalem") metin bozulmasın.
    out = replaceToken(out, alias, real, true);
  }
  return out;
}

/**
 * Nesne içindeki TÜM string'lerde gerçek adı rumuzla değiştirir.
 * Atölye gibi araç girdisinin tamamının (serbest metin alanları dahil) prompt'a
 * girdiği yerlerde tek çağrıyla kapsam sağlar.
 */
export function pseudonymizeDeep<T>(value: T, mappings: readonly NameMapping[]): T {
  if (typeof value === "string") return pseudonymizeText(value, mappings) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => pseudonymizeDeep(v, mappings)) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = pseudonymizeDeep(v, mappings);
    return out as T;
  }
  return value;
}
