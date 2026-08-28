import type { NextConfig } from "next";
import path from "node:path";

/**
 * Hub = ludenlab.com landing (3 servise yönlendirir). Hostinger "Node.js Web App"
 * (git deploy) → `output: standalone` + monorepo `outputFileTracingRoot`.
 * (Atölye'nin kanıtlanmış reçetesi; bkz. reference-hostinger-nextjs-deploy.)
 */
const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(import.meta.dirname, "../.."),
  images: { unoptimized: true },
  transpilePackages: ["@ludenlab/ui", "@ludenlab/billing", "@ludenlab/ai"],
  // iyzipay: dinamik require (fs.readdirSync lib/resources) + transitive postman-request →
  // Next tracer kaçırır. External tut; standalone'a FLAT kopyayı scripts/postbuild.mjs yapar
  // (iyzipay kapanışı; atolye'nin kanıtlanmış reçetesi).
  serverExternalPackages: ["iyzipay"],

  /**
   * Güvenlik başlıkları (2026-08 denetimi #13 — canlıda HİÇBİRİ yoktu).
   *
   * `poweredByHeader: false` ile birlikte: sürüm/teknoloji sızıntısını kes, taşımayı
   * HSTS ile kilitle, MIME-sniffing'i kapat, token taşıyan URL'lerin (verify-email?token=,
   * sifre-sifirla?token=) referer ile sızmasını engelle, kullanılmayan güçlü API'leri kapat.
   *
   * ÇERÇEVELEME (X-Frame-Options): clickjacking'e karşı DENY — ANCAK `/odeme/*` HARİÇ.
   * Sebep: iyzico 3DS akışı callback'i (`/odeme/sonuc`) tarayıcıdan POST eder ve bazı
   * kurulumlarda bunu KENDİ çerçevesi içinde yapar; oraya DENY koymak ödeme akışını
   * kırabilirdi. Clickjacking'in gerçek hedefleri (admin, /hesap, modül panelleri) korunuyor.
   * NOT: sunucu zaten `content-security-policy: upgrade-insecure-requests` gönderiyor;
   * ikinci bir CSP başlığı eklemiyoruz (iki CSP birlikte uygulanır → sürpriz kısıt riski).
   * Tam CSP (script-src allow-list) ayrı bir iş: iyzico + hCaptcha + font host'ları
   * envanterlenip önce Report-Only ile ölçülmeli.
   */
  poweredByHeader: false,
  async headers() {
    const baseline = [
      // HSTS: alt alan adları yok (studio./atolye. çözülmüyor), www HTTPS → includeSubDomains güvenli.
      { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      // Kod tabanında getUserMedia/MediaRecorder/geolocation kullanımı YOK (doğrulandı).
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ];
    return [
      { source: "/:path*", headers: baseline },
      // Çerçeveleme yasağı — ödeme yolu dışındaki her şeye.
      { source: "/((?!odeme).*)", headers: [{ key: "X-Frame-Options", value: "DENY" }] },
    ];
  },
};

export default nextConfig;
