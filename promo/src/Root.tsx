import React from "react";
import { AbsoluteFill, Composition } from "remotion";
import "./fonts";
import { colors, fonts } from "./brand";

const BrandTest: React.FC = () => (
  <AbsoluteFill style={{ background: colors.cream, justifyContent: "center", alignItems: "center", gap: 30 }}>
    <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 90, color: colors.ink }}>
      Bricolage — ışğüçöâ
    </div>
    <div style={{ fontFamily: fonts.body, fontWeight: 500, fontSize: 60, color: colors.orange }}>
      Satoshi — ışğüçöâ
    </div>
  </AbsoluteFill>
);

export const Root: React.FC = () => (
  <>
    <Composition id="BrandTest" component={BrandTest} durationInFrames={30} fps={30} width={1080} height={1920} />
  </>
);
