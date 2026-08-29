import { NextResponse, type NextRequest } from "next/server";
import { isCsrfExemptPath, isValidRequestOrigin } from "@/lib/csrf";

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

  // ── CSRF köken kilidi (2026-08 denetimi #28) — auth gate'ten ÖNCE, tüm eşleşen yollarda.
  // Durum değiştiren isteklerin tek savunması SameSite=Lax çerezdi; artık köken sunucuda
  // da doğrulanıyor (bkz. @/lib/csrf). Saf mantık orada, test edilebilir olsun diye.
  if (
    !isCsrfExemptPath(p) &&
    !isValidRequestOrigin({
      method: req.method,
      host: req.headers.get("host"),
      origin: req.headers.get("origin"),
      secFetchSite: req.headers.get("sec-fetch-site"),
      appUrl: process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? null,
    })
  ) {
    console.warn(`[csrf] reddedildi: ${req.method} ${p} origin=${req.headers.get("origin") ?? "-"}`);
    return NextResponse.json({ error: "Geçersiz istek kaynağı" }, { status: 403 });
  }

  // Auth gate yalnız modül YOLLARI için — merkezi /api/* buradan geçmez (kendi 401'ini döner).
  if (!p.startsWith("/studio") && !p.startsWith("/atolye")) return NextResponse.next();

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

/**
 * `/api/:path*` CSRF kilidi için eklendi (auth gate'i etkilemez — yukarıda erken çıkılıyor).
 *
 * `/odeme/*` BİLEREK LİSTEDE YOK: iyzico 3DS dönüşü `/odeme/sonuc`'a GERÇEK bir cross-site
 * form POST'u yapar; köken kontrolü oraya uygulanırsa ÖDEME AKIŞI KIRILIR. O uç zaten
 * callback'e güvenmiyor — token'ı iyzico'ya S2S doğrulatıyor.
 */
export const config = { matcher: ["/studio/:path*", "/atolye/:path*", "/api/:path*"] };
