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
  return lastCreditedPeriodEnd.getTime() < creditClaimThreshold(centralPeriodEnd).getTime();
}

/**
 * Aynı dönemin dönem sonu DÜZELTMESİ yeni dönem sayılmaz — tolerans (gün).
 *
 * NEDEN (2026-09 denetimi): `/odeme/sonuc` iyzico'dan dönem sonunu okuyamazsa now+30g
 * TAHMİNİ yazar; ardından webhook/sweep GERÇEK tarihi getirir (31 günlük ay → +1 gün).
 * Çıpa katı `<` ile karşılaştırıldığında bu küçük düzeltme "dönem ilerledi" sayılıyor ve
 * ilk dönemde krediler İKİNCİ kez tam hakka dolduruluyordu. En kısa gerçek dönem 28 gündür;
 * 7 günlük tolerans düzeltmeyi yutar, gerçek yenilemeyi asla kaçırmaz.
 */
export const CREDIT_ANCHOR_TOLERANCE_DAYS = 7;

/**
 * Kredi claim eşiği: çıpa (`lastCreditedPeriodEnd`) bu tarihten ÖNCEYSE yeni dönemdir.
 * Modüllerin atomik SQL claim'i (`lastCreditedPeriodEnd < eşik`) ile `shouldGrantCredits`
 * AYNI eşiği kullanmalı — biri katı, biri toleranslı olursa karar ile yazım ayrışır.
 */
export function creditClaimThreshold(centralPeriodEnd: Date): Date {
  return new Date(centralPeriodEnd.getTime() - CREDIT_ANCHOR_TOLERANCE_DAYS * 24 * 60 * 60 * 1000);
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

/**
 * Bir DÖNEM için yüklenecek üretim hakkı.
 *
 * Plan tanımındaki `creditAmount` AYLIK haktır ("aylık 100 üretim hakkı"). Kredi yüklemesi
 * ise dönem başına bir kezdir (bkz. shouldGrantCredits) ve yıllık planda dönem 365 gündür —
 * yani yıllık abone, aylık vaat edilen hakkın 1/12'sini alıyordu (2026-09 denetimi, P1).
 *
 * `-1` (sınırsız) ve `0` (hak yok) ÇARPILMAZ. Bilinmeyen dönem aylık kabul edilir:
 * belirsizlikte fazla hak dağıtmak, eksik dağıtmaktan pahalıdır.
 */
export function periodCreditAmount(
  creditAmount: number,
  interval: string | null | undefined,
): number {
  if (creditAmount <= 0) return creditAmount;
  return (interval ?? "").trim().toUpperCase() === "YEARLY" ? creditAmount * 12 : creditAmount;
}

