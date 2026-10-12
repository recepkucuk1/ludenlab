// apps/hub/evals/lib/seed.ts
import { als } from "./evalContext";

/* Eval sürecinde rastgelelik vakaya göre tohumlanır: kelime bankası seçimi (articulation.selectWords*) ve
   sesletim rotasının ham Math.random'ı aynı vakada her kolda/tekrarda aynı sonucu verir. Tohum = fnv1a(seedKey ?? vaka kimliği);
   tekrar numarası tohuma GİRMEZ. Bağlam dışında (vitest) özgün Math.random çalışır.
   DİKKAT: core.ts `withBackoff` jitter'ı vaka bağlamının İÇİNDE çalışır (shim → requireStore, hakem → als.run); jitter
   Math.random kullansaydı banka kelimeleri seçildikten sonra tohumlu akımı tüketir, yeniden deneme sayısı sonraki
   çekimleri kaydırırdı. Bu yüzden jitter node:crypto `randomInt` kullanır ve akıma dokunmaz. */

export function fnv1a(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Vaka bağlamındaysa vakanın üretecini (gerekirse kurarak) döner; değilse null. Tohum: `seedKey` varsa o, yoksa vaka kimliği. */
export function seededRandom(): (() => number) | null {
  const store = als.getStore();
  if (!store) return null;
  store.rng ??= mulberry32(fnv1a(store.seedKey ?? store.caseId));
  return store.rng;
}

const original = Math.random;
let installed: (() => number) | null = null;

/** `Math.random`'ı ALS-bilinçli sürümle değiştirir; geri alma fonksiyonu döner. Zaten kuruluysa (kimlikle) ikincisi no-op.
    Geri alma yalnız `Math.random` hâlâ bu kurulumun kendi fonksiyonuysa yapılır (sonradan konan spy ezilmez). */
export function installSeededRandom(): () => void {
  if (installed !== null && Math.random === installed) return () => {};
  const evalSeededRandom = () => (seededRandom() ?? original)();
  installed = evalSeededRandom;
  Math.random = evalSeededRandom;
  return () => {
    if (Math.random === evalSeededRandom) Math.random = original;
    if (installed === evalSeededRandom) installed = null;
  };
}
