import React from "react";
import { AbsoluteFill } from "remotion";
import { izd, type Kamera, type V3 } from "./izometri.ts";
import { HEDEFLER, METIN } from "./metin.ts";
import { yigin } from "./nesneler.ts";
import { Blok, DerinlikSirali, KagitYigini, Tabla, Tanimlar } from "./sahne3b.tsx";
import { RENK, TUVAL_169 } from "./tema.ts";
import { Baslik, Etiket, Kunye, Zemin } from "./yazi.tsx";

// Storyboard F10 (0:45,6 · vuruş 77): tabla tam turu tamamladı; iki modül kenarda ince dosya, blok ortada tek başına.
const K: Kamera = { s: 100, ox: 1340, oy: 560, don: 0 };
const STUDIO = yigin({ cx: -1.6, cy: 1.5, adet: 3, tohum: 21, sapma: 0.02, sekme: RENK.studio });
const ATOLYE = yigin({ cx: 1.5, cy: -1.6, adet: 3, tohum: 23, sapma: 0.02, sekme: RENK.atolye });
const modulRengi = (m: "studio" | "atolye") => (m === "studio" ? RENK.studio : RENK.atolye);
// HEDEFLER sırasıyla: çapa (blokta dünya noktası), çipin hizalı kenarı (x, y) ve hiza.
const YERLESIM = [
  { capa: [-0.25, 0.5, 0.78], x: 1150, y: 330, hiza: "sag" },
  { capa: [0.5, -0.25, 0.78], x: 1520, y: 330, hiza: "sol" },
  { capa: [0.5, 0.2, 0.25], x: 1540, y: 740, hiza: "sol" },
] as const;

export const StilKaresi: React.FC = () => (
  <AbsoluteFill>
    <Zemin />
    <svg width={TUVAL_169.w} height={TUVAL_169.h} style={{ position: "absolute", inset: 0 }}>
      <Tanimlar />
      <Tabla k={K} />
      <DerinlikSirali
        k={K}
        ogeler={[
          { p: [STUDIO.cx, STUDIO.cy, 0], ciz: <KagitYigini y={STUDIO} k={K} /> },
          { p: [ATOLYE.cx, ATOLYE.cy, 0], ciz: <KagitYigini y={ATOLYE} k={K} /> },
          { p: [0, 0, 0], ciz: <Blok k={K} /> },
        ]}
      />
    </svg>
    {HEDEFLER.map((h, i) => {
      const y = YERLESIM[i];
      return <Etiket key={h.metin} capa={izd([...y.capa] as V3, K)} x={y.x} y={y.y} hiza={y.hiza} metin={h.metin} nokta={modulRengi(h.modul)} />;
    })}
    <Kunye />
    <Baslik satirlar={METIN.cocuk.ekran[0].split(" ")} top={360} />
  </AbsoluteFill>
);
