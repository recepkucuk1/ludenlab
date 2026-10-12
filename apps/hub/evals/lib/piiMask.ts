// apps/hub/evals/lib/piiMask.ts

/* Ürün prompt'larının SABİT metninde ad-benzeri bir örnek bulunursa PII tuzak teli (`piiKesit`: önek + aksan
   katlama) onu aynı adlı fikstürde gerçek ad sanıp koşuyu durdurur; sızıntı değildir. Bilinen sabit parçalar
   taranmadan ÖNCE maskelenir. Yalnız düzenek metni (sistem prompt'u / kaydedilmiş istek) maskelenir: shim'de
   kullanıcı metni ASLA maskelenmez.

   Liste bugün BOŞ: tek girdi artikülasyon rotasının eski bağlam örneğiydi ("Selin sabah erkenden sahile
   gitti…"); Faz 2 / Task 11'de örnek adsız yazıldı ve girdi kaldırıldı. Düzenek (maskeleme + üç ağ) yerinde
   kalır; yeni bir sabit örnek gerekirse buraya girilir (öz-test parçanın kaynak dosyada geçtiğini doğrular). */

export interface PiiMaskSnippet {
  /** Kaynak dosyada birebir geçen parça. */
  snippet: string;
  /** apps/hub köküne göre kaynak dosya yolu. */
  source: string;
}

/** Ürün prompt'larının SABİT metnindeki ad-benzeri parçalar (bkz. başlık: bugün boş). */
export const PII_MASK_SNIPPETS: ReadonlyArray<PiiMaskSnippet> = [];

/** Maskeli metin: parçalar aynı uzunlukta `_` ile değiştirilir (konumlar kaymaz, kesit mantığı bozulmaz).
    `snippets` yalnız öz-testler için enjekte edilir; üretimde liste `PII_MASK_SNIPPETS`tir. */
export function maskStatic(text: string, snippets: ReadonlyArray<Pick<PiiMaskSnippet, "snippet">> = PII_MASK_SNIPPETS): string {
  let out = text;
  for (const { snippet } of snippets) out = out.split(snippet).join("_".repeat(snippet.length));
  return out;
}
