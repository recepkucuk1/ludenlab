/**
 * Sunucu loglarında kişisel veri maskeleme (2026-08 denetimi #37).
 *
 * Provision/reconcile hataları e-postayı DÜZ yazıyordu. Log satırları barındırıcıda,
 * hata izleyicide ve destek ekranlarında biriktiği için bu, kimlik verisinin
 * amaçlanandan çok daha geniş bir yüzeye kopyalanması demek. Maskelenmiş biçim
 * hata ayıklamaya yeter (aynı kullanıcı mı, hangi alan adı) ama kimliği vermez.
 */
export function maskEmail(email: string | null | undefined): string {
  const value = email?.trim();
  if (!value) return "<yok>";
  const at = value.lastIndexOf("@");
  if (at <= 0) return "<geçersiz>";
  const local = value.slice(0, at);
  const domain = value.slice(at + 1);
  const head = local.slice(0, 1);
  return `${head}${"*".repeat(Math.max(local.length - 1, 1))}@${domain}`;
}
