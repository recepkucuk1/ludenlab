import { studioDb } from "@/lib/db/studio";
import { maskEmail } from "@/lib/logRedact";
import { atolyeDb } from "@/lib/db/atolye";
import { INITIAL_FREE_CREDITS } from "@studio/lib/plans";
import { FREE_CREDITS as ATOLYE_FREE_CREDITS } from "@atolye/lib/plans";

export type ModuleKey = "STUDIO" | "ATOLYE";

/**
 * Yeni merkezi `Account` için SEÇİLEN modül satırlarını oluşturur (Studio `Therapist` +
 * Atölye `Account`), e-posta köprülerinin (@studio/auth · @atolye/auth) çözülebilmesi için.
 *
 * - `modules`: hangi modüllere üyelik açılsın — kayıttaki seçim. Verilmezse İKİSİ (geriye-uyumlu).
 * - Idempotent: `upsert` (varsa no-op, yoksa create) → tekrar çağrılabilir; modül sonradan da eklenebilir.
 * - Best-effort: bir modül başarısız olsa diğeri + çağıran akış (kayıt) bozulmaz; loglar.
 * - Şifre: modüller bcrypt hash saklar (studio `password`, atolye `passwordHash`) → merkezi
 *   `passwordHash` kopyalanır. `planType=FREE` şema varsayılanı.
 * - ÜCRETSİZ BAŞLANGIÇ HAKKI burada verilir. Şema varsayılanı `credits=0` olduğu ve
 *   dönem kredisini yükleyen reconcile yalnız ÜCRETLİ abonelikte çalıştığı için, bu satır
 *   olmadan yeni kullanıcı sıfır hakla açılıyor ve ilk üretiminde reddediliyordu — landing
 *   ise "ayda 2 üretim hakkı" vaat ediyor (2026-09 denetimi, P0). Hak yalnız `create`
 *   dalında verilir: mevcut hesap tekrar provision edilirse İKİNCİ KEZ yüklenmez.
 */
export async function ensureModuleAccounts(input: {
  email: string;
  name: string;
  passwordHash: string;
  modules?: ModuleKey[];
}): Promise<{ studio: boolean; atolye: boolean }> {
  const email = input.email.toLowerCase().trim();
  const name = input.name.trim();
  const modules = input.modules ?? ["STUDIO", "ATOLYE"];
  const result = { studio: false, atolye: false };

  if (modules.includes("STUDIO")) {
    try {
      await studioDb.therapist.upsert({
        where: { email },
        update: {},
        create: {
          email,
          name,
          password: input.passwordHash,
          credits: INITIAL_FREE_CREDITS,
          creditTxns: {
            create: {
              amount: INITIAL_FREE_CREDITS,
              type: "EARN",
              description: "Ücretsiz plan başlangıç hakkı",
            },
          },
        },
      });
      result.studio = true;
    } catch (e) {
      console.error("[provision] studio Therapist oluşturulamadı:", maskEmail(email), e);
    }
  }

  if (modules.includes("ATOLYE")) {
    try {
      await atolyeDb.account.upsert({
        where: { email },
        update: {},
        create: {
          email,
          name,
          passwordHash: input.passwordHash,
          credits: ATOLYE_FREE_CREDITS,
          creditTxns: {
            create: {
              amount: ATOLYE_FREE_CREDITS,
              type: "EARN",
              reason: "Ücretsiz plan başlangıç hakkı",
            },
          },
        },
      });
      result.atolye = true;
    } catch (e) {
      console.error("[provision] atolye Account oluşturulamadı:", maskEmail(email), e);
    }
  }

  return result;
}
