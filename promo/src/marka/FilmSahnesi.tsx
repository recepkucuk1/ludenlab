import React from "react";
import { AbsoluteFill } from "remotion";
import { DUSUS_YUKSEKLIGI } from "./acilisDurumu.ts";
import type { FilmDurumu, KapanisDurumu } from "./filmDurumu.ts";
import { izd, type V2, type V3 } from "./izometri.ts";
import { BLOK_MERKEZ, Blok, DerinlikSirali, HavaGolgesi, KagitListesi, NoktaliCizgi, Tabla, Tanimlar, Yorunge, Yuva, type SahneOgesi } from "./sahne3b.tsx";
import { ETIKETLER } from "./metin.ts";
import { RENK, TUVAL_169 } from "./tema.ts";
import { Tuval, useTuval } from "./tuval.ts";
import { KAPANIS_916, KUNYE_916, METIN_DONUSUMU, SAHNE_DONUSUMU } from "./yerlesim916.ts";
import { CagriSatiri, Cikis, CiktiKarti, Cip, Damga, Etiket, Kilit, Kunye, KunyeLogo, LogoKilidi, MetinBlogu, Zemin } from "./yazi.tsx";

/** Kapanış kartı: logo kilidi, slogan ve çağrı satırı birlikte `merkez` etrafında yavaşça iter. slogan: satırlar. */
const KapanisKarti: React.FC<{ d: KapanisDurumu; merkez: V2; slogan: readonly string[] }> = ({ d, merkez, slogan }) => (
  <div style={{ position: "absolute", inset: 0, transform: `scale(${d.itme})`, transformOrigin: `${merkez[0]}px ${merkez[1]}px` }}>
    <LogoKilidi x={d.logo.x} y={d.logo.y} w={d.logo.w} gorunum={d.logo.gorunum} />
    {d.slogan.acilis > 0 ? (
      <MetinBlogu satirlar={[...slogan]} top={d.slogan.top} font="govde" boyut={44} agirlik={600} renk={RENK.ink} opaklik={0.85} acilis={slogan.map(() => d.slogan.acilis)} ortala />
    ) : null}
    <CagriSatiri top={d.cagri.top} cipler={d.cagri.cipler} dugme={d.cagri.dugme} />
  </div>
);

// Sahne: tabla, kâğıtlar, blok, yörüngeler, kartlar, damga ve etiketler kameranın itmesiyle birlikte odak (blok)
// etrafında ölçeklenir. Kapanışta (durum.arka) tabla ve yığınlar ayrı bir SVG katmanında bulanıklaşarak çekilir; blok
// ve yörüngeler üstteki katmanda kalır. Tuval: 16:9 filmde kompozisyon, 9:16'da 1920 × 1080'lik sahne bölgesi.
const SahneKatmani: React.FC<{ durum: FilmDurumu }> = ({ durum }) => {
  const { width, height } = useTuval();
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
  );
};

/** Metin sütunu: bölüm yazıları, kilitler ve Dönüş çipleri (kameradan bağımsız, 16:9 sol sütun koordinatlarında). */
const MetinSutunu: React.FC<{ durum: FilmDurumu }> = ({ durum }) => (
  <>
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
  </>
);

// Filmin tek sahnesi (16:9): durum → kare. Zemin sabit; sahne kameranın itmesiyle ölçeklenir; metin sütunu, kapanış
// kartı ve künye kameradan bağımsız.
export const FilmSahnesi: React.FC<{ durum: FilmDurumu }> = ({ durum }) => (
  <AbsoluteFill style={{ overflow: "hidden" }}>
    <Zemin isik={durum.isik} kayma={durum.kayma} />
    <SahneKatmani durum={durum} />
    <MetinSutunu durum={durum} />
    {durum.kapanis ? <KapanisKarti d={durum.kapanis} merkez={[TUVAL_169.w / 2, TUVAL_169.h / 2]} slogan={[durum.kapanis.slogan.metin]} /> : null}
    {durum.kunye > 0 ? (
      <Cikis c={durum.kunyeCikis} koken="center top">
        <Kunye opaklik={durum.kunye} />
      </Cikis>
    ) : null}
  </AbsoluteFill>
);

/** 16:9 tuvali (1920 × 1080) boyunda, sol üstten dönüştürülen bölge (yerlesim916.ts); içindekiler bu tuvali okur. */
const Bolge: React.FC<{ donusum: string; children: React.ReactNode }> = ({ donusum, children }) => (
  <div style={{ position: "absolute", left: 0, top: 0, width: TUVAL_169.w, height: TUVAL_169.h, transform: donusum, transformOrigin: "0 0" }}>
    <Tuval.Provider value={{ width: TUVAL_169.w, height: TUVAL_169.h }}>{children}</Tuval.Provider>
  </div>
);

// 9:16 kesimin sahnesi (1080 × 1920): zemin tam kare; 16:9'un sahne bölgesi üstte, metin sütunu altta (iki tekdüze
// dönüşüm); künye yalnız logo; kapanış kartı ortada (durum916 kartı 9:16 yerlerine taşır).
export const FilmSahnesi916: React.FC<{ durum: FilmDurumu }> = ({ durum }) => (
  <AbsoluteFill style={{ overflow: "hidden" }}>
    <Zemin isik={durum.isik} kayma={durum.kayma} />
    <Bolge donusum={SAHNE_DONUSUMU}>
      <SahneKatmani durum={durum} />
    </Bolge>
    <Bolge donusum={METIN_DONUSUMU}>
      <MetinSutunu durum={durum} />
    </Bolge>
    {durum.kapanis ? <KapanisKarti d={durum.kapanis} merkez={KAPANIS_916.merkez} slogan={KAPANIS_916.slogan.satirlar} /> : null}
    {durum.kunye > 0 ? (
      <Cikis c={durum.kunyeCikis} koken="left top">
        <KunyeLogo x={KUNYE_916.x} y={KUNYE_916.y} yukseklik={KUNYE_916.yukseklik} opaklik={durum.kunye} />
      </Cikis>
    ) : null}
  </AbsoluteFill>
);
