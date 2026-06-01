import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/giris" },
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
          select: { id: true, email: true, name: true, passwordHash: true, role: true, suspended: true },
        });
        if (!account) return null;

        const ok = await bcrypt.compare(password, account.passwordHash);
        if (!ok) return null;
        if (account.suspended) return null; // askıya alınmış hesap giriş yapamaz

        return { id: account.id, email: account.email, name: account.name, role: account.role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.accountId = user.id;
        token.role = (user as { role?: string }).role ?? "practitioner";
      }
      return token;
    },
    session({ session, token }) {
      if (token.accountId && session.user) {
        session.user.id = token.accountId as string;
        session.user.role = (token.role as string | undefined) ?? "practitioner";
      }
      return session;
    },
  },
});
