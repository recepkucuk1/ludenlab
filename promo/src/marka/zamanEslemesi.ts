import type { SesOlayi } from "./olaylar.ts";
import { BOLUMLER_169, BOLUMLER_916, kare, toplamKare } from "./zaman.ts";

// 9:16 kesim (30 sn) 16:9 filmin (60 sn) fonksiyonunu yeniden kullanır: 9:16 karesinden 16:9 karesine
// parçalı doğrusal bir ZAMAN EŞLEMESİ. Hızlandırılmış parçalar (2×) ve birkaç sıçrama var; atlanan
// içeriği sonraki adımdaki öğe süzgeci gizler. Vuruş başına 18 kare olduğundan kare eşlemesi tam sayıdır.

/** Bir eşleme parçası. Tüm aralıklar vuruş cinsinden, yarı açık: [bas, son). 1'den sayılır (zaman.ts ile aynı). */
export type Esleme = {
  bas916: number;
  son916: number;
  bas169: number;
  son169: number;
  /** 16:9 vuruşu / 9:16 vuruşu: 1 = gerçek hız, 2 = iki kat hızlı. */
  hiz: number;
};

const parca = (bas916: number, son916: number, bas169: number, son169: number): Esleme => ({
  bas916,
  son916,
  bas169,
  son169,
  hiz: (son169 - bas169) / (son916 - bas916),
});

/** 9:16 ← 16:9 parçaları; 9:16 tarafında bitişik ([1,51)), 16:9 tarafında kesin artan. */
export const ESLEME_916: readonly Esleme[] = [
  parca(1, 5, 1, 5), //    1×  Kanca: düşüş, iniş, başlık
  parca(5, 7, 5, 9), //    2×  Kanca etiketleri v5,6,7 → 5, 5.5, 6
  parca(7, 15, 9, 25), //  2×  Yük
  parca(15, 19, 25, 29), // 1×  Dönüş: tabla + cümle
  parca(19, 21, 29, 33), // 2×  künye + çipler
  parca(21, 23, 33, 35), // 1×  Studio: tabla, kilit, kitle
  parca(23, 24, 35, 37), // 2×
  parca(24, 29, 41, 46), // 1×  Studio kartı açılır (A: 37→41)
  parca(29, 32, 53, 56), // 1×  Atölye: tabla, kilit, kitle, MEB (B: 46→53)
  parca(32, 34, 61, 63), // 1×  Atölye kartı (C: 56→61)
  parca(34, 37, 63, 69), // 2×  TASLAK damgası v65→35, "Son söz" v66→35.5
  parca(37, 40, 73, 76), // 1×  Çocuk: tabla + başlık (D: 69→73)
  parca(40, 43, 76, 82), // 2×  hedef etiketleri v77–79 → 40.5, 41, 41.5
  parca(43, 47, 85, 93), // 2×  halkalar + Kapanış başlığı (E: 82→85)
  parca(47, 51, 93, 97), // 1×  logo v93→47, slogan, buton v96→50
];

const KARE_916 = toplamKare(BOLUMLER_916);
/** 16:9 filmin son vuruşundan sonraki vuruş (yarı açık üst sınır). */
const SON_169 = BOLUMLER_169[BOLUMLER_169.length - 1].son + 1;

/** 9:16 karesinin (0…899) gösterdiği 16:9 karesi. Alan dışı kareler uçlara sıkışır. Tam sayı döner (hız 1 ya da 2). */
export function kare169(f916: number): number {
  const f = Math.min(Math.max(f916, 0), KARE_916 - 1);
  const p = ESLEME_916.find((x) => f < kare(x.son916))!;
  return kare(p.bas169) + (f - kare(p.bas916)) * p.hiz;
}

const parca169 = (v169: number) => ESLEME_916.find((x) => v169 >= x.bas169 && v169 < x.son169);

/** 16:9 vuruşunun 9:16 vuruşu (kesirli olabilir); vuruş atlanan bir aralığa düşüyorsa null. Sınırlar yarı açık. */
export function vurus916(v169: number): number | null {
  const p = parca169(v169);
  return p ? p.bas916 + (v169 - p.bas169) / p.hiz : null;
}

/** Atlanan 16:9 vuruş aralıkları, yarı açık [bas, son): parçalar arası boşluklar + film sonu. */
export const ATLANAN_169: readonly { bas: number; son: number }[] = (() => {
  const boslar: { bas: number; son: number }[] = [];
  let onceki = 1;
  for (const p of ESLEME_916) {
    if (p.bas169 > onceki) boslar.push({ bas: onceki, son: p.bas169 });
    onceki = p.son169;
  }
  if (onceki < SON_169) boslar.push({ bas: onceki, son: SON_169 });
  return boslar;
})();

/** 16:9 vuruşu 9:16'da hiç gösterilmiyor mu (atlanan aralıkta)? */
export const atlandi169 = (v169: number) => v169 >= 1 && v169 < SON_169 && parca169(v169) === undefined;

/**
 * Tutulan parçaların içinde olduğu halde 9:16'da gizlenen öğelerin 16:9 vuruşları (kart etiketi tıkları);
 * efekt izi bunların seslerini düşürür.
 */
export const GIZLI_SES_169: readonly number[] = [44, 45, 67, 68];

/**
 * 16:9 efekt olaylarından 9:16 efekt olayları: vuruş eşlemeden geçer, atlanan ve gizli öğelerin sesleri düşer,
 * süreli seslerin `vurusSure`'si olayın başladığı parçanın hızıyla ölçeklenir. Vuruş sırasıyla döner.
 */
export function sesler916(olaylar: readonly SesOlayi[]): SesOlayi[] {
  const cikti: SesOlayi[] = [];
  for (const o of olaylar) {
    if (GIZLI_SES_169.includes(o.vurus)) continue;
    const p = parca169(o.vurus);
    if (!p) continue;
    const yeni: SesOlayi = { ...o, vurus: p.bas916 + (o.vurus - p.bas169) / p.hiz };
    if (o.vurusSure !== undefined) yeni.vurusSure = o.vurusSure / p.hiz;
    cikti.push(yeni);
  }
  return cikti.sort((a, b) => a.vurus - b.vurus);
}
