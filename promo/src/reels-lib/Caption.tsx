import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { colors, fonts } from "../brand";
import { splitWords, visibleWordCount } from "./captionTiming";
import { SAFE_BOTTOM } from "./dims";

export const Caption: React.FC<{ text: string; captionFrames: number }> = ({ text, captionFrames }) => {
  const frame = useCurrentFrame();
  const words = splitWords(text);
  const shown = visibleWordCount(words.length, frame, captionFrames);
  const done = frame >= captionFrames;
  const appear = interpolate(frame, [0, 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        left: 70,
        right: 70,
        bottom: SAFE_BOTTOM + 20,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: colors.white,
          border: `3px solid ${colors.ink}`,
          borderRadius: 20,
          boxShadow: `6px 6px 0 ${colors.ink}`,
          padding: "22px 34px",
          maxWidth: 900,
          textAlign: "center",
          fontFamily: fonts.body,
          fontWeight: 700,
          fontSize: 46,
          lineHeight: 1.3,
          color: colors.ink,
          opacity: appear,
        }}
      >
        {words.map((w, i) => (
          <span
            key={i}
            style={{
              opacity: i < shown ? 1 : 0.18,
              color: !done && i === shown - 1 ? colors.orange : colors.ink,
            }}
          >
            {w}
            {i < words.length - 1 ? " " : ""}
          </span>
        ))}
      </div>
    </div>
  );
};
