// apps/hub/evals/lib/seed.ts
import { als } from "./evalContext";

/* Eval sürecinde rastgelelik vakaya göre tohumlanır: kelime bankası seçimi (articulation.selectWords*) ve
   sesletim rotasının ham Math.random'ı aynı vakada her kolda/tekrarda aynı sonucu verir. Tohum = fnv1a(vaka kimliği);
   tekrar numarası tohuma GİRMEZ. Bağlam dışında (vitest, backoff jitter'ı dışarıda) özgün Math.random çalışır. */

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

/** Vaka bağlamındaysa vakanın üretecini (gerekirse kurarak) döner; değilse null. */
export function seededRandom(): (() => number) | null {
  const store = als.getStore();
  if (!store) return null;
  store.rng ??= mulberry32(fnv1a(store.caseId));
  return store.rng;
}

const original = Math.random;

/** `Math.random`'ı ALS-bilinçli sürümle değiştirir; geri alma fonksiyonu döner. İki kez kurulursa ikincisi no-op. */
export function installSeededRandom(): () => void {
  if (Math.random.name === "evalSeededRandom") return () => {};
  const evalSeededRandom = () => (seededRandom() ?? original)();
  Object.defineProperty(evalSeededRandom, "name", { value: "evalSeededRandom" });
  Math.random = evalSeededRandom;
  return () => {
    Math.random = original;
  };
}
