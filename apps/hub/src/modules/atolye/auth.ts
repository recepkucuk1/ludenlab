import { auth as centralAuth, signIn, signOut } from "@/auth";
import { atolyeDb } from "@/lib/db/atolye";
import { prisma } from "@/lib/db";
import { ensureModuleAccounts } from "@/lib/provision";

export { signIn, signOut };

const ACCOUNT_SELECT = { id: true, email: true, name: true, role: true, suspended: true } as const;

/**
 * Atölye drop-in `auth()` — merkezi Account session'ını Atölye `Account`'una köprüler.
 *
 * Dönen `session.user.id = ATÖLYE account id` (eski davranış) → tüm çağrı yerleri
 * (ownerId filtresi + `withRls(session.user.id)`) DOKUNULMADAN doğru çalışır.
 *
 * SELF-HEAL: merkezi hesap (giriş yapmış) var AMA eşleşen Atölye Account'u yoksa — örn.
 * modül kaydı provision edilmemiş demo/SSO/eski hesap — Account'u LAZY oluşturur (idempotent;
 * kayıt akışındaki `ensureModuleAccounts` ile aynı). Bu olmadan: /atolye index Account
 * bulamaz → landing → giriş → /hesap → tekrar landing (kırılmaz döngü). Provision yalnız
 * kayıt YOKKEN çalışır (steady-state'te ek yazma yok); best-effort → auth()'u çökertmez.
 */
export async function auth() {
  const s = await centralAuth();
  const email = s?.user?.email?.toLowerCase().trim();
  if (!s?.user || !email) return null;

  let a = await atolyeDb.account.findUnique({ where: { email }, select: ACCOUNT_SELECT });

  if (!a) {
    // Merkezi hesabı al (Account için ad + bcrypt hash kopyalanır) → modül kaydını aç.
    const acc = await prisma.account.findUnique({
      where: { email },
      select: { name: true, passwordHash: true },
    });
    if (acc) {
      await ensureModuleAccounts({
        email,
        name: acc.name ?? s.user.name ?? email,
        passwordHash: acc.passwordHash,
        modules: ["ATOLYE"],
      });
      a = await atolyeDb.account.findUnique({ where: { email }, select: ACCOUNT_SELECT });
    }
  }

  if (!a) return null;
  // ASKI KAPISI (2026-08 güvenlik denetimi #02): admin "askıya al" bayrağı yazıyordu ama
  // hiçbir yerde okunmuyordu → askıdaki uzman /atolye uçlarını kullanmaya devam ediyordu.
  // Köprü tek giriş noktası: null → tüm /atolye API'leri 401, sayfalar landing/giriş.
  if (a.suspended) return null;
  return { ...s, user: { ...s.user, id: a.id, role: a.role, email: a.email, name: a.name } };
}
