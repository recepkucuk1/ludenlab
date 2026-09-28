import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { DUSUS_YUKSEKLIGI } from "./acilisDurumu.ts";
import type { FilmDurumu } from "./filmDurumu.ts";
import { izd, type V3 } from "./izometri.ts";
import { BLOK_MERKEZ, Blok, DerinlikSirali, HavaGolgesi, KagitListesi, NoktaliCizgi, Tabla, Tanimlar, Yuva } from "./sahne3b.tsx";
import { Cikis, Cip, Etiket, Kunye, MetinBlogu, Zemin } from "./yazi.tsx";

// Filmin tek sahnesi: durum → kare. Zemin sabit; tabla, kâğıtlar, blok ve etiketler kameranın itmesiyle birlikte
// odak (blok) etrafında ölçeklenir; metin sütunu, çipler ve künye kameradan bağımsız.
export const FilmSahnesi: React.FC<{ durum: FilmDurumu }> = ({ durum }) => {
  const { width, height } = useVideoConfig();
  const k = durum.kamera;
  const havada = durum.blok.z > 0.02;
  const blokM: V3 = [BLOK_MERKEZ[0], BLOK_MERKEZ[1], BLOK_MERKEZ[2] + durum.blok.z];
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Zemin isik={durum.isik} kayma={durum.kayma} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `translateY(${durum.sarsinti}px) scale(${durum.itme})`,
          transformOrigin: `${durum.odak[0]}px ${durum.odak[1]}px`,
        }}
      >
        <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
          <Tanimlar />
          <Tabla k={k} />
          <Yuva k={k} opaklik={durum.yuva} />
          {havada ? (
            <>
              <HavaGolgesi k={k} yakinlik={1 - durum.blok.z / DUSUS_YUKSEKLIGI} />
              <NoktaliCizgi a={izd([0, 0, 0.001], k)} b={izd([0, 0, durum.blok.z], k)} opaklik={0.45} />
            </>
          ) : null}
          <DerinlikSirali
            k={k}
            ogeler={[
              ...durum.kagitlar.map((g) => ({ p: g.p, ciz: <KagitListesi kagitlar={g.kagitlar} k={k} /> })),
              { p: [0, 0, 0] as V3, ciz: <Blok k={k} m={blokM} aci={durum.blok.aci} yuz={durum.blok.yuz} /> },
            ]}
          />
        </svg>
        {durum.etiketler.map((e) => (
          <Cikis key={e.id} c={e.cikis} koken="center">
            <Etiket capa={izd(e.capa, k)} x={e.x} y={e.y} hiza={e.hiza} metin={e.metin} nokta={e.nokta} gorunum={e.gorunum} ilerleme={e.ilerleme} />
          </Cikis>
        ))}
      </div>
      {durum.metinler.map((m) => (
        <Cikis key={m.id} c={m.cikis}>
          <MetinBlogu satirlar={m.satirlar} top={m.top} font={m.font} boyut={m.boyut} agirlik={m.agirlik} renk={m.renk} opaklik={m.opaklik} acilis={m.acilis} />
        </Cikis>
      ))}
      {durum.cipler.map((c) => (
        <Cikis key={c.id} c={c.cikis}>
          <Cip x={c.x} y={c.y} metin={c.metin} nokta={c.nokta} gorunum={c.gorunum} />
        </Cikis>
      ))}
      {durum.kunye > 0 ? <Kunye opaklik={durum.kunye} /> : null}
    </AbsoluteFill>
  );
};
