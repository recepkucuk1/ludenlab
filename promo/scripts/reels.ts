import { r1Script } from "../src/reels/r1-lansman/script.ts";
import type { ReelScript } from "../src/reels-lib/types.ts";

export type ReelEntry = { script: ReelScript; compositionId: string };

/** Yeni reels eklendikçe buraya ve src/Root.tsx'e eklenir. */
export const REELS: ReelEntry[] = [{ script: r1Script, compositionId: "R1-Lansman" }];
