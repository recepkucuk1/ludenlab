import type { ConnectionOptions } from "node:tls";

/**
 * Postgres (Supabase) TLS yapılandırması — TEK KAYNAK (2026-08 denetimi #19).
 *
 * SORUN: dört bağlantı noktası da `ssl: { rejectUnauthorized: false }` kullanıyordu.
 * Bağlantı ŞİFRELİ ama sunucunun KİMLİĞİ DOĞRULANMIYOR → sunucu↔DB yolunda araya giren
 * biri (MITM) tüm çocuk PII'sini ve kart referanslarını okuyabilir/değiştirebilirdi.
 *
 * ÖLÇÜM (varsayım değil): üç bağlantı da `rejectUnauthorized: true` ile denendi —
 * hub ve studio DOĞRULANDI, atölye `SELF_SIGNED_CERT_IN_CHAIN` verdi (farklı Supabase
 * projesi/bölgesi, farklı sertifika zinciri). Yani "hepsini birden sıkılaştır" demek
 * atölye bağlantısını KOPARIRDI.
 *
 * BU YÜZDEN KADEMELİ: `DB_SSL_CA` (Supabase CA sertifikası, PEM) env'de TANIMLIYSA üç
 * bağlantı da tam doğrulamayla açılır. Tanımsızsa MEVCUT davranış korunur — çünkü burada
 * yanlış bir sıkılaştırma tüm siteyi düşürür ve bu, kapatmaya çalıştığımız riskten daha
 * büyük bir zarardır. Eksiklik açılışta GÖRÜNÜR biçimde uyarılır (bkz. lib/env.ts).
 *
 * KAPATMAK İÇİN: Supabase panelinden proje CA sertifikasını indirip Hostinger env'ine
 * `DB_SSL_CA` olarak (PEM, satır sonlarıyla) ekleyin — kod değişikliği gerekmez.
 */
export function pgSsl(url: string | undefined): ConnectionOptions | undefined {
  if (!url?.includes("supabase.com")) return undefined; // yerel/self-host → SSL yok

  const ca = process.env.DB_SSL_CA?.trim();
  if (ca) return { ca, rejectUnauthorized: true };

  // CA yok → doğrulamasız TLS (şifreli ama kimlik doğrulanmamış). Bilinçli geçici durum.
  return { rejectUnauthorized: false };
}

/** Açılış uyarısı / durum raporu için: TLS zinciri gerçekten doğrulanıyor mu? */
export function dbSslVerified(): boolean {
  return Boolean(process.env.DB_SSL_CA?.trim());
}
