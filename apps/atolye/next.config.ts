import type { NextConfig } from "next";
import path from "node:path";

/**
 * Atölye = sunucu-app (API route'lar Claude'u server-side çağırır) →
 * Hostinger hPanel Node.js app olarak `output: standalone`.
 * - `outputFileTracingRoot` monorepo köküne işaret eder; yoksa pnpm symlink'li
 *   workspace bağımlılıkları standalone bundle'a izlenemez (Hostinger'da ENOENT).
 * - Edge middleware KULLANILMAZ (Hostinger build'ini patlatır) — auth, route
 *   handler'larda yapılır. Bkz. ROADMAP.md "Hosting".
 */
const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(import.meta.dirname, "../.."),
  transpilePackages: ["@ludenlab/ui", "@ludenlab/ai"],
};

export default nextConfig;
