import React from "react";
import { ReelFrame } from "../../reels-lib/ReelFrame";
import type { ReelProps } from "../../reels-lib/voiceover";
import { r1Script } from "./script";
import { S1Hook, S2Yalniz, S3Studio, S4Atolye, S5Kapanis } from "./scenes";

const SCENES: Record<string, React.FC> = {
  s1: S1Hook,
  s2: S2Yalniz,
  s3: S3Studio,
  s4: S4Atolye,
  s5: S5Kapanis,
};

export const R1Lansman: React.FC<ReelProps> = (props) => <ReelFrame reel={r1Script} scenes={SCENES} {...props} />;
