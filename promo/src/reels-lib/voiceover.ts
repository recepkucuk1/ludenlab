import { getAudioDurationInSeconds } from "@remotion/media-utils";
import { staticFile, type CalculateMetadataFunction } from "remotion";
import { REEL } from "./dims";
import { buildTimeline, voPath } from "./timeline";
import type { ReelScript, Timeline } from "./types";

export type ReelProps = { timeline: Timeline; safeArea: boolean };

export const EMPTY_REEL_PROPS: ReelProps = {
  timeline: { scenes: [], durationInFrames: 1 },
  safeArea: false,
};

export async function loadVoDurations(reel: ReelScript): Promise<(number | null)[]> {
  return Promise.all(
    reel.scenes.map(async (scene) => {
      try {
        return await getAudioDurationInSeconds(staticFile(voPath(reel.id, scene.id)));
      } catch {
        return null;
      }
    }),
  );
}

export const reelMetadata =
  (reel: ReelScript): CalculateMetadataFunction<ReelProps> =>
  async ({ props }) => {
    const timeline = buildTimeline(reel.id, reel.scenes, await loadVoDurations(reel), REEL.fps);
    return { durationInFrames: timeline.durationInFrames, props: { ...props, timeline } };
  };
