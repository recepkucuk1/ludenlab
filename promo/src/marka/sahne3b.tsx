import React from "react";
import { derinlik, gorunur, izd, kabuk, kup, prizma, ustMu, yol, yol2, yuvarlakTaban, yuzMatrisi, yuzRengi, type Boya, type Kamera, type V2, type V3, type Yuz } from "./izometri.ts";
import { kagitCizgileri, sekmeDortgeni, type Yigin } from "./nesneler.ts";
import { BOYA, CIZGI, RENK } from "./tema.ts";

/** Sahne SVG'sinin başında bir kez: yan yüzlerdeki nokta dokusu. */
export const Tanimlar: React.FC = () => (
  <defs>
    <pattern id="mk-nokta" width={9} height={9} patternUnits="userSpaceOnUse">
      <circle cx={4.5} cy={4.5} r={1.1} fill={RENK.ink} fillOpacity={0.2} />
    </pattern>
  </defs>
);

/** Dışbükey cismin görünen yüzleri: dolgu, yanlarda nokta dokusu, ink kenar. */
export const Cisim: React.FC<{ yuzler: Yuz[]; k: Kamera; boya: Boya; desen?: boolean; kalinlik?: number }> = ({ yuzler, k, boya, desen = true, kalinlik = CIZGI.kalin }) => (
  <g>
    {yuzler
      .filter((y) => gorunur(y, k))
      .map((y, i) => {
        const d = yol(y.ps, k);
        return (
          <g key={i}>
            <path d={d} fill={yuzRengi(y, k, boya)} />
            {desen && !ustMu(y, k) ? <path d={d} fill="url(#mk-nokta)" /> : null}
            <path d={d} fill="none" stroke={RENK.ink} strokeWidth={kalinlik} strokeLinejoin="round" />
          </g>
        );
      })}
  </g>
);

const TABLA = { yari: 2.6, r: 0.55, kalinlik: 0.32 };

/** Yuvarlak köşeli tabla: yan bant (kabuk) + üst yüz. Dönüşü kameranın `don` değeri verir. */
export const Tabla: React.FC<{ k: Kamera }> = ({ k }) => {
  const taban = yuvarlakTaban(-TABLA.yari, -TABLA.yari, TABLA.yari, TABLA.yari, TABLA.r);
  const ust: V3[] = taban.map(([x, y]) => [x, y, 0]);
  const alt: V3[] = taban.map(([x, y]) => [x, y, -TABLA.kalinlik]);
  const kab = yol2(kabuk([...ust, ...alt].map((p) => izd(p, k))));
  return (
    <g>
      <path d={kab} fill={RENK.tablaYan} />
      <path d={kab} fill="url(#mk-nokta)" />
      <path d={kab} fill="none" stroke={RENK.ink} strokeWidth={CIZGI.kalin} strokeLinejoin="round" />
      <path d={yol(ust, k)} fill={RENK.kagitBeyaz} stroke={RENK.ink} strokeWidth={CIZGI.kalin} strokeLinejoin="round" />
    </g>
  );
};

/** Kâğıt yığını: alttan üste; en üst kâğıtta yazı çizgileri ve modül sekmesi. */
export const KagitYigini: React.FC<{ y: Yigin; k: Kamera }> = ({ y, k }) => (
  <g>
    {y.kagitlar.map((kg, i) => (
      <g key={i}>
        <Cisim yuzler={prizma(kg.taban, kg.z0, kg.h)} k={k} boya={BOYA.kagit} desen={false} kalinlik={CIZGI.ince} />
        {kg.ust
          ? kagitCizgileri(kg).map(([a, b], j) => {
              const [p, q] = [izd(a, k), izd(b, k)];
              return <line key={j} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke={RENK.ink} strokeOpacity={0.32} strokeWidth={3} strokeLinecap="round" />;
            })
          : null}
        {kg.sekme ? <path d={yol(sekmeDortgeni(kg), k)} fill={kg.sekme} stroke={RENK.ink} strokeWidth={CIZGI.ince} strokeLinejoin="round" /> : null}
      </g>
    ))}
  </g>
);

export const BLOK_MERKEZ: V3 = [0, 0, 0.5];

/** Turuncu blok = çocuk. Düz dururken +y yüzünde iki göz ve gülüş. */
export const Blok: React.FC<{ k: Kamera; m?: V3; a?: number; aci?: V3; yuz?: boolean }> = ({ k, m = BLOK_MERKEZ, a = 1, aci = [0, 0, 0], yuz = true }) => {
  const h = a / 2;
  const duz = aci.every((v) => v === 0);
  const yuzGorunur = duz && gorunur({ n: [0, 1, 0] }, k);
  return (
    <g>
      <Cisim yuzler={kup(m, a, aci)} k={k} boya={BOYA.turuncu} />
      {yuz && yuzGorunur ? (
        <g
          transform={yuzMatrisi(
            [m[0] - h * 0.62, m[1] + h, m[2] + h * 0.66],
            [m[0] + h * 0.62, m[1] + h, m[2] + h * 0.66],
            [m[0] - h * 0.62, m[1] + h, m[2] - h * 0.62],
            k,
          )}
        >
          <circle cx={21} cy={24} r={4.2} fill={RENK.krem} />
          <circle cx={43} cy={24} r={4.2} fill={RENK.krem} />
          <path d="M17 38Q32 52 47 38" fill="none" stroke={RENK.krem} strokeWidth={3.6} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </g>
      ) : null}
    </g>
  );
};

/** Etiket çizgisi: yuvarlak uçlu noktalar. */
export const NoktaliCizgi: React.FC<{ a: V2; b: V2; opaklik?: number }> = ({ a, b, opaklik = 0.7 }) => (
  <path d={`M${a[0]} ${a[1]}L${b[0]} ${b[1]}`} fill="none" stroke={RENK.ink} strokeOpacity={opaklik} strokeWidth={4} strokeLinecap="round" strokeDasharray="0.1 11" />
);

export const Raptiye: React.FC<{ p: V2 }> = ({ p }) => <circle cx={p[0]} cy={p[1]} r={6.5} fill={RENK.ink} />;

export type SahneOgesi = { p: V3; opaklik?: number; ciz: React.ReactNode };

/** Öğeleri izleyiciye uzaklığına göre (uzaktan yakına) çizer. */
export const DerinlikSirali: React.FC<{ k: Kamera; ogeler: SahneOgesi[] }> = ({ k, ogeler }) => (
  <>
    {ogeler
      .map((o, i) => ({ o, i, d: derinlik(o.p, k) }))
      .sort((a, b) => a.d - b.d)
      .map(({ o, i }) => (
        <g key={i} opacity={o.opaklik ?? 1}>
          {o.ciz}
        </g>
      ))}
  </>
);
