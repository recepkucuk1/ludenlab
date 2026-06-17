import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

/**
 * Apex (ludenlab.com) merkezi kimlik = `billing.Account` (SSO otoritesi).
 * Cross-subdomain SSO: prod'da `COOKIE_DOMAIN=.ludenlab.com` → oturum cookie'si
 * subdomain'lerde (studio./atolye./brytakip.) de geçerli olur. Dev'de (localhost)
 * COOKIE_DOMAIN tanımsız → varsayılan cookie davranışı.
 */
const useSecureCookies = process.env.NODE_ENV === "production";
const cookieDomain = process.env.COOKIE_DOMAIN;

export const { handlers, auth, signIn, signOut } = NextAuth({
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
      async authorize(credentials) {
        const email = (credentials?.email as string | undefined)?.toLowerCase().trim();
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const account = await prisma.account.findUnique({
          where: { email },
          select: { id: true, email: true, name: true, passwordHash: true, role: true, suspended: true, emailVerified: true },
        });
        if (!account) return null;

        const ok = await bcrypt.compare(password, account.passwordHash);
        if (!ok) return null;
        if (account.suspended) return null; // askıya alınmış hesap giriş yapamaz
        if (!account.emailVerified) return null; // e-posta doğrulanmadan giriş yok (zorunlu gate)

        return { id: account.id, email: account.email, name: account.name, role: account.role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.accountId = user.id;
        token.role = (user as { role?: string }).role ?? "user";
      }
      return token;
    },
    session({ session, token }) {
      if (token.accountId && session.user) {
        session.user.id = token.accountId as string;
        session.user.role = (token.role as string | undefined) ?? "user";
      }
      return session;
    },
  },
});
