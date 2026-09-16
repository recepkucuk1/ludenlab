/**
 * Ücretsiz plan aylık yenilemesi + hakların DEVRETMEMESİ (2026-09-16 ürün kararı).
 *
 * ① AYLIK YENİLEME: ücretsiz kullanıcının merkezi aboneliği YOKTUR, bu yüzden dönem
 *    kredisini yükleyen reconcile dalı onlara hiç uğramıyordu — hak yalnız kayıtta bir kez
 *    veriliyordu. Yenileme çıpası olarak takvim ayı kullanılır ve hesap UTC'ye göre yapılır:
 *    Türkiye saatiyle birkaç saatlik kayma olur ama aylık bir yenilemede bu fark anlamsızdır
 *    ve TEK bir kesin sınır, saat dilimi hatalarından daha güvenlidir.
 *
 * ② DEVRETMEME: Koşullar "haklar sonraki döneme devretmez" diyordu, kod ise devrediyordu.
 *    Yükleme artık ARTIRMA değil ATAMA. Ama defter değişmezi (`bakiye = ΣEARN − ΣSPEND`)
 *    korunmalı: atama sırasında aradaki fark deftere yazılır, artan hak varsa bu fark
 *    HARCAMA olur. `creditSetDelta` bu kararı tek yerde verir ki iki modül ayrışmasın.
 */

/** İçinde bulunulan takvim ayının ilk anı (UTC). */
export function monthStartUTC(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/**
 * Ücretsiz plan hakkı bu ay yüklenmeli mi?
 *
 * İleri tarihli çıpa yükleme AÇMAZ: saat kayması ya da elle düzeltme yüzünden çıpa geleceğe
 * kaymışsa, "geçmiş değil" diye tekrar tekrar yüklemek bedava hak üretirdi.
 */
export function shouldRefillFreeCredits(
  lastRenewedAt: Date | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!lastRenewedAt) return true;
  return lastRenewedAt.getTime() < monthStartUTC(now).getTime();
}

export type CreditLedgerDelta =
  | { kind: "earn"; amount: number }
  | { kind: "spend"; amount: number }
  | { kind: "none"; amount: 0 };

/**
 * Bakiyeyi `target`'a ATARKEN deftere yazılacak hareket.
 * Artırma değil atama yaptığımız için fark negatif olabilir — o zaman kayıt HARCAMA'dır
 * ("devretmeyen hak"), aksi hâlde defter bakiyeden kopardı.
 */
export function creditSetDelta(current: number, target: number): CreditLedgerDelta {
  const diff = target - current;
  if (diff > 0) return { kind: "earn", amount: diff };
  if (diff < 0) return { kind: "spend", amount: -diff };
  return { kind: "none", amount: 0 };
}
