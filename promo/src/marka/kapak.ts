import { kare } from "./zaman.ts";

/** Kapak görselinin filmdeki karesi (`npm run marka:render -- kapak`). Çocuk sahnesi bitince en iyi kareye taşınır. */
export const KAPAK_KARE = kare(84);
/** 9:16 kapağı (Instagram, 1080 × 1920): 9:16 v42 = 16:9 v80; üç hedef etiketi varmış, "VAKTİN ÇOCUĞA KALSIN." açık. */
export const KAPAK_916_KARE = kare(42);
