import { studioDb } from "@/lib/db/studio";
import { atolyeDb } from "@/lib/db/atolye";

/**
 * Yeni merkezi `Account` için modül satırlarını oluşturur (Studio `Therapist` +
 * Atölye `Account`), e-posta köprülerinin (@studio/auth · @atolye/auth) çözülebilmesi için.
 *
 * - Idempotent: `upsert` (varsa no-op, yoksa create) → tekrar çağrılabilir, migrate
 *   edilmiş kullanıcılarda çakışmaz.
 * - Best-effort: bir modül başarısız olsa diğeri + çağıran akış (kayıt) bozulmaz; loglar.
 * - Şifre: modüller bcrypt hash saklar (studio `password`, atolye `passwordHash`) →
 *   merkezi `passwordHash` kopyalanır (modül-direkt giriş de tutarlı; auth zaten köprüde).
 * - FREE varsayılanları şema-tarafı (`planType=FREE`, `credits=0`, vs.).
 */
export async function ensureModuleAccounts(input: {
  email: string;
  name: string;
  passwordHash: string;
}): Promise<{ studio: boolean; atolye: boolean }> {
  const email = input.email.toLowerCase().trim();
  const name = input.name.trim();
  const result = { studio: false, atolye: false };

  try {
    await studioDb.therapist.upsert({
      where: { email },
      update: {},
      create: { email, name, password: input.passwordHash },
    });
    result.studio = true;
  } catch (e) {
    console.error("[provision] studio Therapist oluşturulamadı:", email, e);
  }

  try {
    await atolyeDb.account.upsert({
      where: { email },
      update: {},
      create: { email, name, passwordHash: input.passwordHash },
    });
    result.atolye = true;
  } catch (e) {
    console.error("[provision] atolye Account oluşturulamadı:", email, e);
  }

  return result;
}
