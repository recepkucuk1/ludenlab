import React from "react";
import { AbsoluteFill } from "remotion";
import { SAFE_BOTTOM, SAFE_TOP } from "./dims";

const band: React.CSSProperties = { position: "absolute", left: 0, right: 0, background: "rgba(255,0,0,0.25)" };

/** Yalnız önizleme: Instagram arayüzünün kapattığı bantları gösterir. */
export const SafeArea: React.FC = () => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <div style={{ ...band, top: 0, height: SAFE_TOP }} />
    <div style={{ ...band, bottom: 0, height: SAFE_BOTTOM }} />
  </AbsoluteFill>
);
