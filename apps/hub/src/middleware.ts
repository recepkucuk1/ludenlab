import { NextResponse, type NextRequest } from "next/server";

/**
 * /studio/* için kaba auth gate — oturum çerezi yoksa merkezi /giris'e.
 * (Gerçek doğrulama + Therapist çözümü sayfada: @studio/auth wrapper.)
 * Edge-safe: next-auth/Prisma YOK, yalnız çerez varlığı → Hostinger uyumlu.
 */
export function middleware(req: NextRequest) {
  // API route'ları kendi 401 JSON'unu döndürsün (redirect fetch'i bozar).
  const p = req.nextUrl.pathname;
  if (p.startsWith("/studio/api/") || p.startsWith("/atolye/api/")) return NextResponse.next();
  const hasSession =
    req.cookies.has("authjs.session-token") || req.cookies.has("__Secure-authjs.session-token");
  if (!hasSession) {
    const url = new URL("/giris", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/studio/:path*", "/atolye/:path*"] };
