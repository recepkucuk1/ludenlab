/**
 * E-posta kanonikleştirme — KÖTÜYE KULLANIM SAYAÇLARI İÇİN (2026-08 denetimi #15).
 *
 * SORUN: uçlar e-postayı yalnız `toLowerCase().trim()` ile normalize ediyordu. Oysa
 * `ali@gmail.com`, `ali+1@gmail.com` ve `a.l.i@gmail.com` AYNI posta kutusuna düşer:
 *   · `+etiket` ile sınırsız FREE hesap açılabiliyor → sınırsız bedava üretim hakkı
 *   · e-posta başına hız limiti `+1`, `+2`… varyantlarıyla anlamsızlaşıyor
 *
 * ⚠️ KULLANIM SINIRI — bu değer KİMLİK DEĞİLDİR:
 *   · Hesap tekilliği/giriş için KULLANILMAZ (orada gerçek adres esastır).
 *   · Yalnız rate-limit anahtarı olarak kullanılır. Kayıt ENGELLENMEZ (ürün kararı):
 *     `ali+ludenlab@gmail.com` gibi etiketi meşru kullananlar mağdur olmasın.
 *
 * TASARIM DENGESİ: fazla birleştirmek (iki farklı kişiyi aynı sayaca bağlamak) küçük bir
 * rahatsızlık; az birleştirmek ise istismarı açık bırakır. Bu yüzden `+etiket` GENEL olarak
 * ayıklanır (yaygın bir yakınsama), ama NOKTA yok sayma YALNIZ Gmail'e uygulanır — başka
 * sağlayıcılarda nokta anlamlıdır ve `a.li@` ile `ali@` gerçekten farklı kişiler olabilir.
 */

/** Gmail ve eşdeğer alan adları — nokta yok sayma yalnız burada geçerli. */
const GMAIL_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

export function canonicalEmail(email: string): string {
  const trimmed = (email ?? "").trim().toLowerCase();
  if (!trimmed) return "";

  // Tam olarak bir "@" yoksa ayrıştırma güvenli değil → dokunma.
  const parts = trimmed.split("@");
  if (parts.length !== 2) return trimmed;

  const [rawLocal, domain] = parts as [string, string];
  if (!rawLocal || !domain) return trimmed;

  // `+etiket` ayıkla.
  let local = rawLocal.split("+")[0] ?? "";

  // Gmail: noktalar anlamsızdır.
  const isGmail = GMAIL_DOMAINS.has(domain);
  if (isGmail) local = local.replace(/\./g, "");

  // Ayıklama sonrası yerel kısım boşaldıysa (ör. "+etiket@…") kanonikleştirme
  // yapmıyoruz — boş yerel kısım tüm bu tür adresleri tek sayaca çökertirdi.
  if (!local) return trimmed;

  return `${local}@${isGmail ? "gmail.com" : domain}`;
}
