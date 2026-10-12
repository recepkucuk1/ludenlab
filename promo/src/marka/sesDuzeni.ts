import { VO_IPUCLARI, VO_IPUCLARI_916, voSuresi } from "./seslendirme.ts";
import { FPS, kare } from "./zaman.ts";

// Marka filmi ses düzeni (saf): seslendirme parçalarının kare konumları ve müziğin seslendirme altında kısılması
// (ducking). MarkaFilmi.tsx bu değerleri Remotion'a bağlar; ölçüm ve kazanç ayarı scripts/marka-render.ts'te.

/** Bir seslendirme cümlesinin filmdeki yeri (kare): mp3 `from`'da başlar, `sure` kare sürer. */
export type VoParcasi = { id: string; from: number; sure: number };

const parca = (ip: { id: string; metin: string }, vurus: number): VoParcasi => ({ id: ip.id, from: kare(vurus), sure: Math.ceil(voSuresi(ip) * FPS) });

export const voParcalari = (): VoParcasi[] => VO_IPUCLARI.map((ip) => parca(ip, ip.vurus169));
/** 9:16 kesimin parçaları: aynı kayıtlar (ve 9:16'ya özgüler) 9:16 vuruşunda. */
export const voParcalari916 = (): VoParcasi[] => VO_IPUCLARI_916.map((ip) => parca(ip, ip.vurus916));

export const VO_PARCALARI: readonly VoParcasi[] = voParcalari();
export const VO_PARCALARI_916: readonly VoParcasi[] = voParcalari916();

/**
 * Müziğin tabanı (Remotion `volume` çarpanı), seslendirmeli sürümde cümleler arasında. Cümle dışı müzik anlatıcının
 * (cümle boyunca bütünleşik) yüksekliğinin 8–10 LU altındadır (yalnız müzik: ~10; efektlerle karışım: ~8,5); cümle sürerken ayrıca −6 dB kısılır.
 */
export const MUZIK_TABAN = 0.36;
/** Seslendirmesiz sürümde müzik tek sürekli sestir; efektlerle yaklaşık eşit yükseklikte durur, hiç kısılmaz. */
export const MUZIK_TABAN_VOSUZ = 0.55;
/** Seslendirmenin çarpanı. */
export const VO_SES = 1;
/** Efekt izinin çarpanı; seslendirmeli sürümde anlatıcının altında kalsın diye daha kısık (Kanca/Atölye'de ~3 LU farktı). */
export const EFEKT_SES = 0.9;
export const EFEKT_SES_VO = 0.7;
/** Seslendirme sürerken müzik −6 dB kısılır. */
export const DUCK_DB = -6;
export const DUCK_CARPAN = 10 ** (DUCK_DB / 20);
/** İniş cümleden bu kadar kare önce başlar ve `DUCK_INIS_KARE` sürer; çıkış cümle bitince `DUCK_CIKIS_KARE` sürer. */
export const DUCK_ON_KARE = 4;
export const DUCK_INIS_KARE = 6;
export const DUCK_CIKIS_KARE = 10;

/** Tek cümlenin duck çarpanı: 1 = kısılmamış, `DUCK_CARPAN` = tam kısık. */
function duckCarpani(f: number, p: VoParcasi): number {
  const inisBas = p.from - DUCK_ON_KARE;
  const inisSon = inisBas + DUCK_INIS_KARE;
  const bitis = p.from + p.sure;
  const derinlik = 1 - DUCK_CARPAN;
  if (f <= inisBas || f >= bitis + DUCK_CIKIS_KARE) return 1;
  if (f < inisSon) return 1 - (derinlik * (f - inisBas)) / DUCK_INIS_KARE;
  if (f <= bitis) return DUCK_CARPAN;
  return DUCK_CARPAN + (derinlik * (f - bitis)) / DUCK_CIKIS_KARE;
}

/**
 * Karedeki müzik seviyesi (çarpan). Seslendirme açıkken cümlelerin duck'ı en küçük değerle birleşir:
 * üst üste binen pencereler tabanın altına inmez. Seslendirme kapalıysa müzik `MUZIK_TABAN_VOSUZ`'da sabit kalır.
 * parcalar: biçimin cümleleri (16:9 `VO_PARCALARI`, 9:16 `VO_PARCALARI_916`).
 */
export function muzikSeviyesi(f: number, vo: boolean, parcalar: readonly VoParcasi[] = VO_PARCALARI): number {
  if (!vo) return MUZIK_TABAN_VOSUZ;
  let carpan = 1;
  for (const p of parcalar) carpan = Math.min(carpan, duckCarpani(f, p));
  return MUZIK_TABAN * carpan;
}
