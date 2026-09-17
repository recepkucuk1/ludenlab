import { r1Script } from "../src/reels/r1-lansman/script.ts";
import { r2Script } from "../src/reels/r2-kartlar/script.ts";
import { r3Script } from "../src/reels/r3-artikulasyon/script.ts";
import { r4Script } from "../src/reels/r4-sosyal-hikaye/script.ts";
import { r5Script } from "../src/reels/r5-meb-atolye/script.ts";
import type { ReelScript } from "../src/reels-lib/types.ts";

export type ReelEntry = { script: ReelScript; compositionId: string };

/** Yeni reels eklendikçe buraya ve src/Root.tsx'e eklenir. */
export const REELS: ReelEntry[] = [
  { script: r1Script, compositionId: "R1-Lansman" },
  { script: r2Script, compositionId: "R2-Kartlar" },
  { script: r3Script, compositionId: "R3-Artikulasyon" },
  { script: r4Script, compositionId: "R4-SosyalHikaye" },
  { script: r5Script, compositionId: "R5-MebAtolye" },
];
