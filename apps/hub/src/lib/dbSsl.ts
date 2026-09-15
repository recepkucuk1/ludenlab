import { rootCertificates, type ConnectionOptions } from "node:tls";

/**
 * Postgres (Supabase) TLS yapılandırması — TEK KAYNAK (2026-08 denetimi #19).
 *
 * SORUN: dört bağlantı noktası da `ssl: { rejectUnauthorized: false }` kullanıyordu.
 * Bağlantı ŞİFRELİ ama sunucunun KİMLİĞİ DOĞRULANMIYOR → sunucu↔DB yolunda araya giren
 * biri (MITM) tüm çocuk PII'sini ve kart referanslarını okuyabilir/değiştirebilirdi.
 *
 * ÖLÇÜM (2026-09-15, sunucudan): üç bağlantı da Supavisor pooler host'larında
 * (`aws-1-eu-west-1` / `aws-1-eu-central-1 .pooler.supabase.com`) ve hepsi aynı zinciri
 * sunuyor: leaf → "Supabase Intermediate 2021 CA" → "Supabase Root 2021 CA" (kendinden
 * imzalı; sistem CA deposunda YOK → kod 19). Kök CA'yı verince her ikisi de doğrulanıyor.
 *
 * KADEMELİ: `DB_SSL_CA` env'de TANIMLIYSA üç bağlantı da tam doğrulamayla açılır; tanımsızsa
 * mevcut davranış korunur (yanlış bir sıkılaştırma tüm siteyi düşürür — kapatmaya çalıştığımız
 * riskten büyük). Eksiklik açılışta GÖRÜNÜR biçimde uyarılır (bkz. lib/env.ts).
 *
 * BİÇİM: ham PEM (satır sonlarıyla) YA DA base64(PEM) — hPanel'in tek satırlık env alanına
 * ikincisi yapıştırılır. Verilen CA sistem köklerine EKLENİR (Node `ca` seçeneği güven
 * deposunu DEĞİŞTİRİR; public-CA'lı bir host eklenirse kopmasın).
 */

/** DB_SSL_CA'yı PEM'e çözer; tanımsız/boş/geçersizse undefined. */
export function loadDbCa(raw: string | undefined = process.env.DB_SSL_CA): string | undefined {
  const v = raw?.trim();
  if (!v) return undefined;
  if (v.includes("-----BEGIN")) return v;
  let decoded: string;
  try {
    decoded = Buffer.from(v, "base64").toString("utf8").trim();
  } catch {
    return undefined;
  }
  return decoded.includes("-----BEGIN") ? decoded : undefined;
}

export function pgSsl(url: string | undefined): ConnectionOptions | undefined {
  if (!url?.includes("supabase.com")) return undefined; // yerel/self-host → SSL yok

  const ca = loadDbCa();
  if (ca) return { ca: [...rootCertificates, ca], rejectUnauthorized: true };

  // CA yok → doğrulamasız TLS (şifreli ama kimlik doğrulanmamış). Bilinçli geçici durum.
  return { rejectUnauthorized: false };
}

/** Açılış uyarısı / durum raporu için: TLS zinciri gerçekten doğrulanıyor mu? */
export function dbSslVerified(): boolean {
  return Boolean(loadDbCa());
}

/** Değişken girilmiş ama çözümlenememiş (yanlış yapıştırma) — sessiz kalmasın. */
export function dbCaConfiguredButInvalid(): boolean {
  return Boolean(process.env.DB_SSL_CA?.trim()) && !loadDbCa();
}
