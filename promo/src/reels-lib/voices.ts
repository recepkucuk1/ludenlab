import type { ReelScript, SceneScript, Voice } from "./types";

/** Sahnenin sesi: sahneye özel ses varsa o, yoksa reels'in varsayılanı. */
export const voiceFor = (reel: ReelScript, scene: SceneScript): Voice => scene.voice ?? reel.voice;
