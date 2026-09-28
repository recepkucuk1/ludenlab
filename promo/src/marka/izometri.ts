// İzometrik çizim motoru (LudenMain/video/src/kagit.tsx'ten uyarlandı).
// Dünya birimleri: x sağ-aşağı, y sol-aşağı, z yukarı; izleyici (1,1,1) yönünden bakar.
// Kamera: s = birim başına piksel, (ox, oy) = dünya merkezinin ekrandaki yeri,
// don = tablanın düşey eksen etrafında dönüşü (radyan).
// Pozitif don, +x'i +y'ye doğru çevirir (ekranda tablanın önü sağdan sola kayar).

export type V2 = [number, number];
export type V3 = [number, number, number];
export type Kamera = { s: number; ox: number; oy: number; don: number };
export type Yuz = { ps: V3[]; n: V3 };
export type Boya = { ust: string; sol: string; sag: string };

export const GORUS: V3 = [1, 1, 1];
const C30 = Math.cos(Math.PI / 6);

export const nokta = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const kirp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

export const donZ = (p: V3, a: number): V3 => {
  if (!a) return p;
  const c = Math.cos(a), s = Math.sin(a);
  return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]];
};

export const izd = (p: V3, k: Kamera): V2 => {
  const q = donZ(p, k.don);
  return [k.ox + (q[0] - q[1]) * C30 * k.s, k.oy + (q[0] + q[1]) * 0.5 * k.s - q[2] * k.s];
};

const f1 = (v: number) => v.toFixed(1);
/** Dünya noktalarından kapalı SVG yolu. */
export const yol = (ps: V3[], k: Kamera) => ps.map((p, i) => (i ? "L" : "M") + izd(p, k).map(f1).join(" ")).join("") + "Z";
/** Ekran noktalarından kapalı SVG yolu. */
export const yol2 = (ps: V2[]) => ps.map((p, i) => (i ? "L" : "M") + p.map(f1).join(" ")).join("") + "Z";

/** Yatay tabandan (z0) h kadar yükselen prizma: üst yüz + yan yüzler (alt yüz hiç görünmez, üretilmez). */
export const prizma = (taban: V2[], z0: number, h: number): Yuz[] => {
  const n = taban.length;
  const cx = taban.reduce((s, p) => s + p[0], 0) / n, cy = taban.reduce((s, p) => s + p[1], 0) / n;
  const alt: V3[] = taban.map(([x, y]) => [x, y, z0]);
  const ust: V3[] = taban.map(([x, y]) => [x, y, z0 + h]);
  const yuzler: Yuz[] = [{ ps: ust, n: [0, 0, 1] }];
  for (let i = 0; i < n; i++) {
    const a = taban[i], b = taban[(i + 1) % n];
    let nx = b[1] - a[1], ny = -(b[0] - a[0]);
    const L = Math.hypot(nx, ny) || 1;
    nx /= L;
    ny /= L;
    if (nx * ((a[0] + b[0]) / 2 - cx) + ny * ((a[1] + b[1]) / 2 - cy) < 0) {
      nx = -nx;
      ny = -ny;
    }
    yuzler.push({ ps: [alt[i], alt[(i + 1) % n], ust[(i + 1) % n], ust[i]], n: [nx, ny, 0] });
  }
  return yuzler;
};

/** Noktayı orijin etrafında sırayla x, y, z eksenlerinde döndürür (radyan). */
export const dondur3 = (p: V3, [ax, ay, az]: V3): V3 => {
  let [x, y, z] = p;
  [y, z] = [y * Math.cos(ax) - z * Math.sin(ax), y * Math.sin(ax) + z * Math.cos(ax)];
  [x, z] = [x * Math.cos(ay) + z * Math.sin(ay), -x * Math.sin(ay) + z * Math.cos(ay)];
  [x, y] = [x * Math.cos(az) - y * Math.sin(az), x * Math.sin(az) + y * Math.cos(az)];
  return [x, y, z];
};

const KUP_YUZLERI: [number, number, number, number, V3][] = [
  [0, 1, 2, 3, [0, 0, -1]],
  [4, 5, 6, 7, [0, 0, 1]],
  [0, 1, 5, 4, [0, -1, 0]],
  [1, 2, 6, 5, [1, 0, 0]],
  [2, 3, 7, 6, [0, 1, 0]],
  [3, 0, 4, 7, [-1, 0, 0]],
];

