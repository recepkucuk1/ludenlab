import { Easing, interpolate } from "remotion";
import type { FilmDurumu, KartDurumu } from "./filmDurumu.ts";
import { filmDurumu, zeminIsigi, zeminKaymasi } from "./filmDurumu.ts";
import { ERKEN, modulKatmani } from "./moduller.ts";
import { ATOLYE, STUDIO } from "./olaylar.ts";
import { KAPANIS_916, KAPANIS_916_SAHNEDE } from "./yerlesim916.ts";
import { BOLUMLER_916, kare, toplamKare } from "./zaman.ts";
import { kare169, vurus916 } from "./zamanEslemesi.ts";

// 9:16 kesimin durumu: 16:9 filmin durumu zaman eşlemesinden (kare169) geçer, sonra süzülür. Saf: 9:16 karesi →
// durum. Hangi bölgenin nereye çizildiği yerlesim916.ts'te, çizim FilmSahnesi916'da (FilmSahnesi.tsx).

/** Gizlenen etiketler (spec "Tek açılım"): Studio alan etiketleri (dil, konuşma, işitme) ve kart etiketleri, MEB
 *  basamak çipleri (modül, bölüm, hedef), Atölye kart etiketleri. Sıçramaları dikişsiz kılan da budur. */
export const gizliEtiket = (id: string) => /^(studio|studio-kart|basamak|atolye-kart)-\d+$/.test(id);
/** Gizlenen metinler: iki araçlar satırı. */
export const GIZLI_METINLER: readonly string[] = ["studio-araclar", "atolye-araclar"];

const K48 = kare(STUDIO.cevir[0]);
/** Studio destesi ilk çevirmeden hemen önce: Artikülasyon kartı önde. */
const CEVRILMEMIS_DESTE: readonly KartDurumu[] = modulKatmani(K48).kartlar.filter((k) => k.id.startsWith("studio-"));
/** B sıçramasının (16:9 v46 → v53) 9:16 karesi. */
const B_916 = kare(vurus916(ATOLYE.tabla)!);

/** 16:9 karesinin sıçradığı 9:16 kareleri (A–E: bir önceki kareden 2'den fazla ileri). */
const SICRAMALAR_916: readonly number[] = Array.from({ length: toplamKare(BOLUMLER_916) - 1 }, (_, i) => i + 1).filter((f) => kare169(f) - kare169(f - 1) > 2);
/** Sıçramadaki itme basamağı bu kadar karede erir (0,6 sn). */
export const ITME_ERIME = 18;
/** Her sıçramanın itme basamağı (16:9'da sıçramadan sonraki ve önceki karelerin itme farkı); ilk kullanımda bir kez hesaplanır. */
let basamaklar: { j: number; fark: number }[] | null = null;
const itmeBasamaklari = () => {
  if (!basamaklar) basamaklar = SICRAMALAR_916.map((j) => ({ j, fark: filmDurumu(kare169(j)).itme - filmDurumu(kare169(j - 1)).itme }));
  return basamaklar;
};
/**
 * Sıçramalarda kamera ve tabla aynı kalır, yalnız yavaş itme atlar (en çok E: 0,984 → 0,973, tablanın kenarında ~10 px).
 * Basamak ITME_ERIME karede erir: sıçrama karesinde itme önceki karedeki değerinde kalır, pencere boyunca filmin kendi
 * itmesine yumuşakça (sinüs) kavuşur. Pencereler dönüşümden (9:16 828) önce biter: halka ve blok hedefleri etkilenmez.
 */
const itmeErimesi = (f: number) =>
  itmeBasamaklari().reduce(
    (t, { j, fark }) =>
      f >= j && f < j + ITME_ERIME
        ? t + fark * (1 - interpolate(f, [j, j + ITME_ERIME], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.sin) }))
        : t,
    0,
  );

/** 16:9 durumu (d = filmDurumu(kare169(f))) → 9:16 durumu. f: 9:16 karesi. */
export const suz916 = (d: FilmDurumu, f: number): FilmDurumu => {
  const g = kare169(f);
  // Studio destesi 9:16'da hiç çevrilmez (v48 ve v50 B sıçramasında kalır): kartlar B'den sonra çıkarken çevrilmemiş
  // deste o anki çıkışıyla çizilir; ön kart sıçramada değişmez.
  let kartlar = d.kartlar;
  const studio = kartlar.filter((k) => k.id.startsWith("studio-"));
  if (g >= K48 && studio.length > 0) {
    const cikis = studio[0].cikis;
    kartlar = [...CEVRILMEMIS_DESTE.map((k) => ({ ...k, cikis })), ...kartlar.filter((k) => !k.id.startsWith("studio-"))];
  }
  // Studio kilidi 16:9'da Atölye'den ERKEN kare önce (K53 − 6) çıkmaya başlar; o an B sıçramasının içindedir. 9:16'da
  // çıkış sıçramadan ERKEN kare önce başlar ve sıçramada 16:9'un değerine (0,5) varır.
  const kilitler = d.kilitler.map((k) => (k.id === "kilit-studio" && f >= B_916 - ERKEN && f < B_916 ? { ...k, cikis: (f - (B_916 - ERKEN)) / 12 } : k));
  // Kapanış kartı 9:16 yerleşiminde (animasyon değerleri aynen).
  const kapanis = d.kapanis && {
    ...d.kapanis,
    logo: { ...d.kapanis.logo, ...KAPANIS_916.logo },
    slogan: { ...d.kapanis.slogan, top: KAPANIS_916.slogan.top },
    cagri: { ...d.kapanis.cagri, top: KAPANIS_916.cagri },
  };
  return {
    ...d,
    itme: d.itme - itmeErimesi(f),
    // Zemin 9:16 karesiyle akar: sıçramada ızgara ve ışık sıçramaz, 2× parçada hızlanmaz.
    kayma: zeminKaymasi(f),
    isik: zeminIsigi(f),
    etiketler: d.etiketler.filter((e) => !gizliEtiket(e.id)),
    metinler: d.metinler.filter((m) => !GIZLI_METINLER.includes(m.id)),
    kartlar,
    kilitler,
    kapanis,
  };
};

/** 9:16 karesinin (0…899) durumu; kapanış halkaları 9:16 logosuna oturur. */
export const durum916 = (f: number): FilmDurumu => suz916(filmDurumu(kare169(f), KAPANIS_916_SAHNEDE), f);
