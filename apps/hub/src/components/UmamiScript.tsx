"use client";
import { createElement } from "react";
import Script, { type ScriptProps } from "next/script";
import { usePathname } from "next/navigation";

/* Umami (çerezsiz) — /veli/<token> yolunda YÜKLENMEZ: token'lı yol üçüncü tarafa gitmesin (spec 2026-11-05 §8).
   JSX yerine createElement: birim test düzeneği (node, yalnız *.test.ts) JSX derlemez; bu bekçi test edilebilsin. */
export function UmamiScript({ websiteId, scriptUrl }: { websiteId: string; scriptUrl: string }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/veli/")) return null;
  // data-* öznitelikleri ScriptProps tipinde yok (JSX'te serbest, createElement'ta değil): tipli nesne üzerinden geçirilir.
  const props: ScriptProps & Record<`data-${string}`, string> = { src: scriptUrl, strategy: "afterInteractive", "data-website-id": websiteId, "data-exclude-search": "true" };
  return createElement(Script, props);
}
