import React from "react";
import { AbsoluteFill, Html5Audio, Sequence, staticFile } from "remotion";
import { colors } from "../brand";
import { Caption } from "./Caption";
import { SafeArea } from "./SafeArea";
import type { ReelScript } from "./types";
import type { ReelProps } from "./voiceover";

/**
 * Sahne bileşenleri kendi karelerine göre animasyon yapar ve ~2 sn içinde
 * oturmalıdır: sahne süresi seslendirmeye göre kısalabilir.
 */
export const ReelFrame: React.FC<ReelProps & { reel: ReelScript; scenes: Record<string, React.FC> }> = ({
  reel,
  scenes,
  timeline,
  safeArea,
}) => (
  <AbsoluteFill style={{ background: colors.cream }}>
    {timeline.scenes.map((t) => {
      const script = reel.scenes.find((s) => s.id === t.id);
      const Scene = scenes[t.id];
      if (!script || !Scene) throw new Error(`${reel.id}: '${t.id}' sahnesi tanımsız`);
      return (
        <Sequence key={t.id} name={t.id} from={t.from} durationInFrames={t.durationInFrames}>
          <Scene />
          {t.audioSrc ? <Html5Audio src={staticFile(t.audioSrc)} /> : null}
          {script.hideCaption ? null : <Caption text={script.caption ?? script.vo} captionFrames={t.captionFrames} />}
        </Sequence>
      );
    })}
    {safeArea ? <SafeArea /> : null}
  </AbsoluteFill>
);
