import {
  pickAlias,
  pseudonymizeDeep,
  pseudonymizeText,
  rehydrateText,
  type NameMapping,
} from "@ludenlab/ai";
import { prisma } from "@studio/lib/db";

/**
 * Studio tarafı çocuk-PII takma-adı (2026-08 güvenlik denetimi #09).
 *
 * KURAL: gerçek ad LLM sağlayıcısına GİTMEZ. Prompt kurulurken ad → rumuz olur ve serbest
 * metinlerdeki (not/tanı/aiProfile/kart başlıkları) ad geçişleri de temizlenir; dönen metinde
 * rumuz gerçek adla değiştirilir. Terapist hep gerçek adı görür.
 *
 * DEPOLAMA KARARI: üretilen içerik DB'ye GERÇEK adla yazılır (rumuzla değil).
 * Sebep: rumuzla saklamak, her gösterim noktasında (kart listesi, kart detayı, PDF, dışa
 * aktarım) geri-çevirme gerektirirdi — geniş ve unutmaya açık bir yüzey; unutulan bir yer
 * terapiste SAHTE ad gösterirdi. Bunun yerine tek boğaz noktasında (prompt kurulumu)
 * temizlik yapıyoruz: daha önce kaydedilmiş içerik yeniden gönderildiğinde de
 * `pseudonymizeText` onu yakalar (kart başlıkları, aiProfile dahil). Güvenlik özelliği aynı
 * — sağlayıcı gerçek adı görmez — ama taşıma yüzeyi çok daha küçük.
 */

/** Rumuz alanını doldur (yoksa ata). Çocuk başına SABİT; terapist içinde çakışmaz. */
export async function ensureStudentAlias(student: {
  id: string;
  name: string;
  llmAlias?: string | null;
  therapistId?: string;
}): Promise<string> {
  if (student.llmAlias) return student.llmAlias;

  // Aynı uzmandaki diğer rumuzlar — iki çocuğun aynı rumuzu alması çıktıyı karıştırırdı.
  const siblings = student.therapistId
    ? await prisma.student.findMany({
        where: { therapistId: student.therapistId, llmAlias: { not: null } },
        select: { llmAlias: true },
      })
    : [];

  const alias = pickAlias(student.name, {
    scope: student.therapistId ?? student.id,
    taken: siblings.map((s) => s.llmAlias!).filter(Boolean),
  });

  // Best-effort kalıcılaştırma: yazamazsak da bu istek için rumuz kullanılır
  // (kararlı seçim sayesinde bir sonraki istekte aynı rumuz yeniden hesaplanır).
  try {
    await prisma.student.update({ where: { id: student.id }, data: { llmAlias: alias } });
  } catch (e) {
    console.error("[pseudonym] rumuz kaydedilemedi:", student.id, e);
  }
  return alias;
}

/** Prompt'a girecek serbest metinden gerçek ad geçişlerini söker. */
export function scrub(text: string | null | undefined, map: NameMapping): string | null {
  if (!text) return text ?? null;
  return pseudonymizeText(text, [map]);
}

/**
 * Araç formunun TAMAMINDA (iç içe tüm string'lerde) gerçek ad geçişlerini söker.
 *
 * `scrub` tek bir alanı temizliyordu; oysa araç formlarının serbest metin alanları
 * (seans notu, durum tarifi, hedef alan, uzmanın ek notu) prompt'a OLDUĞU GİBİ giriyor ve
 * uzman oraya doğal biçimde çocuğun adını yazıyor — asıl sızıntı kanalı budur. Sosyal
 * öyküde bu metin Claude tarafından `visualPrompt`'a taşınıp İKİNCİ sağlayıcıya (görsel)
 * da geçebiliyordu. Atölye tarafı bu kapsamı en baştan `pseudonymizeDeep` ile sağlıyordu;
 * Studio artık aynı kapsamda (2026-09 denetimi).
 */
export function scrubDeep<T>(value: T, map: NameMapping): T {
  return pseudonymizeDeep(value, [map]);
}

/** LLM çıktısındaki rumuzu gerçek adla değiştirir (kaydetmeden/göstermeden önce). */
export function restoreName(text: string, map: NameMapping): string {
  return rehydrateText(text, [map]);
}

/**
 * GÖRSEL SAĞLAYICISINA giden alanlar — gerçek ad BURAYA KONMAZ.
 *
 * `visualPrompt` (ve benzerleri) Claude'un ürettiği İngilizce sahne tarifidir ve sonradan
 * OLDUĞU GİBİ OpenAI/fal'a gönderilir. Rumuzu burada gerçek adla değiştirseydik, ad ikinci
 * bir üçüncü-taraf sağlayıcıya sızardı — prompt genel tarif ("a child…") istiyor ama modelin
 * buna her zaman uyacağını varsayamayız. Bu alanlar makineye bakar, terapiste değil:
 * rumuz kalır, kimse fark etmez, sızıntı kapanır.
 */
const IMAGE_PROMPT_KEYS = new Set(["visualPrompt", "imagePrompt", "scenePrompt"]);

/**
 * Nesne içindeki string'lerde rumuzu gerçek adla değiştirir (araç çıktıları iç içe JSON
 * döndürüyor: başlık, hikâye cümleleri, hücre kelimeleri…) — GÖRSEL PROMPT alanları HARİÇ.
 */
export function restoreNameDeep<T>(value: T, map: NameMapping): T {
  if (typeof value === "string") return restoreName(value, map) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => restoreNameDeep(v, map)) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      // Görsel prompt'ları RUMUZLU kalır (yukarıdaki gerekçe).
      out[k] = IMAGE_PROMPT_KEYS.has(k) ? v : restoreNameDeep(v, map);
    }
    return out as T;
  }
  return value;
}
