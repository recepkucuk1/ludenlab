import React from "react";
import { ReelFrame } from "../../reels-lib/ReelFrame";
import type { ReelProps } from "../../reels-lib/voiceover";
import { r4Script } from "./script";
import { S1Zor, S2Durum, S3Cumleler, S4Pdf, S5Kendi, S6Kapanis } from "./scenes";

const SCENES: Record<string, React.FC> = {
  s1: S1Zor,
  s2: S2Durum,
  s3: S3Cumleler,
  s4: S4Pdf,
  s5: S5Kendi,
  s6: S6Kapanis,
};

export const R4SosyalHikaye: React.FC<ReelProps> = (props) => (
  <ReelFrame reel={r4Script} scenes={SCENES} {...props} />
);
