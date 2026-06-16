"use client";

import { useEffect } from "react";

/**
 * Strips `.dark` from <html> while mounted and prevents next-themes (or any
 * other code) from re-adding it on this route. Restores on unmount.
 *
 * Used on landing + auth routes where poster design is always light.
 */
export function ForceLightTheme() {
  useEffect(() => {
    const html = document.documentElement;
    const hadDark = html.classList.contains("dark");

    const strip = () => {
      if (html.classList.contains("dark")) {
        html.classList.remove("dark");
      }
    };

    strip();

    const observer = new MutationObserver(strip);
    observer.observe(html, { attributes: true, attributeFilter: ["class"] });

    return () => {
      observer.disconnect();
      if (hadDark) html.classList.add("dark");
    };
  }, []);

  return null;
}
