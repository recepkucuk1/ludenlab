import { NextResponse } from "next/server";

/**
 * Merkezi (apex) in-memory rate-limit — public/auth uçları için (register, resend vb.).
 * Tek-instance (Hostinger) varsayımıyla in-memory yeterli; ölçeklenirse Redis'e taşı.
 * (Modüllerin kendi `@studio/lib/rateLimit` kopyaları var — ileride buraya birleştirilebilir.)
 */
const RATE_LIMIT_MESSAGE = "Çok fazla istek gönderdiniz. Lütfen bir dakika bekleyin.";

type Entry = { count: number; resetAt: number };
const store = new Map<string, Entry>();
let lastCleanup = Date.now();

function maybeCleanup() {
  const now = Date.now();
  if (now - lastCleanup < 5 * 60 * 1000) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) store.delete(key);
  }
}

/** windowMs (varsayılan 60s) içinde `limit` istek; aşılırsa allowed=false + retryAfter (sn). */
export function rateLimit(
  key: string,
  limit: number,
  windowMs = 60_000,
): { allowed: boolean; retryAfter: number } {
  maybeCleanup();
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }
  if (entry.count >= limit) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count++;
  return { allowed: true, retryAfter: 0 };
}

export function rateLimitResponse(retryAfter: number) {
  return NextResponse.json(
    { error: RATE_LIMIT_MESSAGE },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}

/**
 * İstemci IP'sini header'lardan çıkarır (tek güvenilen proxy arkası — Hostinger/LiteSpeed).
 *
 * NEDEN SONDAKİ ELEMAN (2026-08 denetimi #14): eskiden `x-forwarded-for`'un İLK elemanı
 * alınıyordu. XFF'i istemci de gönderebilir; proxy kendi gördüğü gerçek IP'yi listenin
 * SONUNA ekler. Dolayısıyla ilk eleman TAMAMEN istemci kontrolündedir:
 *
 *     İstemci: `X-Forwarded-For: 1.2.3.4`  →  proxy: `1.2.3.4, <gerçek-ip>`
 *     eski kod → "1.2.3.4" (sahte)  ⇒ her istekte farklı IP uydurup TÜM per-IP
 *     rate-limit'leri (register / forgot-password / resend-verification) atlatmak mümkündü.
 *
 * Sondaki elemanı almak, tam olarak bir güvenilen proxy varsayımı altında doğrudur.
 * Zincire ikinci bir proxy (ör. CDN) eklenirse bu sayı güncellenmeli (TRUSTED_HOPS).
 */
const TRUSTED_HOPS = 1;

export function getClientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const hops = xff
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    // Sondan TRUSTED_HOPS'uncu eleman = güvenilen proxy'nin yazdığı gerçek istemci IP'si.
    const ip = hops[hops.length - TRUSTED_HOPS];
    if (ip) return ip;
  }
  // Proxy tarafından set edilen tek-değerli başlık (LiteSpeed) — XFF yoksa yedek.
  return headers.get("x-real-ip")?.trim() || "unknown";
}
