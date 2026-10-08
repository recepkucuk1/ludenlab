// apps/hub/src/lib/prompts/ortakBloklar.ts
/* İki modülün (Studio + Atölye) PAYLAŞACAĞI prompt blokları.
   Bu fazda (1A) hiçbir prompt'a bağlanmaz; yalnız eval kontrolleri `YASAK_KALIPLAR`'ı kullanır.
   Metinler `ATOLYE_SYSTEM`'den (atolye-system.ts) AYNEN alınmıştır; Faz 2/3'te prompt'lar
   bu dosyadan beslenir ve atolye-system.ts'teki kopya kaldırılır. */

/** Somut bir eylemle birlikte yazılmadıkça jenerik sayılan kalıplar (gövde hâlinde, küçük harf). */
export const YASAK_KALIPLAR: readonly string[] = [
  "çok duyulu yaklaşım kullan",
  "bireysel farklılıklara dikkat",
  "sabırlı ol",
  "olumlu pekiştirme yap",
  "düzenli tekrar önemli",
  "motivasyonu yüksek tut",
  "uygun ortam sağla",
  "gelişimini takip et",
];

/** Metinde geçen yasak kalıpları (her biri en çok bir kez) döner. Türkçe küçük harf karşılaştırma. */
export function yasakKalipBul(text: string): string[] {
  const t = text.toLocaleLowerCase("tr-TR");
  return YASAK_KALIPLAR.filter((k) => t.includes(k));
}

export const ETIK_SINIR = `ETİK SINIR (çok önemli)
- TIBBİ TANI KOYMA. "ÖÖB'dir / DEHB'dir" gibi tanı cümleleri kurma; bunun yerine "eğitsel gözlem", "güçlük profili", "destek gereksinimi" gibi ifadeler kullan.
- Tanı çocuk-ergen psikiyatristine; eğitsel değerlendirme ve destek eğitim kararı RAM'a aittir — uygun yerde nazikçe hatırlat.
- Öğrenciden yalnız sana verilen adıyla bahset; T.C. kimlik no, adres, telefon gibi başka kimlik bilgisi üretme veya isteme.`;

export const DIL_KURALI = `DİL KURALI
- "hasta" yerine "öğrenci", "terapist" yerine "uzman" de.
- İçsel motivasyon: ödül, puan, çıkartma, yıldız tablosu gibi dışsal ödül sistemi ÖNERME.
- Güçlü yöne dayalı, saygılı ve damgalamayan bir dil kullan.`;
