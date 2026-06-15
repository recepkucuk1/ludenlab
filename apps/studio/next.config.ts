import type { NextConfig } from "next";
import path from "node:path";
import { withSentryConfig } from "@sentry/nextjs";

/**
 * Studio = sunucu-app (Hostinger Node.js Web App) — monorepo'ya taşındı.
 * - `output: standalone` + `outputFileTracingRoot` (monorepo kökü): pnpm symlink'li
 *   workspace bağımlılıkları standalone bundle'a izlensin (yoksa Hostinger ENOENT).
 * - iyzipay `serverExternalPackages` + `scripts/postbuild.mjs` FLAT kopya (atolye reçetesi)
 *   — terapimat'taki elle `outputFileTracingIncludes` listesi yerine (monorepo node_modules
 *   yapısı farklı). Bkz. reference-hostinger-nextjs-deploy.
 * - Edge middleware YOK (Hostinger build'ini patlatır) → auth route handler/server-component'te
 *   (`src/proxy.ts` = devre dışı bırakılmış middleware; Next onu tanımaz).
 */
const nextConfig: NextConfig = {
  turbopack: {},
  output: "standalone",
  outputFileTracingRoot: path.join(import.meta.dirname, "../.."),
  transpilePackages: ["@ludenlab/billing"],
  serverExternalPackages: ["iyzipay"],
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            // unsafe-eval: @react-pdf/renderer WASM gerektiriyor
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.hcaptcha.com *.iyzipay.com *.iyzico.com",
            "style-src 'self' 'unsafe-inline' *.iyzipay.com *.iyzico.com",
            "img-src 'self' data: blob: *.iyzipay.com *.iyzico.com",
            "font-src 'self' *.iyzipay.com *.iyzico.com",
            "frame-src 'self' https://newassets.hcaptcha.com *.iyzipay.com *.iyzico.com",
            "connect-src 'self' https://hcaptcha.com https://sentry.hcaptcha.com https://vitals.vercel-insights.com https://va.vercel-scripts.com *.iyzipay.com *.iyzico.com https://*.ingest.de.sentry.io https://*.ingest.sentry.io",
            "worker-src 'self' blob:",
          ].join("; "),
        },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
      ],
    },
  ],
};

// Sentry build-time entegrasyonu — minimal (source map upload yok → SENTRY_AUTH_TOKEN gerekmez).
export default withSentryConfig(nextConfig, {
  silent: !process.env.CI,
  disableLogger: true,
});
