import React from "react";
import { AbsoluteFill, Composition, Sequence } from "remotion";
import "./fonts";
import { colors } from "./brand";
import { Hook } from "./scenes/Hook";
import { Dashboard } from "./scenes/Dashboard";
import { OgrenmeKartlari } from "./scenes/OgrenmeKartlari";
import { Sesletim } from "./scenes/Sesletim";
import { SosyalOyku } from "./scenes/SosyalOyku";
import { Cta } from "./scenes/Cta";
import { REEL } from "./reels-lib/dims";
import { EMPTY_REEL_PROPS, reelMetadata } from "./reels-lib/voiceover";
import { r1Script } from "./reels/r1-lansman/script";
import { R1Lansman } from "./reels/r1-lansman/Reel";
import { r2Script } from "./reels/r2-kartlar/script";
import { R2Kartlar } from "./reels/r2-kartlar/Reel";
import { r3Script } from "./reels/r3-artikulasyon/script";
import { R3Artikulasyon } from "./reels/r3-artikulasyon/Reel";
import { r4Script } from "./reels/r4-sosyal-hikaye/script";
import { R4SosyalHikaye } from "./reels/r4-sosyal-hikaye/Reel";
import { r5Script } from "./reels/r5-meb-atolye/script";
import { R5MebAtolye } from "./reels/r5-meb-atolye/Reel";
import { Still } from "remotion";
import { POST } from "./posts45/kit";
import { STORY, asStory } from "./posts45/story";
import { asFullStory } from "./posts45/storyFull";
import { P7StudioAraclar, P8IletisimPanosu, P9Sesletim, P10Eslestirme, P11EvOdevi, P12OturumOzeti, P13AtolyeAraclar, P14Bep, P15Davranis, P16Okuma, P17Matematik, P18VeliMektubu } from "./posts45/Posts2";
import { P1Lansman, P2OgrenmeKarti, P3Artikulasyon, P4SosyalHikaye, P5AtolyeSeans, P6Kapanis } from "./posts45/Posts";
import { StilKaresi } from "./marka/StilKaresi";
import { MarkaAcilis169 } from "./marka/MarkaAcilis";
import { ACILIS_KARE } from "./marka/acilisDurumu";
import { FPS } from "./marka/zaman";

const StoryP1Lansman = asStory(P1Lansman, true);
const StoryP2OgrenmeKarti = asStory(P2OgrenmeKarti);
const StoryP3Artikulasyon = asStory(P3Artikulasyon);
const StoryP4SosyalHikaye = asStory(P4SosyalHikaye);
const StoryP5AtolyeSeans = asStory(P5AtolyeSeans);
const StoryP6Kapanis = asStory(P6Kapanis, true);
const StoryP7StudioAraclar = asStory(P7StudioAraclar);
const StoryP8IletisimPanosu = asStory(P8IletisimPanosu);
const StoryP9Sesletim = asStory(P9Sesletim);
const StoryP10Eslestirme = asStory(P10Eslestirme);
const StoryP11EvOdevi = asStory(P11EvOdevi);
const StoryP12OturumOzeti = asStory(P12OturumOzeti);
const StoryP13AtolyeAraclar = asStory(P13AtolyeAraclar);
const StoryP14Bep = asStory(P14Bep);
const StoryP15Davranis = asStory(P15Davranis);
const StoryP16Okuma = asStory(P16Okuma);
const StoryP17Matematik = asStory(P17Matematik);
const StoryP18VeliMektubu = asStory(P18VeliMektubu);

const FullP1Lansman = asFullStory(P1Lansman, { dark: true, text: [180, 650], mock: [680, 1235] });
const FullP2OgrenmeKarti = asFullStory(P2OgrenmeKarti, { product: "STUDIO", text: [160, 482], mock: [482, 1258] });
const FullP3Artikulasyon = asFullStory(P3Artikulasyon, { product: "STUDIO", text: [160, 505], mock: [505, 1258], mockScale: 1.0 });
const FullP4SosyalHikaye = asFullStory(P4SosyalHikaye, { product: "STUDIO", text: [160, 482], mock: [482, 1258] });
const FullP5AtolyeSeans = asFullStory(P5AtolyeSeans, { product: "ATÖLYE", text: [160, 482], mock: [482, 1258] });
const FullP6Kapanis = asFullStory(P6Kapanis, { dark: true, text: [390, 1010], mock: [0, 0], textScale: 1.45, mockTop: 0 });
const FullP7StudioAraclar = asFullStory(P7StudioAraclar, { product: "STUDIO", text: [160, 482], mock: [482, 1258] });
const FullP8IletisimPanosu = asFullStory(P8IletisimPanosu, { product: "STUDIO", text: [160, 482], mock: [482, 1258] });
const FullP9Sesletim = asFullStory(P9Sesletim, { product: "STUDIO", text: [160, 482], mock: [482, 1258] });
const FullP10Eslestirme = asFullStory(P10Eslestirme, { product: "STUDIO", text: [160, 482], mock: [482, 1258] });
const FullP11EvOdevi = asFullStory(P11EvOdevi, { product: "STUDIO", text: [160, 482], mock: [482, 1258] });
const FullP12OturumOzeti = asFullStory(P12OturumOzeti, { product: "STUDIO", text: [160, 482], mock: [482, 1258] });
const FullP13AtolyeAraclar = asFullStory(P13AtolyeAraclar, { product: "ATÖLYE", text: [160, 482], mock: [482, 1258] });
const FullP14Bep = asFullStory(P14Bep, { product: "ATÖLYE", text: [160, 482], mock: [482, 1258] });
const FullP15Davranis = asFullStory(P15Davranis, { product: "ATÖLYE", text: [160, 482], mock: [482, 1258] });
const FullP16Okuma = asFullStory(P16Okuma, { product: "ATÖLYE", text: [160, 482], mock: [482, 1258] });
const FullP17Matematik = asFullStory(P17Matematik, { product: "ATÖLYE", text: [160, 482], mock: [482, 1258] });
const FullP18VeliMektubu = asFullStory(P18VeliMektubu, { product: "ATÖLYE", text: [160, 482], mock: [482, 1258] });

