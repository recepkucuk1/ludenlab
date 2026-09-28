import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SESLER_169 } from "../src/marka/olaylar.ts";
import { BPM } from "../src/marka/zaman.ts";
import { ORNEKLEME, sesIzi, wavYaz } from "./lib/sfx.ts";

/** Marka filmi efekt izi: olay listesinden public/marka/sfx-169.wav (render komutları önce bunu çağırır). */
const PROMO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cikti = resolve(PROMO, "public/marka/sfx-169.wav");
mkdirSync(dirname(cikti), { recursive: true });
const iz = sesIzi(SESLER_169, BPM);
writeFileSync(cikti, wavYaz(iz));
console.log(`${cikti} yazıldı (${SESLER_169.length} olay, ${BPM} BPM, ${(iz.length / ORNEKLEME).toFixed(1)} sn)`);
