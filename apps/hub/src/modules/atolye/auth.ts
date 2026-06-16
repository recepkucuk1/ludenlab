import { auth as centralAuth, signIn, signOut } from "@/auth";
import { atolyeDb } from "@/lib/db/atolye";

export { signIn, signOut };

/**
 * Atölye drop-in `auth()` — merkezi Account session'ını Atölye `Account`'una köprüler.
 *
 * Dönen `session.user.id = ATÖLYE account id` (eski davranış) → tüm çağrı yerleri
 * (ownerId filtresi + `withRls(session.user.id)`) DOKUNULMADAN doğru çalışır.
 * E-posta eşleşen Atölye Account'u yoksa `null` (yeni Account auto-provision = follow-up).
 */
export async function auth() {
  const s = await centralAuth();
  const email = s?.user?.email?.toLowerCase().trim();
  if (!s?.user || !email) return null;
  const a = await atolyeDb.account.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, role: true },
  });
  if (!a) return null;
  return { ...s, user: { ...s.user, id: a.id, role: a.role, email: a.email, name: a.name } };
}
