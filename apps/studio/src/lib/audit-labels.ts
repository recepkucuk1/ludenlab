/**
 * UI'lar için Türkçe action etiketleri. Kayıt sırasında her zaman makine
 * okunaklı kısa kod ("plan.update") yazılır; bu sözlük yalnızca okumada
 * kullanılır. Yeni action eklendiğinde buraya da eklensin — değilse UI ham kodu
 * gösterir, kötü değil ama bilgilendirici değil.
 *
 * NOT: Server-only `audit.ts`'tan ayrı dosyada — client component'lar buradan
 * import edebilsin diye (audit.ts prisma'yı içeriye aldığı için browser bundle'ı
 * bozar).
 */
export const AUDIT_ACTION_LABEL: Record<string, string> = {
  "plan.update":         "Plan değiştirildi",
  "credits.grant":       "Kredi eklendi",
  "credits.revoke":      "Kredi geri alındı",
  "user.suspend":        "Hesap askıya alındı",
  "user.unsuspend":      "Askı kaldırıldı",
  "role.change":           "Rol değiştirildi",
  "subscription.create":   "Abonelik oluşturuldu",
  "subscription.cancel":   "Abonelik iptal edildi",
  "subscription.override": "Abonelik manuel düzenlendi",
  "pdf.toggle":              "PDF desteği değiştirildi",
  "cron.subscription-cleanup": "Subscription cleanup cron çalıştı",
  "user.bulk-suspend":         "Toplu askıya alma",
  "user.bulk-unsuspend":       "Toplu askı kaldırma",
  "credits.bulk-grant":        "Toplu kredi grant'ı",
  "credits.bulk-revoke":       "Toplu kredi geri alımı",
  "user.impersonate-start":    "Kullanıcı olarak giriş yapıldı",
  "support.consent.grant":     "Destek erişimi izni verildi",
  "support.consent.revoke":    "Destek erişimi izni iptal edildi",
};
