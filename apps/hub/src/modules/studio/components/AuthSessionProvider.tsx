"use client";

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";

/**
 * Studio client session sağlayıcı. Köprü session'ı (server'da @studio/auth ile çözülen,
 * `user.role = Therapist.role` ör. "admin") `session` prop'uyla verilir.
 *
 * `refetchOnWindowFocus={false}`: merkezi `/api/auth/session` refetch'i bridge session'ı
 * EZMESİN (merkezi role="user" döner → admin linki kaybolurdu). Köprü session'ı sayfa
 * yüklemesinde SSR'dan gelir; oturum cookie'si zaten doğruluk kaynağı.
 */
export function AuthSessionProvider({
  children,
  session,
}: {
  children: React.ReactNode;
  session?: Session | null;
}) {
  return (
    <SessionProvider session={session} refetchOnWindowFocus={false}>
      {children}
    </SessionProvider>
  );
}
