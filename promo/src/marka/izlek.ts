import { interpolate } from "remotion";

/** Anahtar kare: f karesinde değer d; bir önceki anahtardan buraya e eğrisiyle gelinir (varsayılan doğrusal). */
export type Anahtar = { f: number; d: number; e?: (t: number) => number };

/** Parça parça geçiş: ilk anahtardan önce ilk değer, sondan sonra son değer. Anahtarlar f'ye göre kesin artan olmalı. */
export const izlek = (anahtarlar: Anahtar[]) => {
  if (anahtarlar.length === 0) throw new Error("izlek: anahtar yok");
  for (let i = 1; i < anahtarlar.length; i++) {
    if (!(anahtarlar[i].f > anahtarlar[i - 1].f)) throw new Error(`izlek: anahtarlar artan değil (${anahtarlar[i].f})`);
  }
  return (f: number): number => {
    if (f <= anahtarlar[0].f) return anahtarlar[0].d;
    for (let i = 1; i < anahtarlar.length; i++) {
      const a = anahtarlar[i - 1];
      const b = anahtarlar[i];
      if (f <= b.f) return interpolate(f, [a.f, b.f], [a.d, b.d], { easing: b.e ?? ((t) => t) });
    }
    return anahtarlar[anahtarlar.length - 1].d;
  };
};
