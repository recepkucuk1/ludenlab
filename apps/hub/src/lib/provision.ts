import { studioDb } from "@/lib/db/studio";
import { atolyeDb } from "@/lib/db/atolye";

export type ModuleKey = "STUDIO" | "ATOLYE";

/**
 * Yeni merkezi `Account` için SEÇİLEN modül satırlarını oluşturur (Studio `Therapist` +
 * Atölye `Account`), e-posta köprülerinin (@studio/auth · @atolye/auth) çözülebilmesi için.
 *
 * - `modules`: hangi modüllere üyelik açılsın — kayıttaki seçim. Verilmezse İKİSİ (geriye-uyumlu).
 * - Idempotent: `upsert` (varsa no-op, yoksa create) → tekrar çağrılabilir; modül sonradan da eklenebilir.
 * - Best-effort: bir modül başarısız olsa diğeri + çağıran akış (kayıt) bozulmaz; loglar.
 * - Şifre: modüller bcrypt hash saklar (studio `password`, atolye `passwordHash`) → merkezi
 *   `passwordHash` kopyalanır. FREE varsayılanları şema-tarafı (`planType=FREE`, `credits=0`).
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
        create: { email, name, password: input.passwordHash },
      });
      result.studio = true;
    } catch (e) {
      console.error("[provision] studio Therapist oluşturulamadı:", email, e);
    }
  }

  if (modules.includes("ATOLYE")) {
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
  }

  return result;
}
