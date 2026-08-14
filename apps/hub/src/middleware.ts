import { NextResponse, type NextRequest } from "next/server";

/**
 * /studio/* + /atolye/* için kaba auth gate — oturum çerezi yoksa merkezi /giris'e.
 * (Gerçek doğrulama + Therapist/Account çözümü sayfada: @studio/auth · @atolye/auth.)
 * Edge-safe: next-auth/Prisma YOK, yalnız çerez varlığı → Hostinger uyumlu.
 *
 * İSTİSNA: modül index'leri (`/studio`, `/atolye`) AÇIK — girişsiz kullanıcıya landing
 * sunulur; sayfa kendisi (modül auth'uyla) membership varsa dashboard'a yönlendirir.
 */
export function middleware(req: NextRequest) {
  const p = req.nextUrl.pathname;
  // Modül index'leri = açık landing → gate'leme (sayfa kendi auth'unu yapar).
  if (p === "/studio" || p === "/atolye") return NextResponse.next();
  // API route'ları kendi 401 JSON'unu döndürsün (redirect fetch'i bozar).
  if (p.startsWith("/studio/api/") || p.startsWith("/atolye/api/")) return NextResponse.next();

  const hasSession =
    req.cookies.has("authjs.session-token") || req.cookies.has("__Secure-authjs.session-token");

  // Eski modül auth yolları (standalone dönemin yer imi/parola-yöneticisi linkleri):
  // sayfaları artık yok. Oturumsuz kullanıcı merkezi giriş/kayıta (modül markasıyla),
  // oturumlu doğrudan modül dashboard'una. Bu yolları callbackUrl olarak taşımak
  // girişten sonra kullanıcıyı var olmayan sayfaya (404) düşürüyordu.
  const legacyAuth = p.match(/^\/(studio|atolye)\/(login|giris|register|kayit)\/?$/);
  if (legacyAuth) {
    const [, mod, action] = legacyAuth;
    const dest = `/${mod}/dashboard`;
    if (hasSession) return NextResponse.redirect(new URL(dest, req.nextUrl.origin));
    const url = new URL(action === "register" || action === "kayit" ? "/kayit" : "/giris", req.nextUrl.origin);
    url.searchParams.set("module", mod!);
    url.searchParams.set("callbackUrl", dest);
    return NextResponse.redirect(url);
  }

  if (!hasSession) {
    const url = new URL("/giris", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/studio/:path*", "/atolye/:path*"] };
