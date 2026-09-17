import React from "react";
import { AbsoluteFill } from "remotion";
import { colors } from "../brand";
import { POST } from "./kit";

/** Instagram Hikâye: 1080×1920. Üstte profil/ilerleme çubuğu, altta yanıt alanı kapanır. */
export const STORY = { width: 1080, height: 1920 } as const;
export const STORY_SAFE_TOP = 250;
export const STORY_SAFE_BOTTOM = 340;

/**
 * 4:5 gönderiyi hikâyenin güvenli alanına (250–1580 px) sığdırır; zemin tüm
 * kareye uzar, böylece kapanan bantlarda yalnız boş zemin kalır.
 */
export const asStory = (Post: React.FC, dark = false): React.FC => {
  const StoryComp: React.FC = () => {
    const safeH = STORY.height - STORY_SAFE_TOP - STORY_SAFE_BOTTOM;
    const scale = Math.min(1, safeH / POST.height);
    const w = POST.width * scale;
    const h = POST.height * scale;
    return (
      <AbsoluteFill style={{ background: dark ? colors.darkTeal : colors.cream }}>
        <div
          style={{
            position: "absolute",
            left: (STORY.width - w) / 2,
            top: STORY_SAFE_TOP + (safeH - h) / 2,
            width: POST.width,
            height: POST.height,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <Post />
        </div>
      </AbsoluteFill>
    );
  };
  return StoryComp;
};
