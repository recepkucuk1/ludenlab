import { Easing, interpolate } from "remotion";
import type { V2 } from "./izometri.ts";
import { MODUL_YERI, modulYigini, type KagitGrubu, type ModulId } from "./kagitAkisi.ts";
import type { Kagit } from "./nesneler.ts";
import { COCUK } from "./olaylar.ts";
import { COCUK_YIGIN_YERI } from "./yerlesim.ts";
import { kare } from "./zaman.ts";

// Çocuk (v73–88) ve Kapanış (v89–100) katmanı: incelen modül yığınları, hedef etiketleri, başlıklar, yörüngeler,
// bloğun kesişime akışı, arka planın çekilmesi, künyenin gidişi ve kapanış kartı. Saf: kare (+ kamera) → katman.
// Kamera, tabla ve itme izleri filmDurumu.ts'tedir; burası onları girdi olarak alır.

const ara = (f: number, a: number, b: number, easing: (t: number) => number = (t) => t) =>
  interpolate(f, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });

const K73 = kare(COCUK.tabla);

/** Tabla son çeyreği bu kadar karede döner (önceki dönüşlerle aynı); yığınlar aynı sürede kayar, soluklaştırma kalkar. */
export const DONUS_KARE = 36;
/** Çocuk'ta modül yığını ince bir dosyaya döner: alttaki bu kadar kâğıt kalır (storyboard F10). */
export const INCE_ADET = 3;
/** Kalkan kâğıtlar tepeden başlayarak bu aralıkla (kare) kalkar, KALKIS_KARE'de KALKIS_Z birim yükselip söner. */
const KALKIS_ARA = 3;
const KALKIS_KARE = 14;
const KALKIS_Z = 0.6;

const kaydir = (k: Kagit, dx: number, dy: number, dz = 0): Kagit => ({ ...k, taban: k.taban.map(([x, y]) => [x + dx, y + dy] as V2), z0: k.z0 + dz });

/**
 * Çocuk'un modül yığınları (f ≥ v73). baslangic: v73'ten bir kare önce çizilen kâğıtlar (alttan üste, kâğıt başına
 * opaklık dahil). Alttaki INCE_ADET kâğıt, üstü sekmeli ve yazılı ince yığın olarak kalır; üsttekiler tepeden
 * başlayarak kalkıp söner. Yığın, kalkanlarla birlikte, tabla dönerken MODUL_YERI'nden COCUK_YIGIN_YERI'ne kayar.
 * opaklik: grup opaklığı (odak dışı soluklaştırmanın kalkışı).
 */
export const cocukYiginlari = (f: number, baslangic: Record<ModulId, Kagit[]>, opaklik: Record<ModulId, number>): KagitGrubu[] => {
  // Yığın önce dışa (x, bloktan uzağa) açılır, sonra yanından geçer (y): köşesi bloğun köşesine yaklaşmaz.
  const kaymaX = ara(f, K73, K73 + DONUS_KARE, Easing.out(Easing.cubic));
  const kaymaY = ara(f, K73, K73 + DONUS_KARE, Easing.inOut(Easing.sin));
  const gruplar: KagitGrubu[] = [];
  for (const m of ["studio", "atolye"] as const) {
    const [x0, y0] = MODUL_YERI[m];
    const dx = (COCUK_YIGIN_YERI[m][0] - x0) * kaymaX;
    const dy = (COCUK_YIGIN_YERI[m][1] - y0) * kaymaY;
    gruplar.push({ id: `modul-${m}`, p: [x0 + dx, y0 + dy, 0], kagitlar: modulYigini(m, INCE_ADET).kagitlar.map((k) => kaydir(k, dx, dy)), opaklik: opaklik[m] });
    const kalkanlar = baslangic[m].slice(INCE_ADET);
    kalkanlar.forEach((k, j) => {
      const bas = K73 + KALKIS_ARA * (kalkanlar.length - 1 - j);
      const u = ara(f, bas, bas + KALKIS_KARE);
      const gorunum = (k.opaklik ?? 1) * (1 - Easing.in(Easing.quad)(u));
      if (u >= 1 || gorunum <= 0) return;
      const dz = KALKIS_Z * Easing.out(Easing.cubic)(u);
      gruplar.push({ id: `kalkan-${m}-${j}`, p: [x0 + dx, y0 + dy, k.z0 + dz], kagitlar: [{ ...kaydir(k, dx, dy, dz), opaklik: gorunum }], opaklik: opaklik[m] });
    });
  }
  return gruplar;
};
