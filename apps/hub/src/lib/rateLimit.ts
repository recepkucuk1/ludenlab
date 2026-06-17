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

/** İstemci IP'sini header'lardan çıkarır (proxy arkası). */
export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    "unknown"
  );
}
