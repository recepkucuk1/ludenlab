import { type DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: string; sessionVersion?: number } & DefaultSession["user"];
  }
  /** authorize() dönüşü — sessionVersion oturum-iptali çıpası olarak token'a taşınır. */
  interface User {
    role?: string;
    sessionVersion?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accountId?: string;
    role?: string;
    sessionVersion?: number;
  }
}
