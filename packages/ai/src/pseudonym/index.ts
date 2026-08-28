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

/** Adın son "kelimesi" — ek buna takılır ("Ali Yılmaz'ın"). */
export function suffixBearingToken(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1]! : "";
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
const ALIAS_POOL = [
  "Ada", "Ayla", "Aslı", "Arda", "Asya", "Bora", "Buse", "Berk", "Bade", "Barış",
  "Ceren", "Cansu", "Çınar", "Defne", "Deniz", "Derya", "Doruk", "Duru", "Ece",
  "Efe", "Ela", "Elif", "Emir", "Eren", "Esra", "Ezgi", "Filiz", "Fırat", "Gizem",
  "Göktuğ", "Gül", "Hakan", "Hale", "Hazal", "İlke", "İpek", "Kaan", "Kerem",
  "Kuzey", "Lale", "Levent", "Mavi", "Melis", "Meral", "Mert", "Mehmet", "Nehir",
  "Nil", "Ozan", "Onur", "Öykü", "Özge", "Pelin", "Pınar", "Poyraz", "Rüya",
  "Selin", "Sema", "Serap", "Sinan", "Şule", "Tuna", "Tuğçe", "Ufuk", "Umut",
  "Yağmur", "Yaren", "Yiğit", "Zeynep", "Zehra", "Toprak", "Bulut", "Çisem",
  "Ferda", "Görkem", "Hira", "Işık", "Kayra", "Melek", "Nazlı", "Orkun", "Sarp",
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

/**
 * Türkçe harf sınırı: ASCII `\b` Türkçe harflerde yanlış çalışır (ör. "Alic" içinde "Ali"yi
 * eşleştirir). Adın önünde/arkasında HARF olmamasını elle şart koşarız; ek işaretleri
 * (kesme, boşluk, noktalama) sınır sayılır → "Ali'nin" eşleşir, "Alic" eşleşmez.
 */
const LETTER = "A-Za-zÇçĞğıİÖöŞşÜüÂâÎîÛû";

function replaceToken(text: string, token: string, replacement: string): string {
  if (!token) return text;
  const re = new RegExp(`(^|[^${LETTER}])(${escapeRe(token)})(?![${LETTER}])`, "gi");
  return text.replace(re, (_m, pre: string) => `${pre}${replacement}`);
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
    out = replaceToken(out, alias, real);
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
