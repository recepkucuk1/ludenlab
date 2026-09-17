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
import { P7StudioAraclar, P8IletisimPanosu, P9Sesletim, P10Eslestirme, P11EvOdevi, P12OturumOzeti, P13AtolyeAraclar, P14Bep, P15Davranis, P16Okuma, P17Matematik, P18VeliMektubu } from "./posts45/Posts2";
import { P1Lansman, P2OgrenmeKarti, P3Artikulasyon, P4SosyalHikaye, P5AtolyeSeans, P6Kapanis } from "./posts45/Posts";

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