const Video916: React.FC = () => (
  <AbsoluteFill style={{ background: colors.cream }}>
    <Sequence durationInFrames={90}>
      <Hook />
    </Sequence>
    <Sequence from={90} durationInFrames={150}>
      <Dashboard />
    </Sequence>
    <Sequence from={240} durationInFrames={180}>
      <OgrenmeKartlari />
    </Sequence>
    <Sequence from={420} durationInFrames={150}>
      <Sesletim />
    </Sequence>
    <Sequence from={570} durationInFrames={180}>
      <SosyalOyku />
    </Sequence>
    <Sequence from={750} durationInFrames={150}>
      <Cta />
    </Sequence>
  </AbsoluteFill>
);

const DIM = { fps: 30, width: 1080, height: 1920 } as const;

export const Root: React.FC = () => (
  <>
    {/* LudenLab marka filmi (docs/superpowers/specs/2026-09-28-ludenlab-marka-filmi-design.md) */}
    <Still id="MarkaStilKaresi" component={StilKaresi} width={1920} height={1080} />
    <Composition id="MarkaAcilis169" component={MarkaAcilis169} durationInFrames={ACILIS_KARE} fps={FPS} width={1920} height={1080} />
    <Still id="Post45-1-Lansman" component={P1Lansman} {...POST} />
    <Still id="Post45-2-OgrenmeKarti" component={P2OgrenmeKarti} {...POST} />
    <Still id="Post45-3-Artikulasyon" component={P3Artikulasyon} {...POST} />
    <Still id="Post45-4-SosyalHikaye" component={P4SosyalHikaye} {...POST} />
    <Still id="Post45-5-AtolyeSeans" component={P5AtolyeSeans} {...POST} />
    <Still id="Post45-6-Kapanis" component={P6Kapanis} {...POST} />
    <Still id="Post45-7-StudioAraclar" component={P7StudioAraclar} {...POST} />
    <Still id="Post45-8-IletisimPanosu" component={P8IletisimPanosu} {...POST} />
    <Still id="Post45-9-Sesletim" component={P9Sesletim} {...POST} />
    <Still id="Post45-10-Eslestirme" component={P10Eslestirme} {...POST} />
    <Still id="Post45-11-EvOdevi" component={P11EvOdevi} {...POST} />
    <Still id="Post45-12-OturumOzeti" component={P12OturumOzeti} {...POST} />
    <Still id="Post45-13-AtolyeAraclar" component={P13AtolyeAraclar} {...POST} />
    <Still id="Post45-14-Bep" component={P14Bep} {...POST} />
    <Still id="Post45-15-Davranis" component={P15Davranis} {...POST} />
    <Still id="Post45-16-Okuma" component={P16Okuma} {...POST} />
    <Still id="Post45-17-Matematik" component={P17Matematik} {...POST} />
    <Still id="Post45-18-VeliMektubu" component={P18VeliMektubu} {...POST} />
    <Still id="Story916-1-Lansman" component={StoryP1Lansman} {...STORY} />
    <Still id="Story916-2-OgrenmeKarti" component={StoryP2OgrenmeKarti} {...STORY} />
    <Still id="Story916-3-Artikulasyon" component={StoryP3Artikulasyon} {...STORY} />
    <Still id="Story916-4-SosyalHikaye" component={StoryP4SosyalHikaye} {...STORY} />
    <Still id="Story916-5-AtolyeSeans" component={StoryP5AtolyeSeans} {...STORY} />
    <Still id="Story916-6-Kapanis" component={StoryP6Kapanis} {...STORY} />
    <Still id="Story916-7-StudioAraclar" component={StoryP7StudioAraclar} {...STORY} />
    <Still id="Story916-8-IletisimPanosu" component={StoryP8IletisimPanosu} {...STORY} />
    <Still id="Story916-9-Sesletim" component={StoryP9Sesletim} {...STORY} />
    <Still id="Story916-10-Eslestirme" component={StoryP10Eslestirme} {...STORY} />
    <Still id="Story916-11-EvOdevi" component={StoryP11EvOdevi} {...STORY} />
    <Still id="Story916-12-OturumOzeti" component={StoryP12OturumOzeti} {...STORY} />
    <Still id="Story916-13-AtolyeAraclar" component={StoryP13AtolyeAraclar} {...STORY} />
    <Still id="Story916-14-Bep" component={StoryP14Bep} {...STORY} />
    <Still id="Story916-15-Davranis" component={StoryP15Davranis} {...STORY} />
    <Still id="Story916-16-Okuma" component={StoryP16Okuma} {...STORY} />
    <Still id="Story916-17-Matematik" component={StoryP17Matematik} {...STORY} />
    <Still id="Story916-18-VeliMektubu" component={StoryP18VeliMektubu} {...STORY} />
    <Still id="StoryFull916-1-Lansman" component={FullP1Lansman} {...STORY} />
    <Still id="StoryFull916-2-OgrenmeKarti" component={FullP2OgrenmeKarti} {...STORY} />
    <Still id="StoryFull916-3-Artikulasyon" component={FullP3Artikulasyon} {...STORY} />
    <Still id="StoryFull916-4-SosyalHikaye" component={FullP4SosyalHikaye} {...STORY} />
    <Still id="StoryFull916-5-AtolyeSeans" component={FullP5AtolyeSeans} {...STORY} />
    <Still id="StoryFull916-6-Kapanis" component={FullP6Kapanis} {...STORY} />
    <Still id="StoryFull916-7-StudioAraclar" component={FullP7StudioAraclar} {...STORY} />
    <Still id="StoryFull916-8-IletisimPanosu" component={FullP8IletisimPanosu} {...STORY} />
    <Still id="StoryFull916-9-Sesletim" component={FullP9Sesletim} {...STORY} />
    <Still id="StoryFull916-10-Eslestirme" component={FullP10Eslestirme} {...STORY} />
    <Still id="StoryFull916-11-EvOdevi" component={FullP11EvOdevi} {...STORY} />
    <Still id="StoryFull916-12-OturumOzeti" component={FullP12OturumOzeti} {...STORY} />
    <Still id="StoryFull916-13-AtolyeAraclar" component={FullP13AtolyeAraclar} {...STORY} />
    <Still id="StoryFull916-14-Bep" component={FullP14Bep} {...STORY} />
    <Still id="StoryFull916-15-Davranis" component={FullP15Davranis} {...STORY} />
    <Still id="StoryFull916-16-Okuma" component={FullP16Okuma} {...STORY} />
    <Still id="StoryFull916-17-Matematik" component={FullP17Matematik} {...STORY} />
    <Still id="StoryFull916-18-VeliMektubu" component={FullP18VeliMektubu} {...STORY} />
    <Composition id="StudioTanitim916" component={Video916} durationInFrames={900} {...DIM} />
    <Composition id="Hook" component={Hook} durationInFrames={90} {...DIM} />
    <Composition id="Dashboard" component={Dashboard} durationInFrames={150} {...DIM} />
    <Composition id="OgrenmeKartlari" component={OgrenmeKartlari} durationInFrames={180} {...DIM} />
    <Composition id="Sesletim" component={Sesletim} durationInFrames={150} {...DIM} />
    <Composition id="SosyalOyku" component={SosyalOyku} durationInFrames={180} {...DIM} />
    <Composition id="Cta" component={Cta} durationInFrames={150} {...DIM} />
    <Composition
      id="R1-Lansman"
      component={R1Lansman}
      durationInFrames={1}
      {...REEL}
      defaultProps={EMPTY_REEL_PROPS}
      calculateMetadata={reelMetadata(r1Script)}
    />
    <Composition
      id="R2-Kartlar"
      component={R2Kartlar}
      durationInFrames={1}
      {...REEL}
      defaultProps={EMPTY_REEL_PROPS}
      calculateMetadata={reelMetadata(r2Script)}
    />
    <Composition
      id="R3-Artikulasyon"
      component={R3Artikulasyon}
      durationInFrames={1}
      {...REEL}
      defaultProps={EMPTY_REEL_PROPS}
      calculateMetadata={reelMetadata(r3Script)}
    />
    <Composition
      id="R4-SosyalHikaye"
      component={R4SosyalHikaye}
      durationInFrames={1}
      {...REEL}
      defaultProps={EMPTY_REEL_PROPS}
      calculateMetadata={reelMetadata(r4Script)}
    />
    <Composition
      id="R5-MebAtolye"
      component={R5MebAtolye}
      durationInFrames={1}
      {...REEL}
      defaultProps={EMPTY_REEL_PROPS}
      calculateMetadata={reelMetadata(r5Script)}
    />
  </>
);
