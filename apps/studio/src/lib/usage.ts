import { prisma } from "@/lib/db";
import { calcCost, MODEL } from "@/lib/anthropic";
import { logError } from "@/lib/utils";

/**
 * Anthropic SDK'nın dönüş objesindeki `usage` alanının minimum kontratı.
 * SDK tipini doğrudan import etmek yerine yapısal tip kullanıyoruz ki beta
 * endpoint'leri ve ileride eklenecek alanlar da sorunsuz geçsin.
 */
export interface AnthropicUsageLike {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
}

/**
 * Teknik API maliyetini kayıt altına alır. **Asla hata fırlatmaz** — DB yazımı
 * başarısız olsa bile üst kat (kart üretimi, tool çağrısı) etkilenmez. Bilinçli
 * olarak fire-and-forget: `await` etmeyin, geri dönüş değerini kullanmayın.
 *
 * Console log'u da üretir; `CARD_GEN_LOG_USAGE=0` ile kapatılabilir.
 *
 * @param therapistId Kaydı bu kullanıcıya bağlar; admin panelinde aggregate'in temeli
 * @param endpoint    "cards/generate", "tools/social-story", vs. — kolay filtrelenebilir kısa etiket
 * @param usage       Anthropic response.usage objesi — token dağılımı buradan alınır
 */
export function logUsage(
  therapistId: string,
  endpoint: string,
  usage: AnthropicUsageLike,
): void {
  const cost = calcCost(usage);

  if (process.env.CARD_GEN_LOG_USAGE !== "0") {
    console.log(
      `[usage] ${endpoint} tok(in=${usage.input_tokens} out=${usage.output_tokens} cacheW=${usage.cache_creation_input_tokens ?? 0} cacheR=${usage.cache_read_input_tokens ?? 0}) cost=$${cost.totalUsd.toFixed(5)} therapist=${therapistId}`,
    );
  }

  // Fire-and-forget — dönüş Promise'ini yakalayıp hataları yut, ama logla.
  prisma.apiUsageLog
    .create({
      data: {
        therapistId,
        endpoint,
        model: MODEL,
        inputTokens: usage.input_tokens,
        outputTokens: usage.output_tokens,
        cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
        cacheReadTokens: usage.cache_read_input_tokens ?? 0,
        costUsd: cost.totalUsd.toFixed(6),
      },
    })
    .catch((err) => {
      logError("logUsage", err);
    });
}
