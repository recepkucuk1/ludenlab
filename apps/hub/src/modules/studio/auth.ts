import { auth as centralAuth, signIn, signOut } from "@/auth";
import { studioDb } from "@/lib/db/studio";
import { prisma } from "@/lib/db";
import { ensureModuleAccounts } from "@/lib/provision";

export { signIn, signOut };

const THERAPIST_SELECT = { id: true, email: true, name: true, role: true } as const;

/**
 * Studio drop-in `auth()` — merkezi Account session'ını Studio `Therapist`'ine köprüler.
 *
 * Dönen `session.user.id = THERAPIST id` (eski Studio davranışı) → Studio'nun tüm
 * `session.user.id`'yi therapistId sanan çağrı yerleri (sayfalar/API/auth-helpers)
 * DOKUNULMADAN doğru çalışır.
 *
 * SELF-HEAL: merkezi hesap (giriş yapmış) var AMA eşleşen Therapist yoksa — örn. modül
 * kaydı provision edilmemiş demo/SSO/eski hesap — Therapist'i LAZY oluşturur (idempotent;
 * kayıt akışındaki `ensureModuleAccounts` ile aynı). Bu olmadan: /studio index Therapist
 * bulamaz → landing → giriş → /hesap → tekrar landing (kırılmaz döngü). Provision yalnız
 * kayıt YOKKEN çalışır (steady-state'te ek yazma yok); best-effort → auth()'u çökertmez.
 */
export async function auth() {
  const s = await centralAuth();
  const email = s?.user?.email?.toLowerCase().trim();
  if (!s?.user || !email) return null;

  let t = await studioDb.therapist.findUnique({ where: { email }, select: THERAPIST_SELECT });

  if (!t) {
    // Merkezi hesabı al (Therapist için ad + bcrypt hash kopyalanır) → modül kaydını aç.
    const acc = await prisma.account.findUnique({
      where: { email },
      select: { name: true, passwordHash: true },
    });
    if (acc) {
      await ensureModuleAccounts({
        email,
        name: acc.name ?? s.user.name ?? email,
        passwordHash: acc.passwordHash,
        modules: ["STUDIO"],
      });
      t = await studioDb.therapist.findUnique({ where: { email }, select: THERAPIST_SELECT });
    }
  }

  if (!t) return null;
  return { ...s, user: { ...s.user, id: t.id, role: t.role, email: t.email, name: t.name } };
}
