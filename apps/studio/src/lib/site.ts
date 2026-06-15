/**
 * Kanonik public site URL — SEO metadata, sitemap, robots, manifest için.
 * NEXT_PUBLIC_APP_URL https:// ile başlamıyorsa (örn. localhost) prod
 * domain'ine düşer; sitemap/canonical'da localhost yayınlanmasını önler.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://")
    ? process.env.NEXT_PUBLIC_APP_URL
    : "https://ludenlab.com";
