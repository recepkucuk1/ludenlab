import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { DUSUS_YUKSEKLIGI } from "./acilisDurumu.ts";
import type { FilmDurumu, KapanisDurumu } from "./filmDurumu.ts";
import { izd, type V3 } from "./izometri.ts";
import { BLOK_MERKEZ, Blok, DerinlikSirali, HavaGolgesi, KagitListesi, NoktaliCizgi, Tabla, Tanimlar, Yorunge, Yuva, type SahneOgesi } from "./sahne3b.tsx";
import { ETIKETLER } from "./metin.ts";
import { RENK } from "./tema.ts";
import { CagriSatiri, Cikis, CiktiKarti, Cip, Damga, Etiket, Kilit, Kunye, LogoKilidi, MetinBlogu, Zemin } from "./yazi.tsx";

/** Kapanış kartı: logo kilidi, slogan ve çağrı satırı birlikte ekran ortası etrafında yavaşça iter. */
const KapanisKarti: React.FC<{ d: KapanisDurumu }> = ({ d }) => (
  <div style={{ position: "absolute", inset: 0, transform: `scale(${d.itme})`, transformOrigin: "960px 540px" }}>
    <LogoKilidi x={d.logo.x} y={d.logo.y} w={d.logo.w} gorunum={d.logo.gorunum} />
    {d.slogan.acilis > 0 ? (
      <MetinBlogu satirlar={[d.slogan.metin]} top={d.slogan.top} font="govde" boyut={44} agirlik={600} renk={RENK.ink} opaklik={0.85} acilis={[d.slogan.acilis]} ortala />
    ) : null}
    <CagriSatiri top={d.cagri.top} cipler={d.cagri.cipler} dugme={d.cagri.dugme} />
  </div>
);

