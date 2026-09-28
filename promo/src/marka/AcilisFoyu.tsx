import React from "react";
import { AbsoluteFill } from "remotion";
import { AcilisSahnesi } from "./AcilisSahnesi.tsx";
import { acilisDurumu } from "./acilisDurumu.ts";
import { KANCA, SESLER_169, type SesTuru } from "./olaylar.ts";
import { FONT, RENK } from "./tema.ts";
import { VURUS_KARE, kare } from "./zaman.ts";

// Açılış föyü (onay kapısı 2): animasyonun kendi durum fonksiyonundan seçilmiş üç an + 8 vuruşluk zaman çizgisi.
export const FOY_BOYUT = { w: 1920, h: 1040 } as const;
const KARE_G = 560;
const ARA = 60;
const SOL = 60;
const VURUS_PX = 220;
const SES_ADI: Record<SesTuru, string> = { whoosh: "whoosh", tok: "tok", tik: "tık", kagit: "kâğıt", donus: "dönüş", sayfa: "sayfa" };

const KARELER: { f: number; zaman: string; vurus: string; olay: string; ses: string }[] = [
  {
    f: 29,
    zaman: "0:00–0:01,2",
    vurus: "vuruş 1–3",
    olay: "Blok taklayla düşer; noktalı çizgi yuvayı, keskin kenarlı gölge yaklaşmayı gösterir. «HER ÇOCUK» soldan sağa açılır. Logo yok.",
    ses: "whoosh, inişte susar",
  },
  {
    f: kare(KANCA.inis) + 12,
    zaman: "0:01,2–0:01,6",
    vurus: "vuruş 3",
    olay: "Blok yuvasına tok oturur, zıplamaz; sahne 6 px sarsılır. «AYRI.» açılır, bloğun yüzü belirir.",
    ses: "tok, vuruşun üstünde",
  },
  {
    f: kare(8) + 6,
    zaman: "0:02,4–0:04,8",
    vurus: "vuruş 5–8",
    olay: "«Özel eğitimde» açılır; her vuruşta bir etiket çizgisi raptiyesine varır: /r/ sesi, okuma akıcılığı, sıra beklemek. Kamera bloğa %3 iter.",
    ses: "her etikette tık",
  },
];

const Zamanlama: React.FC<{ y: number }> = ({ y }) => {
  const x = (vurus: number) => SOL + 20 + vurus * VURUS_PX;
  return (
    <svg width={FOY_BOYUT.w} height={140} style={{ position: "absolute", left: 0, top: y, overflow: "visible" }}>
      <line x1={x(0)} y1={52} x2={x(8)} y2={52} stroke={RENK.teal} strokeWidth={2} />
      {Array.from({ length: 9 }, (_, i) => (
        <g key={i}>
          <line x1={x(i)} y1={i % 4 === 0 ? 38 : 44} x2={x(i)} y2={60} stroke={RENK.teal} strokeWidth={i % 4 === 0 ? 3 : 2} />
          {i < 8 ? (
            <text x={x(i) + 8} y={84} fontFamily={FONT.govde} fontWeight={700} fontSize={20} fill={RENK.teal} fillOpacity={0.55}>
              {i + 1}
            </text>
          ) : null}
        </g>
      ))}
      {KARELER.map((k, i) => {
        const cx = x(k.f / VURUS_KARE);
        return (
          <g key={i}>
            <circle cx={cx} cy={17} r={16} fill={RENK.turuncu} />
            <text x={cx} y={24} textAnchor="middle" fontFamily={FONT.govde} fontWeight={700} fontSize={20} fill="#fff">
              {i + 1}
            </text>
          </g>
        );
      })}
      {SESLER_169.filter((s) => s.vurus <= 8).map((s, i) => (
        <g key={i}>
          <circle cx={x(s.vurus - 1) + 12} cy={112} r={5} fill={RENK.turuncu} />
          <text x={x(s.vurus - 1) + 24} y={119} fontFamily={FONT.govde} fontWeight={700} fontSize={20} fill={RENK.teal} fillOpacity={0.75}>
            {SES_ADI[s.tur]}
          </text>
        </g>
      ))}
      <text x={x(8)} y={119} textAnchor="end" fontFamily={FONT.govde} fontWeight={700} fontSize={20} fill={RENK.teal} fillOpacity={0.75}>
        Yük →
      </text>
    </svg>
  );
};

export const AcilisFoyu: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#f3e8d6", fontFamily: FONT.govde, color: RENK.teal }}>
    <div style={{ position: "absolute", left: SOL, top: 56 }}>
      <div style={{ fontFamily: FONT.baslik, fontWeight: 800, fontSize: 44 }}>AÇILIŞ · MASANIN ÖBÜR TARAFI</div>
      <div style={{ fontWeight: 500, fontSize: 26, opacity: 0.7, marginTop: 6 }}>İlk 4,8 saniye · 100 BPM · 1 vuruş = 0,6 sn · 16:9</div>
    </div>
    {KARELER.map((k, i) => (
      <div key={i} style={{ position: "absolute", left: SOL + i * (KARE_G + ARA), top: 170, width: KARE_G }}>
        <div
          style={{
            position: "relative",
            width: KARE_G,
            height: (KARE_G * 1080) / 1920,
            borderRadius: 18,
            overflow: "hidden",
            border: `2px solid ${RENK.ink}`,
            boxShadow: `8px 8px 0 ${RENK.ink}`,
          }}
        >
          <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transform: `scale(${KARE_G / 1920})`, transformOrigin: "0 0" }}>
            <AcilisSahnesi durum={acilisDurumu(k.f)} />
          </div>
        </div>
        <div style={{ marginTop: 26, display: "flex", alignItems: "baseline", gap: 14 }}>
          <span style={{ fontWeight: 700, fontSize: 30, color: RENK.turuncu }}>{i + 1}</span>
          <span style={{ fontWeight: 700, fontSize: 26 }}>{k.zaman}</span>
          <span style={{ fontWeight: 500, fontSize: 24, opacity: 0.6 }}>{k.vurus}</span>
        </div>
        <div style={{ fontWeight: 500, fontSize: 23, lineHeight: 1.36, marginTop: 10 }}>{k.olay}</div>
        <div style={{ fontWeight: 700, fontSize: 22, marginTop: 12, opacity: 0.75 }}>Ses: {k.ses}</div>
      </div>
    ))}
    <Zamanlama y={760} />
  </AbsoluteFill>
);
