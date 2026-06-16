import { auth as centralAuth, signIn, signOut } from "@/auth";
import { studioDb } from "@/lib/db/studio";

export { signIn, signOut };

/**
 * Studio drop-in `auth()` — merkezi Account session'ını Studio `Therapist`'ine köprüler.
 *
 * Dönen `session.user.id = THERAPIST id` (eski Studio davranışı) → Studio'nun tüm
 * `session.user.id`'yi therapistId sanan çağrı yerleri (sayfalar/API/auth-helpers)
 * DOKUNULMADAN doğru çalışır. E-posta eşleşen Therapist yoksa `null` (Studio erişimi
 * bir Therapist kaydı gerektirir; yeni Account auto-provision = ayrı follow-up).
 */
export async function auth() {
  const s = await centralAuth();
  const email = s?.user?.email?.toLowerCase().trim();
  if (!s?.user || !email) return null;
  const t = await studioDb.therapist.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, role: true },
  });
  if (!t) return null;
  return { ...s, user: { ...s.user, id: t.id, role: t.role, email: t.email, name: t.name } };
}
