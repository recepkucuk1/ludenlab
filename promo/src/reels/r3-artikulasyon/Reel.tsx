import React from "react";
import { ReelFrame } from "../../reels-lib/ReelFrame";
import type { ReelProps } from "../../reels-lib/voiceover";
import { r3Script } from "./script";
import { S1Arama, S2Ses, S3Kartlar, S4Kagit, S5Esenlik, S6Kapanis } from "./scenes";

const SCENES: Record<string, React.FC> = {
  s1: S1Arama,
  s2: S2Ses,
  s3: S3Kartlar,
  s4: S4Kagit,
  s5: S5Esenlik,
  s6: S6Kapanis,
};

export const R3Artikulasyon: React.FC<ReelProps> = (props) => (
  <ReelFrame reel={r3Script} scenes={SCENES} {...props} />
);
