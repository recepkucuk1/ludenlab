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
  transpilePackages: ["@ludenlab/ui"],
};

export default nextConfig;
