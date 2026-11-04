// apps/hub/src/lib/prompts/yasakSozcuk.ts

/** DİL KURALI'nın "öğrenci/uzman" karşılığı olarak yasakladığı sözcükler; prompt'un kendisi de bunları
    kullanmamalı. Studio araç prompt'ları (`promptIddialari`) ve Atölye sistem prompt'u ortak kullanır.
    Biçim eval düzeneğindeki `dilKurali` ile aynı (`evals/lib/sharedChecks.ts`): küçük
    harfe indirilmiş metinde (tr-TR) çekimli biçimler dahil ("hastanın", "terapiste", "konuşma terapisti"),
    başka sözcükler dışarıda ("hastane", "hastalık", "hastalanmak", "hasta ol…", "terapistlik",
    "fizyoterapist"). Ek olarak tırnaklı anışlar ('"hasta" yerine', '"hasta/terapist" yok mu?') serbest;
    DİL KURALI bloğunun kendi anışı da bu yolla geçer. */
const YASAK_SOZCUKLER: ReadonlyArray<{ sozcuk: string; re: RegExp }> = [
  { sozcuk: "hasta", re: /(?<![\p{L}'"])hasta(?!ne|l[ıi][kğ]|lan|\s+ol)(?!['"])/u },
  { sozcuk: "terapist", re: /(?<![\p{L}'"])terapist(?!li[kğ])(?!['"])/u },
];

/** Yasak sözcük taraması (DİL KURALI'nın "öğrenci/uzman" karşılığı): `YASAK_SOZCUKLER` ile, tr-TR küçük harfte.
    Hata iletisi sözcüğü ve ±30 karakter bağlamı verir. Studio'da `promptIddialari` bunu çağırır; Atölye sistem
    prompt'u (`atolye-system.test.ts`) pencereden bağımsız olarak yalnız bunu kullanır. */
export function yasakSozcukDenetimi(system: string): void {
  const kucuk = system.toLocaleLowerCase("tr-TR");
  for (const { sozcuk, re } of YASAK_SOZCUKLER) {
    const m = re.exec(kucuk);
    if (!m) continue;
    const baglam = kucuk.slice(Math.max(0, m.index - 30), m.index + sozcuk.length + 30).replace(/\s+/g, " ").trim();
    throw new Error(`prompt '${sozcuk}' sözcüğünü kullanıyor: "…${baglam}…"`);
  }
}
