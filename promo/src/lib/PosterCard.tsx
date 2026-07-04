import React from "react";
import { colors } from "../brand";

export const PosterCard: React.FC<{
  rotate?: number;
  shadow?: number;
  bg?: string;
  radius?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({ rotate = 0, shadow = 8, bg = colors.white, radius = 24, style, children }) => (
  <div
    style={{
      background: bg,
      border: `3px solid ${colors.ink}`,
      borderRadius: radius,
      boxShadow: `${shadow}px ${shadow}px 0 ${colors.ink}`,
      transform: `rotate(${rotate}deg)`,
      ...style,
    }}
  >
    {children}
  </div>
);
