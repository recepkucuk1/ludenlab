import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { studioDb } from "@/lib/db/studio";
import { atolyeDb } from "@/lib/db/atolye";

/**
 * Şifre işlemlerinin TEK otoritesi = merkezi `billing.Account.passwordHash`.
 *
 * NEDEN (2026-08 güvenlik denetimi #07): modül "Şifre Değiştir" uçları yalnız kendi yerel
 * hash'lerini (`studio.Therapist.password` / `atolye.Account.passwordHash`) güncelliyordu.
 * Giriş ise `auth.ts` üzerinden MERKEZİ hash'e bakıyor → kullanıcı "şifrem değişti" sanırken
 * saldırgan eski şifreyle girmeye devam ediyordu. Ters yönde de modüldeki "mevcut şifre"
 * doğrulaması bayat hash'e karşı yapıldığı için ESKİ şifreyi kabul ediyordu.
 *
 * Bu modül üç şeyi birlikte yapar (hepsi ya da hiçbiri anlamında sıralı):
 *   1. Merkezi hash'i yazar (giriş bunu kullanır)
 *   2. `sessionVersion`'ı +1 artırır → hesabın TÜM eski JWT oturumları anında düşer (#06)
 *   3. Modül kopyalarını senkronlar (best-effort; auth'ta kullanılmaz, tutarlılık için)
 */

const BCRYPT_ROUNDS = 12;

/** Modül satırlarındaki hash kopyalarını hizalar. Best-effort: hata ana akışı bozmaz. */
export async function syncModulePasswordHash(email: string, passwordHash: string): Promise<void> {
  const key = email.toLowerCase().trim();
  const results = await Promise.allSettled([
    studioDb.therapist.updateMany({ where: { email: key }, data: { password: passwordHash } }),
    atolyeDb.account.updateMany({ where: { email: key }, data: { passwordHash } }),
  ]);
  for (const r of results) {
    if (r.status === "rejected") {
      console.error("[password] modül hash senkronu başarısız:", r.reason);
    }
  }
}

/**
 * Merkezi şifreyi değiştirir + eski oturumları geçersiz kılar + modülleri senkronlar.
 * `accountId` = merkezi `billing.Account.id`.
 */
export async function setAccountPassword(accountId: string, newPassword: string): Promise<void> {
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  const account = await prisma.account.update({
    where: { id: accountId },
    data: { passwordHash, sessionVersion: { increment: 1 } },
    select: { email: true },
  });
  await syncModulePasswordHash(account.email, passwordHash);
}

/**
 * Modül uçları için: e-posta ile merkezi hesabı bulur, MEVCUT şifreyi merkezi hash'e karşı
 * doğrular, yeni şifreyi merkezi otoriteye yazar. Modül-yerel hash'e asla güvenmez.
 */
export async function changePasswordByEmail(
  email: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; reason: "not_found" | "wrong_password" }> {
  const account = await prisma.account.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: { id: true, passwordHash: true },
  });
  if (!account) return { ok: false, reason: "not_found" };

  const valid = await bcrypt.compare(currentPassword, account.passwordHash);
  if (!valid) return { ok: false, reason: "wrong_password" };

  await setAccountPassword(account.id, newPassword);
  return { ok: true };
}
