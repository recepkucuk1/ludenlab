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
  transpilePackages: ["@ludenlab/ui", "@ludenlab/billing"],
  serverExternalPackages: ["iyzipay"], // iyzipay dinamik require kullanır → Turbopack bundle edemez
  // iyzipay lib/resources'u runtime'da fs.readdirSync ile okur; transitive dep olduğu için
  // standalone trace'ine tam girmiyor → iyzico kullanan route'lara FULL paketi dahil et.
  outputFileTracingIncludes: {
    "/api/odeme/init": ["../../node_modules/.pnpm/iyzipay@*/node_modules/iyzipay/**"],
    "/odeme/sonuc": ["../../node_modules/.pnpm/iyzipay@*/node_modules/iyzipay/**"],
    "/api/iyzico/webhook": ["../../node_modules/.pnpm/iyzipay@*/node_modules/iyzipay/**"],
  },
};

export default nextConfig;
