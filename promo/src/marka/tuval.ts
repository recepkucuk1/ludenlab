import { createContext, useContext } from "react";
import { useVideoConfig } from "remotion";

/**
 * Sahnenin çizildiği tuvalin boyutu (px). 16:9 filmde kompozisyonun kendisidir (sağlayıcı yok). 9:16 kesimde sahne
 * bölgesi 1920 × 1080'lik bir 16:9 tuvalinde çizilip küçültülür: tam tuval SVG'ler ve sağa hizalı çipler bu boyutu okur.
 */
export const Tuval = createContext<{ width: number; height: number } | null>(null);

export const useTuval = () => {
  const v = useVideoConfig();
  return useContext(Tuval) ?? { width: v.width, height: v.height };
};
