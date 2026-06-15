import NextAuth from "next-auth";
import { authConfig } from "../auth.config";

// Middleware: sadece hafif authConfig kullanır (Edge runtime uyumlu)
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|fonts/|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.ico$).*)"],
};
