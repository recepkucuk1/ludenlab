// apps/hub/evals/lib/piiMask.ts

/* Ürün prompt'larının SABİT metninde ad-benzeri örnekler var (ör. artikülasyon rotasının SYSTEM_PROMPT'undaki
   "Selin sabah erkenden sahile gitti…"). PII tuzak teli (`piiKesit`: önek + aksan katlama) bunları "Selin" adlı
   fikstürde gerçek ad sanıp koşuyu durdururdu; sızıntı değildir. Bilinen sabit parçalar taranmadan ÖNCE maskelenir.
   Yalnız düzenek metni (sistem prompt'u / kaydedilmiş istek) maskelenir: shim'de kullanıcı metni ASLA maskelenmez. */

/** Ürün prompt'larının SABİT metnindeki ad-benzeri parçalar: kaynak dosyada (apps/hub köküne göre) birebir
    geçmeli (selftest doğrular; prompt değişince parça bayatlar ve test düşer). */
export const PII_MASK_SNIPPETS: ReadonlyArray<{ snippet: string; source: string }> = [
  { snippet: "Selin sabah erkenden sahile gitti", source: "src/app/studio/api/tools/articulation/route.ts" },
  { snippet: "Selin sevinçle sandala bindi", source: "src/app/studio/api/tools/articulation/route.ts" },
];

/** Maskeli metin: parçalar aynı uzunlukta `_` ile değiştirilir (konumlar kaymaz, kesit mantığı bozulmaz). */
export function maskStatic(text: string): string {
  let out = text;
  for (const { snippet } of PII_MASK_SNIPPETS) out = out.split(snippet).join("_".repeat(snippet.length));
  return out;
}
