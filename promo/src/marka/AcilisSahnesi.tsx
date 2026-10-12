import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { DUSUS_YUKSEKLIGI, type AcilisDurumu } from "./acilisDurumu.ts";
import { izd, type V3 } from "./izometri.ts";
import { HEDEFLER, METIN } from "./metin.ts";
import { BLOK_MERKEZ, Blok, HavaGolgesi, NoktaliCizgi, Tabla, Tanimlar, Yuva } from "./sahne3b.tsx";
import { GENEL_KAMERA, HEDEF_YERLESIMI } from "./yerlesim.ts";
import { Baslik, Etiket, UstCumle, Zemin } from "./yazi.tsx";

// Kanca (v1–8, storyboard F1–F2). Sahne, açılış durumunun saf fonksiyonu; animasyon ve föy aynı bileşeni çizer.
// Metin sütunu kameradan bağımsız; tabla, blok ve etiketler kamerayla birlikte bloğa doğru iter.
const K = GENEL_KAMERA;
const ODAK = izd(BLOK_MERKEZ, K);

export const AcilisSahnesi: React.FC<{ durum: AcilisDurumu }> = ({ durum }) => {
  const { width, height } = useVideoConfig();
  const havada = durum.blokZ > 0.02;
  const blokM: V3 = [BLOK_MERKEZ[0], BLOK_MERKEZ[1], BLOK_MERKEZ[2] + durum.blokZ];
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Zemin isik={durum.isik} kayma={durum.kayma} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `translateY(${durum.sarsinti}px) scale(${durum.kamera})`,
          transformOrigin: `${ODAK[0]}px ${ODAK[1]}px`,
        }}
      >
        <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
          <Tanimlar />
          <Tabla k={K} />
          <Yuva k={K} opaklik={durum.yuva} />
          {havada ? (
            <>
              <HavaGolgesi k={K} yakinlik={1 - durum.blokZ / DUSUS_YUKSEKLIGI} />
              <NoktaliCizgi a={izd([0, 0, 0.001], K)} b={izd([0, 0, durum.blokZ], K)} opaklik={0.45} />
            </>
          ) : null}
          <Blok k={K} m={blokM} aci={durum.blokAci} yuz={durum.yuz} />
        </svg>
        {HEDEFLER.map((h, i) => {
          const y = HEDEF_YERLESIMI[i];
          return (
            <Etiket
              key={h.metin}
              capa={izd(y.capa, K)}
              x={y.x}
              y={y.y}
              hiza={y.hiza}
              metin={h.metin}
              gorunum={durum.etiketCip[i]}
              ilerleme={durum.etiketCizgi[i]}
            />
          );
        })}
      </div>
      <UstCumle metin={METIN.kanca.ekran[0]} top={400} acilis={durum.ust} />
      <Baslik satirlar={METIN.kanca.baslik} top={480} acilis={durum.satirlar} />
    </AbsoluteFill>
  );
};
