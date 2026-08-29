import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

/**
 * Apex (ludenlab.com) merkezi kimlik = `billing.Account` (SSO otoritesi).
 * Cross-subdomain SSO: prod'da `COOKIE_DOMAIN=.ludenlab.com` → oturum cookie'si
 * subdomain'lerde (studio./atolye./brytakip.) de geçerli olur. Dev'de (localhost)
 * COOKIE_DOMAIN tanımsız → varsayılan cookie davranışı.
 */
const useSecureCookies = process.env.NODE_ENV === "production";
const cookieDomain = process.env.COOKIE_DOMAIN;

const {
  handlers,
  auth: rawAuth,
  signIn,
  signOut,
} = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/giris" },
  ...(cookieDomain
    ? {
        cookies: {
          sessionToken: {
            name: `${useSecureCookies ? "__Secure-" : ""}authjs.session-token`,
            options: {
              httpOnly: true,
              sameSite: "lax",
              path: "/",
              secure: useSecureCookies,
              domain: cookieDomain,
            },
          },
        },
      }
    : {}),
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-posta", type: "email" },
        password: { label: "Şifre", type: "password" },
      },
      async authorize(credentials, request) {
        const email = (credentials?.email as string | undefined)?.toLowerCase().trim();
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        // Brute-force / credential-stuffing throttle. Limit aşımında "geçersiz kimlik"
        // gibi null döner (rate-limit olduğunu sızdırmaz). E-posta her zaman; IP varsa.
        if (!rateLimit(`login:email:${email}`, 8).allowed) return null;
        const ip = request?.headers ? getClientIp(request.headers) : "unknown";
        if (ip !== "unknown" && !rateLimit(`login:ip:${ip}`, 30).allowed) return null;

        const account = await prisma.account.findUnique({
          where: { email },
          select: { id: true, email: true, name: true, passwordHash: true, role: true, suspended: true, emailVerified: true, sessionVersion: true },
        });
        if (!account) return null;

        const ok = await bcrypt.compare(password, account.passwordHash);
        if (!ok) return null;
        if (account.suspended) return null; // askıya alınmış hesap giriş yapamaz
        if (!account.emailVerified) return null; // e-posta doğrulanmadan giriş yok (zorunlu gate)

        return {
          id: account.id,
          email: account.email,
          name: account.name,
          role: account.role,
          sessionVersion: account.sessionVersion,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.accountId = user.id;
        token.role = (user as { role?: string }).role ?? "user";
        // Oturum iptali çıpası — girişteki sürüm token'a yazılır; auth() her istekte
        // DB ile karşılaştırır (bkz. aşağıdaki sarmalayıcı).
        token.sessionVersion = (user as { sessionVersion?: number }).sessionVersion ?? 0;
      }
      return token;
    },
    session({ session, token }) {
      if (token.accountId && session.user) {
        session.user.id = token.accountId as string;
        session.user.role = (token.role as string | undefined) ?? "user";
        session.user.sessionVersion = (token.sessionVersion as number | undefined) ?? 0;
      }
      return session;
    },
  },
});

export { handlers, signIn, signOut };

/**
 * Merkezi `auth()` — HER ÇAĞRIDA oturumu DB ile yeniden doğrular.
 *
 * `strategy: "jwt"` olduğu için token imzalıdır ve kendi başına ~30 gün geçerlidir: DB'de
 * ne olursa olsun (şifre değişti, hesap askıya alındı, hesap silindi) eski token çalışmaya
 * devam ederdi. Bu sarmalayıcı üç iptal yolunu kapatır (2026-08 güvenlik denetimi #02/#06):
 *
 *   1. Hesap yok (silinmiş)                → oturum düşer
 *   2. `suspended` (platform yasağı)       → oturum düşer (yeniden giriş de authorize'da engelli)
 *   3. `sessionVersion` uyuşmuyor          → şifre değişikliği/sıfırlaması sonrası eski oturumlar düşer
 *
 * Maliyet: auth() başına tek indeksli `findUnique`. Modül köprüleri zaten DB'ye gidiyor;
 * ölçekte (tek Node süreci) kabul edilebilir ve doğru güvenlik duruşu için gerekli.
 *
 * NOT: `rawAuth` doğrudan DIŞARI VERİLMEZ — tüm çağrı yerleri (`@/auth`) bu kapıdan geçer.
 */
export const auth: typeof rawAuth = (async (...args: Parameters<typeof rawAuth>) => {
  const session = await (rawAuth as (...a: unknown[]) => Promise<unknown>)(...args);
  const s = session as
    | { user?: { id?: string; sessionVersion?: number; role?: string } }
    | null;
  if (!s?.user?.id) return session;

  const account = await prisma.account.findUnique({
    where: { id: s.user.id },
    select: { suspended: true, sessionVersion: true, role: true },
  });

  if (!account) return null; // hesap silinmiş → token ölü
  if (account.suspended) return null; // platform yasağı → anında etkili
  if (account.sessionVersion !== (s.user.sessionVersion ?? 0)) return null; // şifre değişti → eski oturum ölü

  // ROL HER İSTEKTE TAZE (2026-08 denetimi #26): `role` yalnız GİRİŞTE token'a yazılıyordu,
  // yani adminlikten çıkarılan biri token ömrü boyunca (~30 gün) admin kalıyordu — ve merkezi
  // admin kapısı (/hesap/tahsilat + CSV) TÜM müşterilerin TCKN/VKN/adresini açıyor. Ters yönde
  // de yeni admin, yeniden giriş yapana kadar yetkisiz kalıyordu.
  // Studio modülü bunu zaten `requireAdmin()` ile taze DB okumasıyla yapıyordu; merkezi taraf
  // artık aynı disiplinde. Ek maliyet yok — sorgu zaten atılıyor, tek kolon eklendi.
  if (account.role !== s.user.role) {
    return { ...s, user: { ...s.user, role: account.role } } as typeof session;
  }

  return session;
}) as typeof rawAuth;
