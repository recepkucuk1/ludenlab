import React from "react";
import { AbsoluteFill, Html5Audio, staticFile, useCurrentFrame } from "remotion";
import { AcilisSahnesi } from "./AcilisSahnesi.tsx";
import { acilisDurumu } from "./acilisDurumu.ts";

/** Açılış (Kanca, v1–8 + 6 kare), onay kapısı 2. Efekt: public/marka/sfx-169.wav (`npm run marka:sfx`). */
export const MarkaAcilis169: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <AcilisSahnesi durum={acilisDurumu(f)} />
      <Html5Audio src={staticFile("marka/sfx-169.wav")} volume={0.9} />
    </AbsoluteFill>
  );
};
