import React from "react";
import { ReelFrame } from "../../reels-lib/ReelFrame";
import type { ReelProps } from "../../reels-lib/voiceover";
import { r5Script } from "./script";
import { S1Plan, S2Meb, S3Taslak, S4Cocuk, S5Kapanis } from "./scenes";

const SCENES: Record<string, React.FC> = {
  s1: S1Plan,
  s2: S2Meb,
  s3: S3Taslak,
  s4: S4Cocuk,
  s5: S5Kapanis,
};

export const R5MebAtolye: React.FC<ReelProps> = (props) => <ReelFrame reel={r5Script} scenes={SCENES} {...props} />;
