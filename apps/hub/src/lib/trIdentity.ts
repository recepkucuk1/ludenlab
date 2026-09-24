/**
 * Türk kimlik/vergi numarası ve cep telefonu doğrulaması (2026-09 denetimi #24).
 *
 * Eskiden yalnız hane sayısına bakılıyordu: yazım hatalı bir TCKN/VKN faturaya ve iyzico'ya
 * gidiyor, e-Arşiv/e-Fatura reddi ancak muhasebe aşamasında fark ediliyordu. Algoritmalar
 * GİB'in yayımladığı kontrol hanesi kurallarıdır; doğrulama sunucuda yapılır.
 */

/** TCKN: 11 hane, ilk hane 0 değil, 10. ve 11. hane kontrol haneleri. */
export function isValidTckn(value: string): boolean {
  if (!/^[1-9]\d{10}$/.test(value)) return false;
  const d = [...value].map(Number);
  const odd = d[0]! + d[2]! + d[4]! + d[6]! + d[8]!;
  const even = d[1]! + d[3]! + d[5]! + d[7]!;
  if ((((odd * 7 - even) % 10) + 10) % 10 !== d[9]) return false;
  return d.slice(0, 10).reduce((a, b) => a + b, 0) % 10 === d[10];
}

/** VKN: 10 hane, son hane GİB kontrol hanesi. */
export function isValidVkn(value: string): boolean {
  if (!/^\d{10}$/.test(value)) return false;
  const d = [...value].map(Number);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    const tmp = (d[i]! + (9 - i)) % 10;
    let v = (tmp * 2 ** (9 - i)) % 9;
    if (tmp !== 0 && v === 0) v = 9;
    sum += v;
  }
  return (10 - (sum % 10)) % 10 === d[9];
}

/**
 * Türkiye cep telefonunu iyzico'nun beklediği `+905XXXXXXXXX` biçimine çevirir;
 * geçersizse `null`. Boşluk, tire, parantez ve 0/90/+90 önekleri kabul edilir.
 */
export function normalizeTrMobile(value: string): string | null {
  const digits = value.replace(/[\s\-().]/g, "").replace(/^\+/, "");
  const local = digits.replace(/^(90|0)/, "");
  return /^5\d{9}$/.test(local) ? `+90${local}` : null;
}
