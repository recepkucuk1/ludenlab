import React from "react";
import { AbsoluteFill } from "remotion";
import { colors, fonts } from "../brand";
import { HideDeco, Logo, type Product } from "./kit";
import { STORY, STORY_SAFE_BOTTOM, STORY_SAFE_TOP } from "./story";

/** 4:5 kompozisyondan bir yatay bandı kesip hikâyede istenen yere/ölçeğe koyar. */
const Band: React.FC<{ Post: React.FC; y0: number; y1: number; top: number; scale: number }> = ({ Post, y0, y1, top, scale }) => {
  const w = 1080 * scale;
  return (
    <div style={{ position: "absolute", left: (STORY.width - w) / 2, top, width: w, height: (y1 - y0) * scale, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: -y0 * scale, width: 1080, height: 1350, transform: `scale(${scale})`, transformOrigin: "top left" }}>
        <HideDeco.Provider value>
          <Post />
        </HideDeco.Provider>
      </div>
    </div>
  );
};

export type FullStoryOpts = {
  product?: Product;
  dark?: boolean;
  /** 4:5 kompozisyondaki metin bandı (başlık + açıklama). */
  text: [number, number];
  /** 4:5 kompozisyondaki maket bandı. */
  mock: [number, number];
  textScale?: number;
  mockScale?: number;
  /** Maket bandının hikâyedeki üst kenarı; verilmezse metnin altına 20 px boşlukla. */
  mockTop?: number;
};

const LOGO_TOP = STORY_SAFE_TOP + 6;
const TEXT_TOP = STORY_SAFE_TOP + 140;

/**
 * Hikâyeyi tam kullanan yerleşim: logo + adres güvenli alanın başında, metin ve
 * büyütülmüş maket altında. Kapanan bantlar (üst 250 / alt 340 px) boş zemin kalır.
 */
export const asFullStory = (Post: React.FC, o: FullStoryOpts): React.FC => {
  const C: React.FC = () => {
    const ts = o.textScale ?? 1.06;
    const ms = o.mockScale ?? 1.04;
    const textH = (o.text[1] - o.text[0]) * ts;
    const mockTop = o.mockTop ?? TEXT_TOP + textH + 20;
    return (
      <AbsoluteFill style={{ background: o.dark ? colors.darkTeal : colors.cream, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: LOGO_TOP, left: 64, right: 76, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Logo product={o.product} dark={o.dark} height={116} />
          <span
            style={{
              fontFamily: fonts.body,
              fontWeight: 700,
              fontSize: 30,
              color: o.dark ? colors.ink : colors.white,
              background: o.dark ? colors.logoCream : colors.ink,
              borderRadius: 999,
              padding: "10px 24px",
            }}
          >
            ludenlab.com
          </span>
        </div>
        <Band Post={Post} y0={o.text[0]} y1={o.text[1]} top={TEXT_TOP} scale={ts} />
        {o.mock[1] > o.mock[0] ? <Band Post={Post} y0={o.mock[0]} y1={o.mock[1]} top={mockTop} scale={ms} /> : null}
      </AbsoluteFill>
    );
  };
  return C;
};

/** Kapanış gibi tek bloklu gönderiler: bütün kompozisyon güvenli alana büyütülür. */
export const SAFE_H = STORY.height - STORY_SAFE_TOP - STORY_SAFE_BOTTOM;
