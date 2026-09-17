const BUCKET = "https://kgbhvruzoaqwwwkhzdex.supabase.co/storage/v1/object/public/tool-images";

/**
 * Reels 3 kelimeleri — Studio'nun global görsel önbelleğinden (GeneratedImage,
 * stil fluxv3, PII yok). `file` public/ altındaki yerel kopyadır
 * (npm run fetch:r3). "reçel" ve "rende" görselleri yazı artefaktı içerdiği için alınmadı.
 */
export const R3_WORDS = [
  { word: "robot", file: "real/r3/robot.png", sourceUrl: `${BUCKET}/robot_fluxv3_fal-ai_flux_schnell.png` },
  { word: "roket", file: "real/r3/roket.png", sourceUrl: `${BUCKET}/roket_fluxv3_fal-ai_flux_schnell.png` },
  { word: "radyo", file: "real/r3/radyo.png", sourceUrl: `${BUCKET}/gpt-radyo_fluxv3_fal-ai_flux_schnell.png` },
  { word: "rakam", file: "real/r3/rakam.png", sourceUrl: `${BUCKET}/gpt-rakam_fluxv3_fal-ai_flux_schnell.png` },
  { word: "rampa", file: "real/r3/rampa.png", sourceUrl: `${BUCKET}/gpt-rampa_fluxv3_fal-ai_flux_schnell.png` },
  { word: "rüzgâr", file: "real/r3/ruzgar.png", sourceUrl: `${BUCKET}/gpt-ruzgar_fluxv3_fal-ai_flux_schnell.png` },
] as const;
