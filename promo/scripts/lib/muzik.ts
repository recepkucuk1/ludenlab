import { BPM, type Bolum } from "../../src/marka/zaman.ts";
import { AKOR_TONLARI, DUZEN, MIKS, SON_AKOR, akorSegmentleri, katmanSec, type AkorSegmenti } from "../../src/marka/muzikPlani.ts";

// Marka filmi arka plan müziği (LudenMain/video/scripts/muzik.mjs'ten uyarlandı): marimba arpej + pad +
// yumuşak bas, hafif ritim. Bağımlılıksız, saf: aynı bölümler ve seçenekler her zaman aynı örnekleri verir.

export const ORNEKLEME = 44100;

export type MuzikSecenekleri = {
  /** Son C akorunun başladığı vuruş (varsayılan: kapanış.ilk + 4). */
  sonAkorVurusu?: number;
  sr?: number;
  bpm?: number;
  /** Shaker gürültüsü ve vuruş nüansı için tohum. */
  tohum?: number;
};
export type StereoIz = { sol: Float32Array; sag: Float32Array };

const IKI_PI = 2 * Math.PI;
const frekans = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

/** Bölümlerin (1. vuruştan başlayan, boşluksuz) stereo müzik izi; uzunluk tam son vuruşun sonu. */
export function muzikIzi(bolumler: Bolum[], secenekler: MuzikSecenekleri = {}): StereoIz {
  const sr = secenekler.sr ?? ORNEKLEME;
  const vurusSn = 60 / (secenekler.bpm ?? BPM);
  const zaman = (v: number) => (v - 1) * vurusSn;
  const N = Math.round(bolumler[bolumler.length - 1].son * vurusSn * sr);
  const sureSn = N / sr;
  const sol = new Float32Array(N);
  const sag = new Float32Array(N);

  let tohum = secenekler.tohum ?? 7;
  const rastgele = () => ((tohum = (tohum * 16807) % 2147483647) / 2147483647) * 2 - 1;

  /** Şablonu t0'dan ekler; `kesim` verilirse ondan önce 30 ms'de söner (nefes). */
  const ekle = (k: Float32Array, t0: number, o: Float32Array, g: number, kesim = Infinity) => {
    const bas = Math.round(t0 * sr);
    let n = Math.min(o.length, N - bas);
    let rampa = 0;
    if (kesim < Infinity) {
      const kn = Math.round(kesim * sr) - bas;
      if (kn < n) {
        n = Math.max(0, kn);
        rampa = Math.min(n, Math.round(0.03 * sr));
      }
    }
    const rampaBas = n - rampa;
    for (let i = Math.max(0, -bas); i < n; i++) k[bas + i] += g * o[i] * (i < rampaBas ? 1 : (n - i) / rampa);
  };

  const onbellek = new Map<string, Float32Array>();
  const onbellekte = (anahtar: string, uret: () => Float32Array) => {
    let o = onbellek.get(anahtar);
    if (!o) onbellek.set(anahtar, (o = uret()));
    return o;
  };
  const birak = (sn: number, t: number, r: number) => Math.min(1, Math.max(0, (sn - t) / r));

  /** o'ya a·e^(−k·t)·sin(2πft) ekler, `sinir` sn'de durur. Sönümlü yineleme: y[n] = 2r·cos(w)·y[n−1] − r²·y[n−2]. */
  const sonumlu = (o: Float32Array, f: number, a: number, k: number, sinir = Infinity) => {
    if (f >= sr / 2) return;
    const w = (IKI_PI * f) / sr, r = Math.exp(-k / sr), c = 2 * r * Math.cos(w), r2 = r * r;
    let y0 = 0, y1 = -Math.sin(w) / r;
    const n = Math.min(o.length, Math.round(sinir * sr));
    for (let i = 0; i < n; i++) {
      o[i] += a * y0;
      const y = c * y0 - r2 * y1;
      y1 = y0;
      y0 = y;
    }
  };
  /** Doğrusal atak ve sona doğru doğrusal bırakma (tık olmasın). */
  const zarfla = (o: Float32Array, atakSn: number, birakSn: number) => {
    const an = atakSn * sr, bn = birakSn * sr, n = o.length;
    for (let i = 0; i < n; i++) o[i] *= Math.min(1, i / an, (n - i) / bn);
    return o;
  };
  const bos = (sn: number) => new Float32Array(Math.max(0, Math.round(sn * sr)));

  // Marimba: temel + 4× ve 10× kısmi, hızlı sönüm. sonum < 1 daha uzun çınlar.
  const marimba = (midi: number, sn: number, sonum = 1) =>
    onbellekte(`m${midi}|${sn}|${sonum}`, () => {
      const f = frekans(midi), o = bos(sn);
      sonumlu(o, f, 1, 5 * sonum);
      if (4 * f < 16000) sonumlu(o, 4 * f, 0.35, 22 * sonum, 0.5 / sonum);
      if (10 * f < 16000) sonumlu(o, 10 * f, 0.12, 60 * sonum, 0.2 / sonum);
      return zarfla(o, 0.004, 0.02);
    });
  // Bas: sönümlü sinüs + küçük hoparlörde duyulsun diye hafif 2. harmonik.
  const basSesi = (midi: number, sn: number, sonum = 1) =>
    onbellekte(`b${midi}|${sn}|${sonum}`, () => {
      const f = frekans(midi), o = bos(sn);
      sonumlu(o, f, 1, 3 * sonum);
      sonumlu(o, 2 * f, 0.25, 3 * sonum + 4);
      return zarfla(o, 0.01, 0.03);
    });
  // Çan: uyumsuz kısmilerle yumuşak vurgu.
  const zil = (midi: number) =>
    onbellekte(`z${midi}`, () => {
      const f = frekans(midi), o = bos(1.6);
      sonumlu(o, f, 1, 2.5);
      sonumlu(o, 2.76 * f, 0.4, 5);
      sonumlu(o, 5.4 * f, 0.2, 9);
      return zarfla(o, 0.002, 0.02);
    });
  // Kick: perdesi düşen sinüs.
  const kickSablon = (() => {
    const o = bos(0.25);
    let faz = 0;
    for (let i = 0; i < o.length; i++) {
      const t = i / sr;
      faz += (IKI_PI * (50 + 90 * Math.exp(-t * 35))) / sr;
      o[i] = Math.exp(-t * 14) * Math.sin(faz) * birak(0.25, t, 0.01);
    }
    return o;
  })();
  // Shaker: tohumlu gürültünün farkı (basit yüksek geçiren); 16 çeşitlik bankadan tohumla seçilir.
  const shakerlar = Array.from({ length: 16 }, () => {
    const o = bos(0.09);
    let onceki = 0;
    for (let i = 0; i < o.length; i++) {
      const t = i / sr;
      const g = rastgele();
      o[i] = Math.min(1, t / 0.001) * Math.exp(-t * 45) * (g - onceki);
      onceki = g;
    }
    return o;
  });
  const shaker = () => shakerlar[Math.floor(((rastgele() + 1) / 2) * shakerlar.length)];

  type PadAyari = { atak?: number; birak?: number; parlak?: number; baslangic?: number; ters?: boolean };
  /** Pad: kanal başına ayrı akortlu sinüsler (genişlik), 0,6 sn zarf; `ters` sona doğru şişip keser. Birim kazançla önbelleklenir. */
  const pad = (midiler: readonly number[], t0: number, sn: number, ses: number, a: PadAyari = {}) => {
    const anahtar = `p${midiler.join(",")}|${sn}|${a.atak}|${a.birak}|${a.parlak}|${a.baslangic}|${a.ters}`;
    const uret = (kanal: 0 | 1) => () => {
      const o = bos(sn), d = kanal === 0 ? -1 : 1, p = a.parlak ?? 0;
      for (const m of midiler) {
        const f = frekans(m);
        sonumlu(o, f * (1 + 0.0017 * d), 1, 0);
        sonumlu(o, f * (2 - 0.003 * d), 0.3, 0);
        if (p > 0) {
          sonumlu(o, f * (3 + 0.002 * d), 0.6 * p, 0);
          sonumlu(o, f * (4 + 0.002 * (d + 1)), 0.4 * p, 0);
        }
      }
      const atak = a.atak ?? 0.6, cikis = a.birak ?? 0.6;
      for (let i = 0; i < o.length; i++) {
        const t = i / sr;
        let z = a.ters ? (t / sn) ** 2.5 * birak(sn, t, 0.015) : Math.min(1, t / atak) * birak(sn, t, cikis);
        if (a.baslangic !== undefined) z *= a.baslangic + (1 - a.baslangic) * (t / sn);
        o[i] *= z / midiler.length;
      }
      return o;
    };
    ekle(sol, t0, onbellekte(`${anahtar}|0`, uret(0)), ses);
    ekle(sag, t0, onbellekte(`${anahtar}|1`, uret(1)), ses);
  };
  /** Marimba sol önde; sağ 12 ms geride ve %85 (hafif stereo genişlik). */
  const marimbaCal = (t: number, o: Float32Array, g: number, kesim = Infinity) => {
    ekle(sol, t, o, g, kesim);
    ekle(sag, t + 0.012, o, 0.85 * g, kesim);
  };

  const segler = akorSegmentleri(bolumler, secenekler.sonAkorVurusu);

  for (const b of bolumler) {
    const duzen = DUZEN[b.id];
    const bolutler = segler.filter((s) => s.bolum === b.id && !s.kapanisAkoru);
    const nefes = duzen.nefes ? b.son : Infinity;
    const kesim = duzen.nefes ? zaman(b.son) : Infinity;
    const yari = b.ilk + Math.floor((b.son - b.ilk + 1) / 2);

    for (const s of bolutler) {
      const k = duzen.katmanlar[katmanSec(b.id, s.indeks, bolutler.length)];
      const tonlar = AKOR_TONLARI[s.akor];
      const uzun = s.son - s.ilk + 1;
      const t0 = zaman(s.ilk);
      const cresc = (ofset: number) => (k.crescendo ? 0.45 + (0.55 * ofset) / uzun : 1);

      pad(tonlar, t0, uzun * vurusSn + 0.3, k.pad.ses, {
        atak: k.pad.atak,
        parlak: k.pad.parlak,
        baslangic: k.crescendo ? 0.35 : undefined,
      });

      if (k.marimba) {
        const m = k.marimba;
        const ust = tonlar.map((x) => x + 12 * (1 + (m.oktav ?? 0)));
        const adim = m.ritim === "sekizlik" ? 0.5 : 1;
        for (let j = 0; j * adim < uzun; j++) {
          const ofset = j * adim;
          if (m.ritim === "tek-1-3" && ofset % 2 !== 0) continue;
          const v = s.ilk + ofset;
          if ((m.ikinciYari && v < yari) || v >= nefes) continue;
          const sira = m.ritim === "tek-1-3" ? ofset / 2 : j;
          let nota = ust[m.desen[sira % m.desen.length]];
          // Her dördüncü akorda son iki sekizlik yukarı döner (muzik.mjs çeşitlemesi).
          if (m.ritim === "sekizlik" && s.indeks % 4 === 3 && uzun === 4 && j >= 6) nota = ust[3] + (j === 7 ? 2 : 0);
          const vurgu = ofset === 0 ? 1.1 : Number.isInteger(ofset) ? 1 : 0.85;
          const g = m.ses * vurgu * cresc(ofset) * (1 + 0.04 * rastgele());
          const uzunNota = m.ritim === "tek-1-3";
          marimbaCal(zaman(v), marimba(nota, uzunNota ? 1.4 : 0.9, uzunNota ? 0.7 : 1), g, kesim);
        }
      }

      if (k.bas) {
        const kok = tonlar[0] - 24;
        const notalar: [number, number, number, number][] = []; // [ofset, midi, süre vuruş, sönüm]
        if (k.bas.ritim === "kok-besli") {
          notalar.push([0, kok, Math.min(2, uzun), 1]);
          if (uzun > 2) notalar.push([2, kok + 7, uzun - 2, 1]);
        } else if (k.bas.ritim === "sekizlik") {
          for (let j = 0; j < uzun * 2; j++) notalar.push([j / 2, kok + (j % 2 ? 12 : 0), 0.5, 2.5]);
        } else notalar.push([0, kok, uzun, 1]);
        for (const [ofset, midi, sure, sonum] of notalar) {
          const v = s.ilk + ofset;
          if (v >= nefes) continue;
          const g = k.bas.ses * (ofset === 0 ? 1 : Number.isInteger(ofset) ? 0.9 : 0.75);
          const o = basSesi(midi, sure * vurusSn, sonum);
          ekle(sol, zaman(v), o, g, kesim);
          ekle(sag, zaman(v), o, g, kesim);
        }
      }

      if (k.kick) {
        for (let ofset = 0; ofset < uzun; ofset += k.kick.ritim === "1-3" ? 2 : 1) {
          const v = s.ilk + ofset;
          if (v >= nefes) continue;
          ekle(sol, zaman(v), kickSablon, k.kick.ses, kesim);
          ekle(sag, zaman(v), kickSablon, k.kick.ses, kesim);
        }
      }

      if (k.shaker) {
        for (let j = 0; j < uzun * 2; j++) {
          const v = s.ilk + j / 2;
          if (v >= nefes) continue;
          const g = k.shaker.ses * (j % 2 ? 1 : 0.55);
          ekle(sol, zaman(v), shaker(), g, kesim);
          ekle(sag, zaman(v) + 0.005, shaker(), g, kesim);
        }
      }

      if (k.zil && s.ilk < nefes) {
        const o = zil(tonlar[0] + 24);
        ekle(sag, t0, o, k.zil.ses);
        ekle(sol, t0 + 0.012, o, 0.85 * k.zil.ses);
      }
    }

    // Nefes: son vuruş yalnız pad; sonraki bölümün ilk akoruna ters şişen pad inişi hazırlar.
    if (duzen.nefes) {
      const sonraki = segler.find((s) => s.ilk === b.son + 1);
      if (sonraki) pad(AKOR_TONLARI[sonraki.akor], zaman(b.son), vurusSn, MIKS.nefesSes, { ters: true, parlak: 0.3 });
    }
  }

  const son: AkorSegmenti | undefined = segler.find((s) => s.kapanisAkoru);
  if (son) {
    const t0 = zaman(son.ilk);
    const kalan = sureSn - t0;
    const bas = basSesi(SON_AKOR.bas, kalan, 0.3);
    ekle(sol, t0, bas, SON_AKOR.basSes);
    ekle(sag, t0, bas, SON_AKOR.basSes);
    pad(SON_AKOR.pad, t0, kalan, SON_AKOR.padSes, { atak: 0.12, birak: 0.05 });
    SON_AKOR.rulo.forEach((m, i) => {
      const t = t0 + i * SON_AKOR.ruloAraSn;
      marimbaCal(t, marimba(m, sureSn - t, 0.3), SON_AKOR.ruloSes);
    });
  }

  // Giriş/çıkış zarfı, sonra tepe −3 dBFS'e.
  const girisN = Math.round(MIKS.girisSn * sr), cikisN = Math.round(MIKS.cikisSn * sr);
  let tepe = 0;
  for (let i = 0; i < N; i++) {
    let z = Math.min(1, i / girisN);
    const kalanN = N - 1 - i;
    if (kalanN < cikisN) z *= 0.5 * (1 - Math.cos((Math.PI * kalanN) / cikisN));
    sol[i] *= z;
    sag[i] *= z;
    tepe = Math.max(tepe, Math.abs(sol[i]), Math.abs(sag[i]));
  }
  const kazanc = tepe > 0 ? 10 ** (MIKS.tepeDbfs / 20) / tepe : 0;
  for (let i = 0; i < N; i++) {
    sol[i] *= kazanc;
    sag[i] *= kazanc;
  }
  return { sol, sag };
}

/** 16 bit PCM stereo WAV; örnekler olduğu gibi yazılır (ek kazanç yok, ±1'de kırpılır). */
export function stereoWavYaz(iz: StereoIz, sr = ORNEKLEME): Buffer {
  const N = iz.sol.length;
  if (iz.sag.length !== N) throw new Error("kanal uzunlukları farklı");
  const buf = Buffer.alloc(44 + N * 4);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + N * 4, 4);
  buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(sr, 24);
  buf.writeUInt32LE(sr * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(N * 4, 40);
  const q = (x: number) => Math.max(-32768, Math.min(32767, Math.round(x * 32767)));
  for (let i = 0; i < N; i++) {
    buf.writeInt16LE(q(iz.sol[i]), 44 + i * 4);
    buf.writeInt16LE(q(iz.sag[i]), 46 + i * 4);
  }
  return buf;
}
