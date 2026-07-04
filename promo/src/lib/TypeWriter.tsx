import React from "react";
import { useCurrentFrame } from "remotion";
import { colors, fonts } from "../brand";

export const TypeWriter: React.FC<{
  text: string;
  start: number;
  framesPerChar?: number;
  fontSize?: number;
}> = ({ text, start, framesPerChar = 3, fontSize = 52 }) => {
  const frame = useCurrentFrame();
  const chars = Math.max(0, Math.floor((frame - start) / framesPerChar));
  const shown = text.slice(0, chars);
  const caretOn = Math.floor(frame / 12) % 2 === 0;
  return (
    <span style={{ fontFamily: fonts.body, fontWeight: 500, fontSize, color: colors.ink }}>
      {shown}
      <span style={{ color: colors.orange, opacity: caretOn ? 1 : 0 }}>|</span>
    </span>
  );
};