// Filmin tek sahnesi: durum → kare. Zemin sabit; tabla, kâğıtlar, blok ve etiketler kameranın itmesiyle birlikte
// odak (blok) etrafında ölçeklenir; metin sütunu, çipler ve künye kameradan bağımsız. Kapanışta (durum.arka) tabla
// ve yığınlar ayrı bir SVG katmanında bulanıklaşarak çekilir; blok ve yörüngeler üstteki katmanda kalır.
export const FilmSahnesi: React.FC<{ durum: FilmDurumu }> = ({ durum }) => {
  const { width, height } = useVideoConfig();
  const k = durum.kamera;
  const havada = durum.blok.z > 0.02;
  const blokM: V3 = [BLOK_MERKEZ[0], BLOK_MERKEZ[1], BLOK_MERKEZ[2] + durum.blok.z];
  const iz = durum.blok.iz;
  const blokOgeleri: SahneOgesi[] =
    iz && iz.olcek <= 0
      ? []
      : [
          {
            p: [0, 0, 0],
            opaklik: durum.blok.opaklik,
            ciz: (
              <g transform={iz ? `translate(${iz.merkez[0]} ${iz.merkez[1]}) scale(${iz.olcek}) translate(${-iz.kaynak[0]} ${-iz.kaynak[1]})` : undefined}>
                <Blok k={k} m={blokM} aci={durum.blok.aci} yuz={durum.blok.yuz} />
              </g>
            ),
          },
        ];
  const kagitOgeleri: SahneOgesi[] = durum.kagitlar.map((g) => ({ p: g.p, opaklik: g.opaklik, ciz: <KagitListesi kagitlar={g.kagitlar} k={k} /> }));
  const yorungeOgeleri: SahneOgesi[] = durum.yorungeler.map((y) => ({
    p: [0, 0, 0],
    d: y.on ? 1 : -1,
    ciz: <Yorunge cizgi={y.cizgi} dolgu={y.dolgu} kalinlik={y.kalinlik} kilif={y.kilif} opaklik={y.opaklik} />,
  }));
  const tablaKatmani = (
    <>
      <Tabla k={k} />
      <Yuva k={k} opaklik={durum.yuva} />
      {havada ? (
        <>
          <HavaGolgesi k={k} yakinlik={1 - durum.blok.z / DUSUS_YUKSEKLIGI} />
          <NoktaliCizgi a={izd([0, 0, 0.001], k)} b={izd([0, 0, durum.blok.z], k)} opaklik={0.45} />
        </>
      ) : null}
    </>
  );
  const arka = durum.arka;
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
        {arka ? (
          <>
            {arka.opaklik > 0 ? (
              <svg
                width={width}
                height={height}
                style={{
                  position: "absolute",
                  inset: 0,
                  opacity: arka.opaklik,
                  filter: arka.bulaniklik > 0 ? `blur(${arka.bulaniklik}px)` : undefined,
                  transform: `scale(${arka.olcek})`,
                  transformOrigin: `${durum.odak[0]}px ${durum.odak[1]}px`,
                }}
              >
                <Tanimlar />
                {tablaKatmani}
                <DerinlikSirali k={k} ogeler={kagitOgeleri} />
              </svg>
            ) : null}
            <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
              <Tanimlar />
              <DerinlikSirali k={k} ogeler={[...blokOgeleri, ...yorungeOgeleri]} />
            </svg>
          </>
        ) : (
          <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
            <Tanimlar />
            {tablaKatmani}
            <DerinlikSirali k={k} ogeler={[...kagitOgeleri, ...blokOgeleri, ...yorungeOgeleri]} />
          </svg>
        )}
        {[...durum.kartlar]
          .sort((a, b) => b.sira - a.sira)
          .map((k) => (
            <Cikis key={k.id} c={k.cikis} koken="center">
              <CiktiKarti resim={k.resim} cx={k.cx} cy={k.cy} w={k.w} h={k.h} olcek={k.olcek} rotY={k.rotY} egim={k.egim} opaklik={k.opaklik} />
            </Cikis>
          ))}
        {durum.damga ? (
          <Cikis c={durum.damga.cikis} koken="center">
            <Damga x={durum.damga.x} y={durum.damga.y} olcek={durum.damga.olcek} aci={durum.damga.aci} opaklik={durum.damga.opaklik} metin={ETIKETLER.damga[0]} />
          </Cikis>
        ) : null}
        {durum.etiketler.map((e) => (
          <Cikis key={e.id} c={e.cikis} koken="center">
            <Etiket capa={e.capaEkran ?? izd(e.capa, k)} x={e.x} y={e.y} hiza={e.hiza} metin={e.metin} nokta={e.nokta} gorunum={e.gorunum} ilerleme={e.ilerleme} />
          </Cikis>
        ))}
      </div>
      {durum.metinler.map((m) => (
        <Cikis key={m.id} c={m.cikis}>
          <MetinBlogu satirlar={m.satirlar} top={m.top} font={m.font} boyut={m.boyut} agirlik={m.agirlik} renk={m.renk} opaklik={m.opaklik} acilis={m.acilis} genislik={m.genislik} />
        </Cikis>
      ))}
      {durum.kilitler.map((k) => (
        <Cikis key={k.id} c={k.cikis}>
          <Kilit numara={k.numara} kelime={k.kelime} top={k.top} gorunum={k.gorunum} />
        </Cikis>
      ))}
      {durum.cipler.map((c) => (
        <Cikis key={c.id} c={c.cikis}>
          <Cip x={c.x} y={c.y} metin={c.metin} nokta={c.nokta} gorunum={c.gorunum} />
        </Cikis>
      ))}
      {durum.kapanis ? <KapanisKarti d={durum.kapanis} /> : null}
      {durum.kunye > 0 ? (
        <Cikis c={durum.kunyeCikis} koken="center top">
          <Kunye opaklik={durum.kunye} />
        </Cikis>
      ) : null}
    </AbsoluteFill>
  );
};
