import React from "react";
import { AbsoluteFill, Html5Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { FilmSahnesi } from "./FilmSahnesi.tsx";
import { filmDurumu } from "./filmDurumu.ts";
import { EFEKT_SES, EFEKT_SES_VO, VO_PARCALARI, VO_SES, muzikSeviyesi } from "./sesDuzeni.ts";

export type MarkaFilmiProps = { vo: boolean };

/**
 * 16:9 marka filmi (60 sn). Ses: efekt (public/marka/sfx-169.wav, `npm run marka:sfx`), müzik
 * (muzik-169.wav, `npm run marka:muzik`) ve `vo` açıkken seslendirme (public/marka/vo/<id>.mp3, vuruşunda başlar).
 * Müzik seslendirmenin altında kısılır (sesDuzeni.ts); `vo` kapalıyken hiç kısılmaz.
 */
export const MarkaFilmi169: React.FC<MarkaFilmiProps> = ({ vo }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <FilmSahnesi durum={filmDurumu(f)} />
      <Html5Audio src={staticFile("marka/sfx-169.wav")} volume={vo ? EFEKT_SES_VO : EFEKT_SES} />
      {/* `volume` işlevine kare, en yakın Sequence'in başına göre gelir; müzik Sequence dışında olduğundan film karesidir. */}
      <Html5Audio src={staticFile("marka/muzik-169.wav")} volume={(kare) => muzikSeviyesi(kare, vo)} />
      {vo &&
        VO_PARCALARI.map((p) => (
          <Sequence key={p.id} from={p.from} durationInFrames={p.sure + 15} name={`vo ${p.id}`}>
            <Html5Audio src={staticFile(`marka/vo/${p.id}.mp3`)} volume={VO_SES} />
          </Sequence>
        ))}
    </AbsoluteFill>
  );
};
