import type { articulation } from "@ludenlab/ai";

/*
 * Tohumlu kelime seçimi — modeller arası adil karşılaştırma için.
 *
 * Üretimde `selectWordsMulti` Math.random kullanır; aynı vakada iki model farklı kelimeler
 * alırsa kalite farkı kelimelerden de gelebilir. Tohum yalnız seçim argümanlarından türetilir:
 * aynı vaka → her modelde ve her tekrarda AYNI kelimeler; seçim algoritması üretimdekiyle aynı.
 */

type SelectWordsMulti = typeof articulation.selectWordsMulti;

function fnv1a(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Üretimdeki seçim fonksiyonunu, argümanlardan tohumlanmış rng ile saran sürüm. */
export function seeded(original: SelectWordsMulti): SelectWordsMulti {
  return (bank, sounds, positions, count) =>
    original(bank, sounds, positions, count, mulberry32(fnv1a(JSON.stringify([sounds, positions, count]))));
}
