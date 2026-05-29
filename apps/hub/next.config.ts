import type { NextConfig } from "next";

/**
 * Hub = statik vitrin → Hostinger'a FTP ile `public_html`.
 * `output: export` + trailingSlash → Apache rewrite gerektirmez.
 * (LudenMain'in çalışan reçetesi; bkz. ROADMAP.md "Hosting".)
 */
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  transpilePackages: ["@ludenlab/ui"],
};

export default nextConfig;
