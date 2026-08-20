/**
 * Kredi/abonelik yardımcıları — modül-bağımsız (saf) kısım. Prisma'ya dokunmaz;
 * modüller (studio/atolye) kendi client + modelleriyle çağırır.
 */

/**
 * Bir abonelik dönemi için kredi yüklenmeli mi?
 *
 * SÖZLEŞME: DÖNEM-tabanlı, `now`-tabanlı DEĞİL. Yalnız merkezi dönem sonu
 * (`centralPeriodEnd`), kredilenmiş dönemden (`lastCreditedPeriodEnd`) İLERİ gittiyse
 * yeni dönem kredisi yüklenir. Reconcile çıpayı `centralPeriodEnd`'e yazdığı için aynı
 * dönem bir daha kazanamaz → yükleme dönem başına TAM BİR KEZ.
 *
 * NEDEN (P0 regresyonu — 2026-08 güvenlik denetimi #01): eski sürüm
 * `now >= lastCreditedPeriodEnd - 1g` diyordu. Çıpa `periodEnd`'e yazıldığı için, dönem
 * sonuna 24 saatten az kala koşul HER render'da yeniden true oluyor ve tam plan kredisi
 * tekrar tekrar yükleniyordu (sınırsız bedava üretim hakkı). Karşılaştırmayı zamana değil
 * dönemin kendisine bağlamak döngüyü kökten kapatır; `credits.test.ts` bunu kilitler.
 *
 * FAIL-CLOSED: `centralPeriodEnd` yoksa (null/undefined) yükleme YAPILMAZ. Çağıran taraf
 * eksik dönem sonu için `now + 30g` gibi HAREKETLİ bir değer türetirse çıpa her render'da
 * ileri kayar ve döngü yeniden doğardı; o yüzden dönem bilinmiyorsa kredi verilmez.
 *
 * @param lastCreditedPeriodEnd Kredisi yüklenmiş son dönemin sonu (çıpa); hiç yüklenmediyse null.
 * @param centralPeriodEnd      Merkezi aboneliğin GERÇEK dönem sonu (türetilmiş/fallback değil).
 * @param _now                  Kullanılmıyor — karar zamandan bağımsızdır; imza uyumu ve
 *                              test okunabilirliği için kabul edilir.
 */
export function shouldGrantCredits(
  lastCreditedPeriodEnd: Date | null | undefined,
  centralPeriodEnd: Date | null | undefined,
  _now: Date = new Date(),
): boolean {
  if (!centralPeriodEnd) return false; // dönem bilinmiyor → fail-closed
  if (!lastCreditedPeriodEnd) return true; // hiç yüklenmemiş → ilk dönem
  return lastCreditedPeriodEnd.getTime() < centralPeriodEnd.getTime();
}

/**
 * Modülün ücretli planı FREE'ye düşürülmeli mi? (Aktif merkezi abonelik YOKKEN çağrılır.)
 *
 * NEDEN (2026-08-20 canlı olay): Modül `planType`'ını FREE'ye çeken TEK yol
 * `subscription-cleanup` cron'uydu ve prod'da hiç çalışmamıştı (audit'te 0 heartbeat).
 * `reconcileCentralEntitlement` ise aktif merkezi abonelik bulamayınca hiçbir şey yapmadan
 * dönüyordu — yani iptal + dönem bitiminden BİR AY sonra bile ADVANCED/PRO erişim sürüyordu.
 * Bu kural, düzeltmeyi cron'a bağımlı olmaktan çıkarıp her sayfa render'ında kendi kendine
 * iyileşir hâle getirir (cron sessizce ölse bile entitlement doğru kalır).
 *
 * KRİTİK GÜVENLİK ÖZELLİĞİ — manuel grant koruması: düşürme yalnız GERÇEKTEN sona ermiş
 * (iptal edilmiş + dönemi geçmiş) bir abonelik varsa yapılır. "Aktif abonelik yoksa düşür"
 * gibi naif bir kural, admin'in elle PRO verdiği (hiç merkezi aboneliği olmayan) beta/test
 * hesaplarını anında keserdi — canlı veride ücretli 8 studio hesabının 6'sı tam olarak budur.
 *
 * @param planType               Modüldeki mevcut plan (FREE ise zaten yapılacak iş yok).
 * @param endedSubscriptionCount İptal edilmiş VE dönemi geçmiş modül abonelik sayısı.
 */
export function shouldRevokeModulePlan(planType: string, endedSubscriptionCount: number): boolean {
  if (planType === "FREE") return false; // düşürülecek ücretli plan yok
  return endedSubscriptionCount > 0; // yalnız sona ermiş gerçek abonelik → düşür
}
