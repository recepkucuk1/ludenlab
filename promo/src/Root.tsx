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
    <Composition id="StudioTanitim916" component={Video916} durationInFrames={900} {...DIM} />
    <Composition id="Hook" component={Hook} durationInFrames={90} {...DIM} />
    <Composition id="Dashboard" component={Dashboard} durationInFrames={150} {...DIM} />
    <Composition id="OgrenmeKartlari" component={OgrenmeKartlari} durationInFrames={180} {...DIM} />
    <Composition id="Sesletim" component={Sesletim} durationInFrames={150} {...DIM} />
    <Composition id="SosyalOyku" component={SosyalOyku} durationInFrames={180} {...DIM} />
    <Composition id="Cta" component={Cta} durationInFrames={150} {...DIM} />
  </>
);
