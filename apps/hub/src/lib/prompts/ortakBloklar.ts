// apps/hub/src/lib/prompts/ortakBloklar.ts
/* İki modülün (Studio + Atölye) PAYLAŞACAĞI prompt blokları.
   Bu fazda (1A) hiçbir prompt'a bağlanmaz; yalnız eval kontrolleri `YASAK_KALIPLAR`'ı kullanır.
   ETIK_SINIR: `ATOLYE_SYSTEM`'in (atolye-system.ts) "ETİK SINIR" bloğundan AYNEN.
   DIL_KURALI: yeni bir birleşim — Studio araç prompt'larındaki dağınık dil kuralları
   (hasta/terapist, içsel motivasyon) + `ATOLYE_SYSTEM`'deki "güçlü yöne dayalı…" satırının
   kısaltılmış hâli. Faz 2/3'te prompt'lar buradan beslenirken atolye-system.ts'teki
   "çocuğun ilgi alanlarını etkinliklere taşı" cümlesi KORUNMALI (burada yok). */

/** Somut bir eylemle birlikte yazılmadıkça jenerik sayılan kalıplar (gövde hâlinde, küçük harf). */
export const YASAK_KALIPLAR: readonly string[] = [
  "çok duyulu yaklaşım kullan",
  "bireysel farklılıklara dikkat",
  "sabırlı ol",
  "olumlu pekiştirme yap",
  "düzenli tekrar önemli",
  "motivasyonu yüksek tut",
  "uygun ortam sağla",
  "gelişimini takip e",
];

/** Metinde geçen yasak kalıpları, bağlama bakmadan (her geçişi) bulur; her kalıp en çok bir kez, LİSTE sırasıyla (metin sırası değil) döner. Türkçe küçük harf karşılaştırma; çekimli biçimleri (ör. "ortamı sağlayın") yakalamaz — bilinçli sınır. */
export function yasakKalipBul(text: string): string[] {
  const t = text.replace(/\s+/g, " ").toLocaleLowerCase("tr-TR");
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
