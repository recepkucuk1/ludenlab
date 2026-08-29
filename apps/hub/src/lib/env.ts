import { dbSslVerified } from "@/lib/dbSsl";

/**
 * Açılışta ortam değişkeni denetimi (2026-08 denetimi #25).
 *
 * SORUN: merkezi doğrulama yoktu ve birkaç yerde SESSİZ, TEHLİKELİ varsayılanlar vardı:
 *   · `IYZICO_BASE_URL` boşsa → sessizce SANDBOX'a düşer. Prod'da bu, TEST KARTIYLA
 *     gerçek abonelik açılabilmesi demektir — en tehlikelisi bu.
 *   · `AUTH_URL` boşsa → parola sıfırlama / e-posta doğrulama linkleri localhost'a çıkar
 *     (kullanıcı hesabını kurtaramaz).
 *   · `DB_SSL_CA` yoksa → DB bağlantısı şifreli ama sunucu kimliği doğrulanmamış (#19).
 *
 * TASARIM — VARSAYILAN OLARAK ÖLDÜRMEZ, bilinçli:
 *   Sandbox kontrolünü doğrudan ölümcül yapmak CAZİP ama TEHLİKELİ: prod ortamının şu an
 *   hangi iyzico URL'ine baktığını buradan göremiyoruz (canlı `Payment` tablosu boş — yani
 *   henüz gerçek tahsilat yapılmamış, prod hâlâ sandbox'ta olabilir). Yanlış varsayımla
 *   ölümcül kontrol göndermek bir sonraki deploy'da SİTEYİ DÜŞÜRÜRDÜ — kapatmaya
 *   çalıştığımız riskten büyük bir zarar.
 *
 *   Bu yüzden varsayılan davranış GÖRÜNÜR UYARI; `ENV_STRICT=true` verildiğinde aynı
 *   bulgular ÖLÜMCÜL olur. Ödeme env'i doğrulandıktan sonra tek değişkenle
 *   "sessizce yanlış çalışmaktansa hiç çalışma" moduna geçilir.
 *   AÇMA SIRASI: (1) IYZICO_BASE_URL'i prod'a çek, (2) doğrula, (3) ENV_STRICT=true.
 */

const REQUIRED_WARN = [
  "HUB_DATABASE_URL",
  "STUDIO_DATABASE_URL",
  "ATOLYE_DATABASE_URL",
  "AUTH_SECRET",
  "AUTH_URL",
  "NEXT_PUBLIC_APP_URL",
  "ANTHROPIC_API_KEY",
  "CRON_SECRET",
  "IYZICO_API_KEY",
  "IYZICO_SECRET_KEY",
] as const;

export interface EnvReport {
  fatal: string[];
  warnings: string[];
}

export function checkEnv(env: NodeJS.ProcessEnv = process.env): EnvReport {
  const isProd = env.NODE_ENV === "production";
  const fatal: string[] = [];
  const warnings: string[] = [];

  for (const key of REQUIRED_WARN) {
    if (!env[key]?.trim()) warnings.push(`${key} tanımsız`);
  }

  // Ödeme modu — prod'da sandbox = test kartıyla gerçek abonelik açılabilmesi.
  const strict = env.ENV_STRICT === "true";
  const iyzicoBase = env.IYZICO_BASE_URL?.trim();
  if (isProd) {
    const problem = !iyzicoBase
      ? "IYZICO_BASE_URL tanımsız — kod SANDBOX'a düşer; prod'da test kartıyla abonelik açılabilir."
      : /sandbox/i.test(iyzicoBase)
        ? `IYZICO_BASE_URL SANDBOX'a işaret ediyor (${iyzicoBase}) — prod'da olmamalı.`
        : null;
    if (problem) (strict ? fatal : warnings).push(problem);
  }

  if (!dbSslVerified()) {
    warnings.push(
      "DB_SSL_CA tanımsız — DB bağlantısı şifreli ama sunucu KİMLİĞİ doğrulanmıyor (denetim #19). " +
        "Supabase CA sertifikasını PEM olarak bu değişkene ekleyin.",
    );
  }

  return { fatal, warnings };
}

/** Açılışta çağrılır: uyarıları yazar, ölümcül sorunda süreci başlatmaz. */
export function assertEnv(): void {
  const { fatal, warnings } = checkEnv();

  for (const w of warnings) console.warn(`[env] UYARI: ${w}`);

  if (fatal.length > 0) {
    for (const f of fatal) console.error(`[env] ÖLÜMCÜL: ${f}`);
    throw new Error(
      `Ortam yapılandırması geçersiz (${fatal.length} ölümcül sorun) — bkz. yukarıdaki [env] satırları.`,
    );
  }
}
