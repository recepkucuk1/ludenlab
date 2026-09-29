import React from "react";
import { derinlik, gorunur, izd, kabuk, kup, prizma, ustMu, yol, yol2, yuvarlakTaban, yuzMatrisi, yuzRengi, type Boya, type Kamera, type V2, type V3, type Yuz } from "./izometri.ts";
import { kagitCizgileri, sekmeDortgeni, type Kagit, type Yigin } from "./nesneler.ts";
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

/** Kâğıt listesi alttan üste; ust bayraklı kâğıtta yazı çizgileri, sekmeli kâğıtta modül sekmesi. */
export const KagitListesi: React.FC<{ kagitlar: Kagit[]; k: Kamera }> = ({ kagitlar, k }) => (
  <g>
    {kagitlar.map((kg, i) => (
      <g key={i} opacity={kg.opaklik}>
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

/** Kâğıt yığını: KagitListesi'nin yığın verisiyle kullanımı. */
export const KagitYigini: React.FC<{ y: Yigin; k: Kamera }> = ({ y, k }) => <KagitListesi kagitlar={y.kagitlar} k={k} />;

export const BLOK_MERKEZ: V3 = [0, 0, 0.5];

/** Turuncu blok = çocuk. Düz dururken +y yüzünde iki göz ve gülüş; yuz: yüzün opaklığı (0–1). */
export const Blok: React.FC<{ k: Kamera; m?: V3; a?: number; aci?: V3; yuz?: number }> = ({ k, m = BLOK_MERKEZ, a = 1, aci = [0, 0, 0], yuz = 1 }) => {
  const h = a / 2;
  const duz = aci.every((v) => Math.abs(v) < 1e-6);
  const yuzGorunur = duz && yuz > 0 && gorunur({ n: [0, 1, 0] }, k);
  return (
    <g>
      <Cisim yuzler={kup(m, a, aci)} k={k} boya={BOYA.turuncu} />
      {yuzGorunur ? (
        <g
          opacity={yuz}
          transform={yuzMatrisi(
            [m[0] - h * 0.82, m[1] + h, m[2] + h * 0.8],
            [m[0] + h * 0.82, m[1] + h, m[2] + h * 0.8],
            [m[0] - h * 0.82, m[1] + h, m[2] - h * 0.82],
            k,
          )}
        >
          <circle cx={20} cy={24} r={5.5} fill={RENK.krem} />
          <circle cx={44} cy={24} r={5.5} fill={RENK.krem} />
          <path d="M15 38Q32 54 49 38" fill="none" stroke={RENK.krem} strokeWidth={4.8} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </g>
      ) : null}
    </g>
  );
};

/** Tablanın ortasındaki kesikli yuva: blok inmeden önce yerini gösterir. */
export const Yuva: React.FC<{ k: Kamera; opaklik?: number }> = ({ k, opaklik = 1 }) =>
  opaklik <= 0 ? null : (
    <path
      d={yol(yuvarlakTaban(-0.62, -0.62, 0.62, 0.62, 0.14).map(([x, y]) => [x, y, 0.001] as V3), k)}
      fill="none"
      stroke={RENK.ink}
      strokeOpacity={0.4 * opaklik}
      strokeWidth={2.5}
      strokeDasharray="10 9"
      strokeLinecap="round"
    />
  );

/**
 * Havadaki bloğun tablaya düşen gölgesi. Bulanıklık yok (Poster kuralı): keskin kenarlı, düz ink.
 * yakinlik: 0 = çok yüksekte (küçük, soluk), 1 = yere değmek üzere (büyük, koyu).
 */
export const HavaGolgesi: React.FC<{ k: Kamera; yakinlik: number }> = ({ k, yakinlik }) => {
  const y = Math.min(1, Math.max(0, yakinlik));
  const r = 0.25 + 0.25 * y;
  return <path d={yol(yuvarlakTaban(-r, -r, r, r, 0.08).map(([gx, gy]) => [gx, gy, 0.002] as V3), k)} fill={RENK.ink} fillOpacity={0.05 + 0.07 * y} />;
};

/** Etiket çizgisi: yuvarlak uçlu noktalar. ilerleme: a'dan b'ye çizilen kısım (0–1). */
export const NoktaliCizgi: React.FC<{ a: V2; b: V2; opaklik?: number; ilerleme?: number }> = ({ a, b, opaklik = 0.7, ilerleme = 1 }) => {
  if (ilerleme <= 0) return null;
  const p = Math.min(1, ilerleme);
  const son: V2 = [a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p];
  return (
    <path d={`M${a[0]} ${a[1]}L${son[0]} ${son[1]}`} fill="none" stroke={RENK.ink} strokeOpacity={opaklik} strokeWidth={4} strokeLinecap="round" strokeDasharray="0.1 11" />
  );
};

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
