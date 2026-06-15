import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LudenLab — AI Destekli Öğrenme Kartı Üreticisi",
    short_name: "LudenLab",
    description:
      "Dil, konuşma ve işitme uzmanları için AI destekli öğrenme materyali üreticisi.",
    start_url: "/",
    display: "standalone",
    background_color: "#fff8ec",
    theme_color: "#fff8ec",
    lang: "tr",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
