import type { SceneScript, Timeline, TimelineScene } from "./types";

/** Ses bittikten sonra sahne geçişinden önce bırakılan nefes payı. */
export const AUDIO_PAD_SEC = 0.4;
/** Ses yokken altyazının sahnenin ne kadarında tamamlanacağı. */
const SILENT_CAPTION_RATIO = 0.8;

export const voPath = (reelId: string, sceneId: string) => `vo/${reelId}-${sceneId}.mp3`;

export function buildTimeline(
  reelId: string,
  scenes: SceneScript[],
  durationsSec: (number | null)[],
  fps: number,
): Timeline {
  let from = 0;
  const out: TimelineScene[] = scenes.map((scene, i) => {
    const audioSec = durationsSec[i] ?? null;
    const natural =
      audioSec === null ? Math.round(scene.defaultSec * fps) : Math.ceil((audioSec + AUDIO_PAD_SEC) * fps);
    const durationInFrames = Math.max(natural, Math.round((scene.minSec ?? 0) * fps));
    const captionFrames =
      audioSec === null ? Math.round(durationInFrames * SILENT_CAPTION_RATIO) : Math.ceil(audioSec * fps);
    const item: TimelineScene = {
      id: scene.id,
      from,
      durationInFrames,
      captionFrames,
      audioSrc: audioSec === null ? null : voPath(reelId, scene.id),
    };
    from += durationInFrames;
    return item;
  });
  return { scenes: out, durationInFrames: from };
}
