import React from "react";
import { AbsoluteFill, Html5Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { durum916 } from "./durum916.ts";
import { FilmSahnesi, FilmSahnesi916 } from "./FilmSahnesi.tsx";
import { filmDurumu } from "./filmDurumu.ts";
import { EFEKT_SES, EFEKT_SES_VO, VO_PARCALARI, VO_PARCALARI_916, VO_SES, muzikSeviyesi, type VoParcasi } from "./sesDuzeni.ts";

export type MarkaFilmiProps = { vo: boolean };

/**
 * Filmin sesi: efekt (public/marka/sfx-<oran>.wav, `npm run marka:sfx`), müzik (muzik-<oran>.wav, `npm run marka:muzik`)
 * ve `vo` açıkken seslendirme (public/marka/vo/<id>.mp3, parçanın karesinde başlar). Müzik seslendirmenin altında kısılır
 * (sesDuzeni.ts); `vo` kapalıyken hiç kısılmaz.
 */
const FilmSesi: React.FC<{ oran: "169" | "916"; vo: boolean; parcalar: readonly VoParcasi[] }> = ({ oran, vo, parcalar }) => (
  <>
    <Html5Audio src={staticFile(`marka/sfx-${oran}.wav`)} volume={vo ? EFEKT_SES_VO : EFEKT_SES} />
    {/* `volume` işlevine kare, en yakın Sequence'in başına göre gelir; müzik Sequence dışında olduğundan film karesidir. */}
    <Html5Audio src={staticFile(`marka/muzik-${oran}.wav`)} volume={(kare) => muzikSeviyesi(kare, vo, parcalar)} />
    {vo &&
      parcalar.map((p) => (
        <Sequence key={p.id} from={p.from} durationInFrames={p.sure + 15} name={`vo ${p.id}`}>
          <Html5Audio src={staticFile(`marka/vo/${p.id}.mp3`)} volume={VO_SES} />
        </Sequence>
      ))}
  </>
);

/** 16:9 marka filmi (60 sn). */
export const MarkaFilmi169: React.FC<MarkaFilmiProps> = ({ vo }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <FilmSahnesi durum={filmDurumu(f)} />
      <FilmSesi oran="169" vo={vo} parcalar={VO_PARCALARI} />
    </AbsoluteFill>
  );
};

/** 9:16 kesim (30 sn): 16:9 filmin durumu zaman eşlemesinden ve süzgeçten geçer (durum916.ts). */
export const MarkaFilmi916: React.FC<MarkaFilmiProps> = ({ vo }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <FilmSahnesi916 durum={durum916(f)} />
      <FilmSesi oran="916" vo={vo} parcalar={VO_PARCALARI_916} />
    </AbsoluteFill>
  );
};
