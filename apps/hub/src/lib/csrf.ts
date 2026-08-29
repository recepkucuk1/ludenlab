/**
 * Köken (Origin) doğrulaması — CSRF ikinci savunma hattı (2026-08 denetimi #28).
 *
 * SORUN: durum değiştiren uçların TEK savunması `SameSite=Lax` çerezdi. Lax, üst-düzey
 * gezinmeyle yapılan cross-site POST'ları engeller ama tek başına yeterli bir kontrol
 * değildir: eski/uyumsuz tarayıcılar, `SameSite` yorumu farklı istemciler ve gelecekte
 * eklenecek bir çerez ayarı hatası tüm yüzeyi açar. Kökeni sunucuda doğrulamak,
 * çerez bayrağından bağımsız ikinci bir kilittir.
 *
 * KURAL:
 *   · Güvenli metotlar (GET/HEAD/OPTIONS) kontrol edilmez.
 *   · `Sec-Fetch-Site` varsa ve `cross-site` DEĞİLSE → geç (same-origin/same-site/none).
 *   · Origin başlığı YOKSA ve Sec-Fetch-Site de yoksa → geç. Tarayıcılar cross-site
 *     POST'ta Origin'i BASTIRAMAZ; başlığın hiç olmaması "tarayıcı değil" demektir
 *     (sağlayıcı webhook'u, cron curl'ü — bunlar HMAC/Bearer ile kendi doğrulamasını yapar).
 *   · Origin varsa aynı siteye ait olmalı; değilse 403.
 *
 * `null` döner = istek geçerli.
 */
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** `a` ve `b` aynı sitenin host'ları mı (alt alan adları dahil)? */
function sameSiteHost(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  // Nokta ŞART: "xludenlab.com" → "ludenlab.com" eşleşmesin.
  return a.endsWith(`.${b}`) || b.endsWith(`.${a}`);
}

function hostOf(value: string | null | undefined): string {
  if (!value) return "";
  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return value.trim().toLowerCase(); // zaten çıplak host olabilir (Host başlığı)
  }
}

export interface OriginCheckInput {
  method: string;
  /** İsteğin kendi Host başlığı. */
  host: string | null;
  origin: string | null;
  secFetchSite: string | null;
  /** Yapılandırılmış uygulama adresi (NEXT_PUBLIC_APP_URL / AUTH_URL). */
  appUrl?: string | null;
}

export function isValidRequestOrigin(input: OriginCheckInput): boolean {
  if (SAFE_METHODS.has(input.method.toUpperCase())) return true;

  const site = input.secFetchSite?.trim().toLowerCase();
  if (site && site !== "cross-site") return true; // same-origin | same-site | none

  const origin = input.origin?.trim();
  // Tarayıcı sinyali YOK → tarayıcı isteği değil (webhook / cron / S2S).
  if (!origin && !site) return true;
  if (!origin) return false; // Sec-Fetch-Site: cross-site geldi, Origin yok → reddet

  const originHost = hostOf(origin);
  if (!originHost) return false;

  const allowed = [hostOf(input.host), hostOf(input.appUrl)].filter(Boolean);
  return allowed.some((h) => sameSiteHost(originHost, h));
}

/**
 * Köken kontrolünden MUAF yollar — tarayıcı dışı çağıranlar.
 * Bunlar kendi kimlik doğrulamalarını yapar; Origin göndermezler ama sağlayıcı davranışı
 * değişirse diye açıkça muaf tutuluyorlar (kırılan bir webhook = kayıp tahsilat).
 *
 * NOT: iyzico 3DS dönüşü `/odeme/sonuc` GERÇEK bir cross-site form POST'udur — o yol
 * middleware matcher'ının DIŞINDA bırakıldığı için burada listelenmesine gerek yok
 * (bkz. middleware.ts config.matcher). Kendisi zaten token'ı iyzico'ya S2S doğrulatır.
 */
const EXEMPT = [/^\/api\/iyzico\/webhook\/?$/, /^\/api\/iyzico\/cron\//];

export function isCsrfExemptPath(pathname: string): boolean {
  return EXEMPT.some((re) => re.test(pathname));
}
