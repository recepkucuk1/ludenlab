import type { MetadataRoute } from "next";

/**
 * Site haritası — yalnız HERKESE AÇIK ve indekslenmesi istenen sayfalar.
 * Giriş arkasındaki her şey burada YOK; yasal metinler var çünkü aramadan doğrudan
 * bulunabilmeleri kullanıcı lehinedir.
 *
 * `lastModified` BİLEREK YOK: buradan verilebilecek tek değer derleme zamanıdır ve her
 * deploy'da hiç değişmemiş sayfaların tarihini de tazelerdi. Yanlış "güncellendi" sinyali,
 * tarih hiç vermemekten kötüdür — tarama motoru lastmod'a güvenmeyi bırakır. Gerçek
 * değişiklik tarihi bir içerik kaynağından gelebildiğinde eklenmeli.
 */
const BASE = "https://ludenlab.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/studio`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/atolye`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/fiyatlandirma`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/kvkk`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/gizlilik`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/kosullar`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
