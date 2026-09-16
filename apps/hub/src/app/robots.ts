import type { MetadataRoute } from "next";

/**
 * Arama motoru yönergesi — bu dosya yokken `/robots.txt` 404 dönüyordu (2026-09 denetimi).
 *
 * Uygulama alt rotaları (`/studio/*`, `/atolye/*`) burada SAYILMAZ: anonim istekte zaten
 * 307 ile `/giris`'e dönüyorlar, yani taranamıyorlar. Burada yalnız gerçekten ulaşılabilir
 * ama indekslenmemesi gereken yüzeyler listeleniyor. `/studio` ve `/atolye` çıplak açılış
 * sayfaları PAZARLAMA sayfasıdır ve indekslenmelidir — bu yüzden dizin eşlemesi değil,
 * tam yol eşlemesi kullanılıyor.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/hesap",
        "/odeme",
        "/giris",
        "/kayit",
        "/sifremi-unuttum",
        "/sifre-sifirla",
        "/verify-email",
      ],
    },
    sitemap: "https://ludenlab.com/sitemap.xml",
  };
}
