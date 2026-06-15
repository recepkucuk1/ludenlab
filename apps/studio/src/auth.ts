import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { authConfig } from "../auth.config";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { logError } from "@/lib/utils";

/**
 * Returns a short fingerprint of a bcrypt hash for session invalidation.
 * When password changes, the bcrypt hash changes → fingerprint changes →
 * existing JWTs become invalid in the session callback below.
 */
function passwordFingerprint(bcryptHash: string): string {
  return crypto.createHash("sha256").update(bcryptHash).digest("hex").slice(0, 16);
}

/**
 * Custom CredentialsSignin error with a typed code that is propagated to
 * the client via the `code` field on the signIn result.
 */
type AuthErrorCode = "RATE_LIMIT" | "EMAIL_NOT_VERIFIED" | "SUSPENDED" | "INVALID_CREDENTIALS";

class AuthCodeError extends CredentialsSignin {
  constructor(code: AuthErrorCode) {
    super();
    this.code = code;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Şifre", type: "password" },
        autoLoginToken: { label: "Auto Login Token", type: "text" },
      },
      async authorize(credentials, request) {
        try {
          // ─── Auto-login path: email verify sonrası tek kullanımlık token ───
          const autoToken = credentials?.autoLoginToken as string | undefined;
          if (autoToken) {
            const tokenHash = crypto
              .createHash("sha256")
              .update(autoToken)
              .digest("hex");

            const therapist = await prisma.therapist.findFirst({
              where: {
                autoLoginToken: tokenHash,
                autoLoginExpires: { gt: new Date() },
              },
              select: {
                id: true,
                email: true,
                name: true,
                password: true,
                role: true,
                suspended: true,
                emailVerified: true,
              },
            });

            if (!therapist || therapist.suspended || !therapist.emailVerified) {
              return null;
            }

            // Token tek kullanımlık — hemen sil ve son giriş zamanını güncelle
            await prisma.therapist.update({
              where: { id: therapist.id },
              data: {
                autoLoginToken: null,
                autoLoginExpires: null,
                lastLogin: new Date(),
              },
            });

            return {
              id: therapist.id,
              email: therapist.email,
              name: therapist.name,
              role: therapist.role,
              passwordFingerprint: passwordFingerprint(therapist.password),
            };
          }

          // ─── Password path ───
          if (!credentials?.email || !credentials?.password) return null;

          // Brute-force koruması: IP + email bazlı rate limit
          // 15 dakikada 5 deneme
          const ip = request ? getClientIp(request.headers) : "unknown";
          const rlKey = `login:${ip}:${(credentials.email as string).toLowerCase()}`;
          const { allowed } = rateLimit(rlKey, 5, 15 * 60_000);
          if (!allowed) {
            throw new AuthCodeError("RATE_LIMIT");
          }

          const therapist = await prisma.therapist.findUnique({
            where: { email: (credentials.email as string).toLowerCase().trim() },
            select: {
              id: true,
              email: true,
              name: true,
              password: true,
              role: true,
              suspended: true,
              emailVerified: true,
            },
          });

          if (!therapist) {
            throw new AuthCodeError("INVALID_CREDENTIALS");
          }

          const isValid = await bcrypt.compare(
            credentials.password as string,
            therapist.password
          );

          if (!isValid) {
            throw new AuthCodeError("INVALID_CREDENTIALS");
          }

          if (!therapist.emailVerified) {
            throw new AuthCodeError("EMAIL_NOT_VERIFIED");
          }

          if (therapist.suspended) {
            throw new AuthCodeError("SUSPENDED");
          }

          await prisma.therapist.update({
            where: { id: therapist.id },
            data: { lastLogin: new Date() },
          });

          return {
            id: therapist.id,
            email: therapist.email,
            name: therapist.name,
            role: therapist.role,
            passwordFingerprint: passwordFingerprint(therapist.password),
          } as unknown as import("next-auth").User;
        } catch (error) {
          // CredentialsSignin (and subclasses) are propagated so the client
          // can read `result.code` to distinguish the failure reason.
          if (error instanceof CredentialsSignin) {
            throw error;
          }
          logError("[auth] authorize", error);
          return null;
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "user";
        token.passwordFingerprint = (user as { passwordFingerprint?: string }).passwordFingerprint;
      }
      return token;
    },
    async session({ session, token }) {
      if (!token?.id) {
        session.user.role = "user";
        return session;
      }

      // Her istekte DB'den güncel bilgileri çek
      const therapist = await prisma.therapist.findUnique({
        where: { id: token.id as string },
        select: { role: true, suspended: true, password: true },
      });

      // Kullanıcı silinmiş, askıya alınmış veya şifresi değişmiş → oturum geçersiz
      if (!therapist || therapist.suspended) {
        session.user.id = "";
        session.user.role = "user";
        return session;
      }

      // Password değişmişse (şifre sıfırlama sonrası) oturumu reddet
      const currentFingerprint = passwordFingerprint(therapist.password);
      if (
        token.passwordFingerprint &&
        token.passwordFingerprint !== currentFingerprint
      ) {
        session.user.id = "";
        session.user.role = "user";
        return session;
      }

      session.user.id = token.id as string;
      session.user.role = therapist.role ?? "user";
      return session;
    },
  },
});
