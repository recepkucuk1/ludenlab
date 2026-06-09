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
  // iyzipay: dinamik require (fs.readdirSync lib/resources) + transitive postman-request →
  // Next tracer kaçırır. External tut; standalone'a FLAT kopyayı scripts/postbuild.mjs yapar
  // (iyzipay kapanışı; atolye'nin kanıtlanmış reçetesi).
  serverExternalPackages: ["iyzipay"],
};

export default nextConfig;
