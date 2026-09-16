import { r1Script } from "../src/reels/r1-lansman/script.ts";
import { r2Script } from "../src/reels/r2-kartlar/script.ts";
import type { ReelScript } from "../src/reels-lib/types.ts";

export type ReelEntry = { script: ReelScript; compositionId: string };

/** Yeni reels eklendikçe buraya ve src/Root.tsx'e eklenir. */
export const REELS: ReelEntry[] = [
  { script: r1Script, compositionId: "R1-Lansman" },
  { script: r2Script, compositionId: "R2-Kartlar" },
];
