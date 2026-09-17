import React from "react";
import { ReelFrame } from "../../reels-lib/ReelFrame";
import type { ReelProps } from "../../reels-lib/voiceover";
import { r2Script } from "./script";
import { S1Aksam, S2Uret, S3Pdf, S4Esenlik, S5Kapanis } from "./scenes";

const SCENES: Record<string, React.FC> = {
  s1: S1Aksam,
  s2: S2Uret,
  s3: S3Pdf,
  s4: S4Esenlik,
  s5: S5Kapanis,
};

export const R2Kartlar: React.FC<ReelProps> = (props) => <ReelFrame reel={r2Script} scenes={SCENES} {...props} />;
