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
 * ── YALNIZ ADLA YAZILAN EK (2026-10, dördüncü Türkçe kaçak) ──────────────────────
 * Sınıf eşleşmesi SOYADA göre yapılır; oysa uzman serbest metinde çoğu kez yalnız adı
 * ekiyle yazar: "Ela'nın çantası". "Ela" (kalın, ünlüyle biter) ile "Demir" (ince, ünsüzle
 * biter) farklı sınıfta → rumuz "Kerem" + korunan ek = "Kerem'nın" ✗. Bu yüzden ek artık
 * KORUNMAZ, yerine konan adın sınıfına YENİDEN ÜRETİLİR: ekin morfemi (tamlayan, yönelme…)
 * yüzey biçiminden tanınır, hedef sınıfa göre yeniden yazılır (`harmonizeSuffix`). Sınıf
 * zaten uyumluysa sonuç aynıdır (idempotent); geri-çevirmede de uygulanır ki model bozuk
 * biçimi kopyalamış olsa bile uzman doğru Türkçe görsün.
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
 * Adlara takılan ÇEKİM EKLERİ — morfem olarak. Yüzey biçimi hedef adın ses sınıfına göre
 * üretilir: tamlayan "Ela"da "nın", "Kerem"de "in". Yalnız ÖZEL ADA takılan, adı bütünüyle
 * saran ekler var: tamlayan, yönelme, belirtme, bulunma, ayrılma, çoğul, vasıta, -li.
 * `LOC_N`/`ABL_N` zamir n'li biçimler ("…nda/…ndan") — adlarda dilbilgisel değil ama uzman
 * yazımında görülüyor; yalnız ünlüsü uyarlanır, n korunur.
 */
type Morpheme = "GEN" | "DAT" | "ACC" | "LOC" | "ABL" | "PL" | "INS" | "WITH" | "LOC_N" | "ABL_N";
const MORPHEMES: readonly Morpheme[] = [
  "GEN", "DAT", "ACC", "LOC", "ABL", "PL", "INS", "WITH", "LOC_N", "ABL_N",
];

/** `nameClass` çıktısına göre ekin yüzey biçimi; sınıf hesaplanamıyorsa ("x") null. */
function surfaceFor(morpheme: Morpheme, cls: string): string | null {
  const ending = cls.slice(3);
  if (ending !== "V" && ending !== "C0" && ending !== "C1") return null;
  const front = cls[0] === "F";
  const round = cls[1] === "R";
  const A = front ? "e" : "a"; // iki biçimli ünlü (büyük ünlü uyumu)
  const I = front ? (round ? "ü" : "i") : round ? "u" : "ı"; // dört biçimli ünlü
  const D = ending === "C0" ? "t" : "d"; // ünsüz benzeşmesi (ötümsüzden sonra t)
  const y = ending === "V" ? "y" : ""; // kaynaştırma ünsüzleri — yalnız ünlüden sonra
  const n = ending === "V" ? "n" : "";
  switch (morpheme) {
    case "GEN": return `${n}${I}n`;
    case "DAT": return `${y}${A}`;
    case "ACC": return `${y}${I}`;
    case "LOC": return `${D}${A}`;
    case "ABL": return `${D}${A}n`;
    case "PL": return `l${A}r`;
    case "INS": return `${y}l${A}`;
    case "WITH": return `l${I}`;
    case "LOC_N": return `nd${A}`;
    case "ABL_N": return `nd${A}n`;
  }
}

/** Yüzey biçimi → morfem (tüm sınıflar üzerinden türetilir; çakışma yok). */
const MORPHEME_BY_SURFACE = new Map<string, Morpheme>();
for (const fr of ["F", "B"]) {
  for (const rd of ["R", "U"]) {
    for (const end of ["V", "C0", "C1"]) {
      for (const m of MORPHEMES) MORPHEME_BY_SURFACE.set(surfaceFor(m, `${fr}${rd}-${end}`)!, m);
    }
  }
}

