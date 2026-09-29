import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SESLER_169 } from "../src/marka/olaylar.ts";
import { sesler916 } from "../src/marka/zamanEslemesi.ts";
import { BPM } from "../src/marka/zaman.ts";
import { ORNEKLEME, sesIzi, wavYaz } from "./lib/sfx.ts";

/**
 * Marka filmi efekt izleri: olay listesinden public/marka/sfx-169.wav (16:9, 60 sn) ve
 * sfx-916.wav (9:16, 30 sn: aynı olaylar zaman eşlemesinden geçer, atlanan/gizli öğelerin sesleri düşer).
 * Render komutları önce bunu çağırır.
 */
const PROMO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const izler = [
  { dosya: "public/marka/sfx-169.wav", olaylar: SESLER_169 },
  { dosya: "public/marka/sfx-916.wav", olaylar: sesler916(SESLER_169) },
];
for (const { dosya, olaylar } of izler) {
  const cikti = resolve(PROMO, dosya);
  mkdirSync(dirname(cikti), { recursive: true });
  const iz = sesIzi(olaylar, BPM);
  writeFileSync(cikti, wavYaz(iz));
  console.log(`${cikti} yazıldı (${olaylar.length} olay, ${BPM} BPM, ${(iz.length / ORNEKLEME).toFixed(1)} sn)`);
}
