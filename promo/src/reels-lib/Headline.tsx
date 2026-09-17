import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../brand";

/** Satır satır yaylanan büyük başlık; son satır turuncu vurgulu. */
export const Headline: React.FC<{ lines: string[]; top: number; fontSize: number; delay: number }> = ({
  lines,
  top,
  fontSize,
  delay,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ position: "absolute", left: 90, right: 90, top }}>
      {lines.map((line, i) => {
        const p = spring({ frame: frame - delay - i * 10, fps, config: { damping: 13 } });
        return (
          <div
            key={line}
            style={{
              fontFamily: fonts.display,
              fontWeight: 800,
              fontSize,
              lineHeight: 1.1,
              color: i === lines.length - 1 ? colors.orange : colors.ink,
              opacity: p,
              transform: `translateY(${(1 - p) * 60}px)`,
            }}
          >
            {line}
          </div>
        );
      })}
    </div>
  );
};
