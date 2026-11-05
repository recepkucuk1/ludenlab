"use client";
import Script from "next/script";
import { usePathname } from "next/navigation";

/* Umami (çerezsiz) — /veli/<token> yolunda YÜKLENMEZ: token'lı yol üçüncü tarafa gitmesin (spec 2026-11-05 §8). */
export function UmamiScript({ websiteId, scriptUrl }: { websiteId: string; scriptUrl: string }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/veli/")) return null;
  return <Script src={scriptUrl} data-website-id={websiteId} data-exclude-search="true" strategy="afterInteractive" />;
}
