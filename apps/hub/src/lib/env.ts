import { loadDbCa } from "@/lib/dbSsl";

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
  // Webhook imza doğrulaması merchant ID'yi kullanır: boşsa HER bildirim 401 alır ve bunu
  // hiçbir şey söylemiyordu (2026-09 denetimi #26).
  "IYZICO_MERCHANT_ID",
] as const;

/**
 * Ödeme yolunun ÇALIŞMASI için zorunlu olanlar. Prod + ENV_STRICT'te eksikleri ölümcüldür:
 * eksik anahtarla checkout 502, eksik CRON_SECRET'la sweep (iptal iletimi) 401 döner —
 * "çalışıyor görünüp para yolunun sessizce durması" başlatmamaktan pahalıdır.
 */
const PAYMENT_CRITICAL = ["IYZICO_API_KEY", "IYZICO_SECRET_KEY", "IYZICO_MERCHANT_ID", "CRON_SECRET"] as const;

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

    for (const key of PAYMENT_CRITICAL) {
      if (strict && !env[key]?.trim()) fatal.push(`${key} tanımsız — ödeme yolu çalışmaz (ENV_STRICT).`);
    }
  }

  // Anahtar ↔ ortam uyumsuzluğu: iyzico sandbox anahtarları "sandbox-" önekiyle başlar.
  // Sandbox anahtarıyla prod URL'i (ya da tersi) her isteği 401 yapar ve checkout sessizce
  // ölür — kurulumda bir kez yaşandı (BILLING_CUTOVER §10: "sandbox" sanılan anahtarlar PROD'du).
  const apiKey = env.IYZICO_API_KEY?.trim();
  if (apiKey && iyzicoBase) {
    const keyIsSandbox = apiKey.startsWith("sandbox-");
    const urlIsSandbox = /sandbox/i.test(iyzicoBase);
    if (keyIsSandbox !== urlIsSandbox) {
      const msg = `iyzico anahtarı ile IYZICO_BASE_URL uyumsuz (anahtar: ${keyIsSandbox ? "sandbox" : "prod"}, URL: ${urlIsSandbox ? "sandbox" : "prod"}) — tüm iyzico istekleri reddedilir.`;
      (isProd && strict ? fatal : warnings).push(msg);
    }
  }

  // Silme kütüğü anahtarı (2026-09 denetimi #27): yoksa AUTH_SECRET kullanılır; o
  // döndürülürse (sızıntı sonrası yapılması gereken) eski silme kayıtları sorgulanamaz.
  if (isProd && !env.DELETION_LEDGER_SECRET?.trim()) {
    warnings.push(
      "DELETION_LEDGER_SECRET tanımsız — silme kütüğü AUTH_SECRET ile anahtarlanıyor; AUTH_SECRET döndürülürse eski kayıtlar sorgulanamaz.",
    );
  }

  // Gözlemlenebilirlik (denetim #38): DSN yoksa prod hataları yalnız barındırıcı log
  // dosyasında kalır. Ölümcül değil — ama sessizce eksik kalmasın.
  if (isProd && !env.SENTRY_DSN?.trim()) {
    warnings.push("SENTRY_DSN tanımsız — prod hataları hiçbir yere raporlanmıyor (denetim #38).");
  }

  // DB TLS (denetim #19): ham PEM ya da base64(PEM). Yanlış yapıştırma sessizce
  // "CA yok" gibi davranır — o yüzden ayrı, açık bir uyarı.
  const caRaw = env.DB_SSL_CA?.trim();
  if (caRaw && !loadDbCa(caRaw)) {
    warnings.push(
      "DB_SSL_CA tanımlı ama çözümlenemedi — ham PEM ya da base64(PEM) bekleniyor; " +
        "doğrulamasız TLS'e düşüldü (denetim #19).",
    );
  } else if (!caRaw) {
    warnings.push(
      "DB_SSL_CA tanımsız — DB bağlantısı şifreli ama sunucu KİMLİĞİ doğrulanmıyor (denetim #19). " +
        "Supabase Root 2021 CA'sını PEM ya da base64(PEM) olarak bu değişkene ekleyin.",
    );
  }

  // hCaptcha (denetim #15): çift birlikte açılır. Yalnız biri varsa ya widget çizilmez
  // (secret var → her kayıt reddedilir) ya da token boşa gider — ikisi de sessiz kırılma.
  const hcSite = env.NEXT_PUBLIC_HCAPTCHA_SITEKEY?.trim();
  const hcSecret = env.HCAPTCHA_SECRET?.trim();
  if (Boolean(hcSite) !== Boolean(hcSecret)) {
    warnings.push(
      "hCaptcha yarım yapılandırılmış — NEXT_PUBLIC_HCAPTCHA_SITEKEY ve HCAPTCHA_SECRET birlikte verilmeli " +
        (hcSecret ? "(secret var, site key yok → HER kayıt reddedilir)." : "(site key var, secret yok → doğrulama yapılmıyor)."),
    );
  } else if (isProd && !hcSecret) {
    warnings.push("hCaptcha kapalı (HCAPTCHA_SECRET yok) — kayıt ucu yalnız hız sınırlarıyla korunuyor (denetim #15).");
  }

  // ÖDEME → PLAN KÖPRÜSÜ (2026-09 denetimi): bu bayrak "true" DEĞİLSE modül reconcile'ı
  // sessizce hiçbir şey yapmaz — kullanıcı öder, merkezi abonelik yazılır, ama modüldeki
  // planı ve kredisi HİÇ açılmaz ve hiçbir yerde hata görünmez.
  // ÖLÜMCÜL YAPILMADI (bilinçli): bu değişkenin prod panelindeki durumu buradan
  // doğrulanamıyor; yanlış varsayımla ölümcül kontrol eklemek bir sonraki deploy'da siteyi
  // düşürürdü — kapatmaya çalıştığımız riskten büyük zarar (bkz. IYZICO_BASE_URL gerekçesi).
  if (isProd && env.NEXT_PUBLIC_CENTRAL_BILLING !== "true") {
    warnings.push(
      "NEXT_PUBLIC_CENTRAL_BILLING 'true' değil — ödeme başarılı olsa bile modül planı ve kredisi AÇILMAZ.",
    );
  }
  if (isProd && env.NEXT_PUBLIC_CENTRAL_BILLING === "true" && !env.CENTRAL_BILLING_DATABASE_URL?.trim()) {
    warnings.push(
      "CENTRAL_BILLING_DATABASE_URL tanımsız — Atölye merkezi aboneliği okuyamaz; ödeme sonrası plan/kredi açılmaz.",
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