/**
 * Ekin yazımını `targetName`in ses sınıfına uyarlar: "nın" + "Kerem" → "in",
 * "e" + "Asya" → "ya", "de" + "Mehmet" → "te". Tanınmayan ek ya da sınıfı hesaplanamayan
 * hedef (ünlüsüz) → ek olduğu gibi döner. BÜYÜK yazılmış ek büyük kalır ("NIN" → "İN").
 */
export function harmonizeSuffix(suffix: string, targetName: string): string {
  const morpheme = MORPHEME_BY_SURFACE.get(lower(suffix));
  if (!morpheme) return suffix;
  const out = surfaceFor(morpheme, nameClass(targetName));
  if (out === null) return suffix;
  const allCaps = suffix !== lower(suffix) && suffix === suffix.toLocaleUpperCase("tr");
  return allCaps ? out.toLocaleUpperCase("tr") : out;
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
 *
 * Kesme İŞARETLİ yazımda ("Mert'e", "Mert'i") tek harflik ekler de güvenle yakalanır —
 * kesme, adın bittiğini zaten söylüyor; gündelik kelime riski yok.
 */
const ALL_SURFACES = [...MORPHEME_BY_SURFACE.keys()];
const SUFFIXES = ALL_SURFACES.filter((s) => s.length >= 2);
function suffixPattern(suffixes: readonly string[]): string {
  return [...suffixes]
    .sort((a, b) => b.length - a.length) // uzun ek önce denensin
    .map((sfx) => tokenPattern(sfx))
    .join("|");
}
const SUFFIX_PATTERN = suffixPattern(SUFFIXES);
const APOS_SUFFIX_PATTERN = suffixPattern(ALL_SURFACES);
/** Düz, kıvrık ve değiştirici kesme işaretleri — çıktıda uzmanın yazdığı korunur. */
const APOSTROPHES = "'’‘ʼ";

/**
 * Metindeki `token` geçişlerini `replacement` ile değiştirir.
 *
 * Üç dal: ① ad + kesme + çekim eki, ② BÜYÜK harfle başlayan ad + bitişik çekim eki,
 * ③ sade ad. ①–②'de yakalanan ek `replacement`ın ses sınıfına YENİDEN ÜRETİLİR
 * (`harmonizeSuffix`) — yalnız adla yazılan ekte rumuz soyadın sınıfında olduğu için ek
 * aynen korunamaz. `capitalizedOnly` verilirse ① ve ③ de büyük harf ister — rumuzu gerçek
 * ada çevirirken (rehydrate) gündelik kelimeleri bozmamak için.
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
    `(^|[^${LETTER}])(?:` +
      `(${plain})([${APOSTROPHES}])(${APOS_SUFFIX_PATTERN})` +
      `|(${withSuffix})(${SUFFIX_PATTERN})` +
      `|(${plain})` +
      `)(?![${LETTER}])`,
    "g",
  );
  return text.replace(
    re,
    (
      _m,
      pre: string,
      aposTok: string | undefined,
      apos: string | undefined,
      aposSuffix: string | undefined,
      upperTok: string | undefined,
      suffix: string | undefined,
    ) => {
      if (aposTok !== undefined) {
        return `${pre}${replacement}${apos}${harmonizeSuffix(aposSuffix ?? "", replacement)}`;
      }
      if (upperTok !== undefined) {
        return `${pre}${replacement}${harmonizeSuffix(suffix ?? "", replacement)}`;
      }
      return `${pre}${replacement}`;
    },
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

/**
 * LLM çıktısındaki rumuzu gerçek adla değiştirir. Ek, gerçek adın (son kelimesinin) sınıfına
 * yeniden üretilir: sınıf eşli rumuzda bu hiçbir şeyi değiştirmez; model prompt'tan bozuk
 * bir biçim kopyalamışsa ya da yedek rumuz ("Öğrenci") kullanılmışsa yine doğru Türkçe çıkar.
 */
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
