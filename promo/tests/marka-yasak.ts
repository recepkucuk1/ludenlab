// Marka filmi metin denetimlerinin ortak kalıpları (marka-metin ve marka-seslendirme testleri).

// Türkçe büyük harf sorunu: JS'in varsayılan /i bayrağı İ→i, I→ı'yı tr yerel ayarı dışında katlamaz.
// Karşılaştırmadan önce küçült (tr yerel ayarı) + kalan ı'yı i'ye indir + boşlukları sadeleştir.
export const kat = (s: string) => s.normalize("NFC").toLocaleLowerCase("tr").replace(/ı/g, "i").replace(/\s+/g, " ");

// Spec "İçerik kuralları": hız iddiası, ücretsiz/fiyat/üretim hakkı, yanlış kitle, genel MEB iddiası, eski terimler, yanlış yazım.
export const YASAK = [/saniye/, /dakika/, /(?<!\p{L})aninda/u, /ücretsiz/, /bedava/, /fiyat|₺|üretim hakki/, /özel eğitim öğretmen/, /meb['’]?(e)? (uyumlu|uygun|onayli)|meb müfredat/, /kredi|jeton|token/, /stüdyo/, /(?<!\/)atolye/];

/** Seslendirme satırı TTS yazımıyla mı: "Luden Lab", alan adı yalnız "ludenlab nokta com", harf.harf yok. */
export const ttsYazimiHatalari = (metin: string): string[] => {
  const k = kat(metin);
  const hatalar: string[] = [];
  if (/ludenlab(?! nokta)/.test(k)) hatalar.push(`"ludenlab" nokta com yazımı dışında geçiyor`);
  if (/\w\.\w/.test(k)) hatalar.push("harf.harf (nokta ile birleşik) yazım");
  return hatalar;
};