/** m merkezli, a kenarlı küp; istenirse merkezi etrafında döndürülür. */
export const kup = (m: V3, a: number, aci: V3 = [0, 0, 0]): Yuz[] => {
  const h = a / 2;
  const koseler = ([[-h, -h, -h], [h, -h, -h], [h, h, -h], [-h, h, -h], [-h, -h, h], [h, -h, h], [h, h, h], [-h, h, h]] as V3[]).map((p) => {
    const q = dondur3(p, aci);
    return [q[0] + m[0], q[1] + m[1], q[2] + m[2]] as V3;
  });
  return KUP_YUZLERI.map(([i, j, k, l, n]) => ({ ps: [koseler[i], koseler[j], koseler[k], koseler[l]], n: dondur3(n, aci) }));
};

/** Yüz, tabla dönüşüyle birlikte izleyiciye bakıyor mu. */
export const gorunur = (y: Pick<Yuz, "n">, k: Kamera) => nokta(donZ(y.n, k.don), GORUS) > 1e-6;
export const ustMu = (y: Pick<Yuz, "n">, k: Kamera) => donZ(y.n, k.don)[2] > 0.8;

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
export const karistir = (a: string, b: string, t: number) => {
  const [x, y] = [hex(a), hex(b)];
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(",")})`;
};

/** Üst yüz en açık; yanlar yöne göre sağ (+x) ile sol (+y) boyası arasında. */
export const yuzRengi = (y: Yuz, k: Kamera, b: Boya) => {
  if (ustMu(y, k)) return b.ust;
  const n = donZ(y.n, k.don);
  return karistir(b.sag, b.sol, kirp((n[1] - n[0] + 1) / 2));
};

/** Dışbükey kabuk (monoton zincir). */
export const kabuk = (ps: V2[]): V2[] => {
  const p = [...ps].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cap = (o: V2, a: V2, b: V2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const alt: V2[] = [], ust: V2[] = [];
  for (const q of p) {
    while (alt.length >= 2 && cap(alt[alt.length - 2], alt[alt.length - 1], q) <= 0) alt.pop();
    alt.push(q);
  }
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (ust.length >= 2 && cap(ust[ust.length - 2], ust[ust.length - 1], q) <= 0) ust.pop();
    ust.push(q);
  }
  ust.pop();
  alt.pop();
  return alt.concat(ust);
};

/** Yuvarlak köşeli dikdörtgen taban (x0..x1, y0..y1, köşe yarıçapı r). */
export const yuvarlakTaban = (x0: number, y0: number, x1: number, y1: number, r: number, adim = 8): V2[] => {
  const koseler: [number, number, number][] = [
    [x1 - r, y0 + r, -90],
    [x1 - r, y1 - r, 0],
    [x0 + r, y1 - r, 90],
    [x0 + r, y0 + r, 180],
  ];
  const ps: V2[] = [];
  for (const [kx, ky, a0] of koseler)
    for (let i = 0; i <= adim; i++) {
      const a = ((a0 + (i * 90) / adim) * Math.PI) / 180;
      ps.push([kx + r * Math.cos(a), ky + r * Math.sin(a)]);
    }
  return ps;
};

/** (cx, cy) merkezli, w × d boyutlu, aci kadar dönmüş dikdörtgen taban. Köşe sırası: sol-üst, sağ-üst, sağ-alt, sol-alt. */
export const dikdortgenTaban = (cx: number, cy: number, w: number, d: number, aci = 0): V2[] => {
  const c = Math.cos(aci), s = Math.sin(aci);
  return ([[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]] as V2[]).map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c]);
};

/** Ressam sıralaması için anahtar: büyük olan sonra (önde) çizilir. */
export const derinlik = (p: V3, k: Kamera) => {
  const q = donZ(p, k.don);
  return q[0] + q[1] + 0.3 * q[2];
};

/** 64'lük (kutu) yerel çizimi p0 (sol üst), pu (sağ üst), pv (sol alt) köşeli yüze basan SVG transform'u. */
export const yuzMatrisi = (p0: V3, pu: V3, pv: V3, k: Kamera, kutu = 64) => {
  const [a, b, c] = [izd(p0, k), izd(pu, k), izd(pv, k)];
  const m = [(b[0] - a[0]) / kutu, (b[1] - a[1]) / kutu, (c[0] - a[0]) / kutu, (c[1] - a[1]) / kutu, a[0], a[1]];
  return `matrix(${m.map((v) => v.toFixed(4)).join(" ")})`;
};
