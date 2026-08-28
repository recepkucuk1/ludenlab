/**
 * Giriş sonrası yönlendirme için güvenli `callbackUrl` çözümü.
 *
 * NEDEN (2026-08 denetimi #16): eski kontrol `raw.startsWith("/") && !raw.startsWith("//")`
 * idi ve TERS EĞİK ÇİZGİYİ kaçırıyordu. WHATWG URL ayrıştırıcısı özel şemalarda `\` ile `/`
 * karakterini EŞDEĞER sayar:
 *
 *     new URL("/\\evil.com/x", "https://ludenlab.com").href  →  "https://evil.com/x"
 *
 * Yani `ludenlab.com/giris?callbackUrl=/%5Cevil.com` linki filtreyi geçiyor, kullanıcı
 * GERÇEK sitede giriş yapıyor ve ardından evil.com'a hard-navigate ediliyordu — "resmi
 * domain'de başlayan" çok ikna edici bir phishing zinciri.
 *
 * Savunma katmanlı:
 *   1. Tarayıcının URL ayrıştırırken YOK SAYDIĞI kontrol karakterlerini (\t \n \r) temizle
 *      — "/\tevil.com" gibi kaçamaklar bu temizlikten sonra yakalanır.
 *   2. Tek "/" ile başlamalı; ikinci karakter "/" veya "\" olamaz (`//host`, `/\host`).
 *   3. Herhangi bir yerde ters eğik çizgi varsa reddet (meşru yolda bulunmaz).
 *   4. Auth sayfalarına geri dönme (giriş→giriş döngüsü/404).
 *   5. SON KAPI: origin'e göre çöz; origin değiştiyse reddet. Kural 1-4 aşılsa bile burada durur.
 */
const AUTH_PATHS = /^\/(giris|kayit|sifremi-unuttum|sifre-sifirla|verify-email)([/?#]|$)/;
const FALLBACK = "/hesap";

export function safeCallbackUrl(raw: string | null | undefined, origin?: string): string {
  if (!raw) return FALLBACK;

  const candidate = raw.replace(/[\t\n\r]/g, "");
  if (!/^\/($|[^/\\])/.test(candidate)) return FALLBACK;
  if (candidate.includes("\\")) return FALLBACK;
  // Yüzde-kodlu ters eğik çizgi: bugünkü WHATWG ayrıştırıcısında authority'den ÖNCE
  // çözülmediği için aynı-origin'de kalır (zararsız), ama tarayıcı tarihinde bunu çözen
  // sürümler oldu. Meşru bir yolda bulunmaz → derinlemesine savunma olarak reddet.
  if (/%5c/i.test(candidate)) return FALLBACK;
  if (AUTH_PATHS.test(candidate)) return FALLBACK;

  const base =
    origin ?? (typeof window !== "undefined" ? window.location.origin : "https://ludenlab.com");
  try {
    const target = new URL(candidate, base);
    if (target.origin !== new URL(base).origin) return FALLBACK;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return FALLBACK;
  }
}
