// apps/hub/src/lib/prompts/ortakBloklar.ts
/* İki modülün (Studio + Atölye) PAYLAŞACAĞI prompt blokları.
   Faz 1A'da yalnız eval kontrolleri `YASAK_KALIPLAR`'ı kullanıyordu; Faz 2'den itibaren Studio
   sistem prompt iskeleti (`modules/studio/lib/prompts/iskelet.ts`) `ORTAK_SON_BLOK`'u kapanış
   bloğu olarak ekler (spec A1 madde 7). Atölye bağlantısı Faz 3.
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

/** "Yalnız verilen adla bahset" ETİK SINIR'ın 3. maddesinde; burada yalnız rumuz-özel ek. */
export const RUMUZ_NOTU = `RUMUZ NOTU
- Sana verilen ad bir rumuz olabilir: onu değiştirme, kısaltma ya da başka ad üretme.`;

/** Gövde biçimi tek başına tuhaf okunan kalıpların prompt'ta gösterilen hâli; gövde, gösterimin
    ön eki kalmalı ki `yasakKalipBul` aynı kalıbı tanısın (test: round-trip). */
const KALIP_GOSTERIMI: Readonly<Record<string, string>> = { "gelişimini takip e": "gelişimini takip et" };

/** Yasak kalıpları prompt metnine döker: kalıplar yalnız somut bir eylemle birlikte yazılabilir
    (çekimli biçimleri dahil). */
export function yasakKalipMetni(): string {
  const liste = YASAK_KALIPLAR.map((k) => `"${KALIP_GOSTERIMI[k] ?? k}"`).join(", ");
  return `JENERİK KALIPLAR (yalnız somut bir eylemle birlikte yazılabilir; tek başına YAZMA): ${liste} (çekimli biçimleri dahil). Örnek: "sabırlı olun" yerine "çocuk 5 saniye içinde yanıt vermezse aynı soruyu aynı sözcüklerle bir kez daha sorun".`;
}

/** İki modülün paylaştığı kapanış bloğu (A1 madde 7): etik sınır → dil kuralı → rumuz notu → yasak kalıplar. */
export const ORTAK_SON_BLOK = [ETIK_SINIR, DIL_KURALI, RUMUZ_NOTU, yasakKalipMetni()].join("\n\n");
