import React from "react";
import { AbsoluteFill, Html5Audio, staticFile, useCurrentFrame } from "remotion";
import { FilmSahnesi } from "./FilmSahnesi.tsx";
import { filmDurumu } from "./filmDurumu.ts";

/** 16:9 marka filmi (60 sn). Efekt: public/marka/sfx-169.wav (`npm run marka:sfx`). Müzik ve seslendirme Plan 3D'de. */
export const MarkaFilmi169: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <FilmSahnesi durum={filmDurumu(f)} />
      <Html5Audio src={staticFile("marka/sfx-169.wav")} volume={0.9} />
    </AbsoluteFill>
  );
};
