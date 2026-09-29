import React from "react";
import { AbsoluteFill } from "remotion";
import { izd } from "./izometri.ts";
import { HEDEFLER, METIN } from "./metin.ts";
import { yigin } from "./nesneler.ts";
import { Blok, DerinlikSirali, KagitYigini, Tabla, Tanimlar } from "./sahne3b.tsx";
import { RENK, TUVAL_169 } from "./tema.ts";
import { COCUK_YIGIN_YERI, GENEL_KAMERA, HEDEF_YERLESIMI } from "./yerlesim.ts";
import { Baslik, Etiket, Kunye, Zemin } from "./yazi.tsx";

// Storyboard F10 (0:45,6 · vuruş 77): tabla tam turu tamamladı; iki modül kenarda ince dosya, blok ortada tek başına.
const K = GENEL_KAMERA;
const STUDIO = yigin({ cx: COCUK_YIGIN_YERI.studio[0], cy: COCUK_YIGIN_YERI.studio[1], adet: 3, tohum: 21, sapma: 0.02, sekme: RENK.studio });
const ATOLYE = yigin({ cx: COCUK_YIGIN_YERI.atolye[0], cy: COCUK_YIGIN_YERI.atolye[1], adet: 3, tohum: 23, sapma: 0.02, sekme: RENK.atolye });
const modulRengi = (m: "studio" | "atolye") => (m === "studio" ? RENK.studio : RENK.atolye);

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
      const y = HEDEF_YERLESIMI[i];
      return <Etiket key={h.metin} capa={izd(y.capa, K)} x={y.x} y={y.y} hiza={y.hiza} metin={h.metin} nokta={modulRengi(h.modul)} />;
    })}
    <Kunye />
    <Baslik satirlar={METIN.cocuk.baslik} top={360} />
  </AbsoluteFill>
);
