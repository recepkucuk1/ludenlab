import { Easing, interpolate } from "remotion";
import type { ArkaCekilme, BlokIzi, EtiketDurumu, KapanisDurumu, MetinDurumu, YorungeCizimi, YorungeKirpmasi } from "./durumTipleri.ts";
import { izd, type Kamera, type V2, type V3 } from "./izometri.ts";
import { MODUL_YERI, modulYigini, type KagitGrubu, type ModulId } from "./kagitAkisi.ts";
import { HEDEFLER, METIN } from "./metin.ts";
import type { Kagit } from "./nesneler.ts";
import { COCUK, KAPANIS } from "./olaylar.ts";
import { CIZGI, LOGO_VIEWBOX, RENK } from "./tema.ts";
import { COCUK_YIGIN_YERI, HEDEF_YERLESIMI, KAPANIS_YERI, type LogoYeri } from "./yerlesim.ts";
import { ISARET, YORUNGE, elipsDonusumu, halkaAElipsi, halkaANoktalari, halkaBElipsi, halkaBNoktalari, kosular, type Elips } from "./yorunge.ts";
import { BOLUMLER_169, kare, toplamKare } from "./zaman.ts";

// Çocuk (v73–88) ve Kapanış (v89–100) katmanı: incelen modül yığınları, hedef etiketleri, başlıklar, yörüngeler,
// bloğun kesişime akışı, arka planın çekilmesi, künyenin gidişi ve kapanış kartı. Saf: kare (+ kamera) → katman.
// Kamera, tabla ve itme izleri filmDurumu.ts'tedir; burası onları girdi olarak alır.

const ara = (f: number, a: number, b: number, easing: (t: number) => number = (t) => t) =>
  interpolate(f, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const K73 = kare(COCUK.tabla);
const K85 = kare(COCUK.yorunge);
const K88 = kare(COCUK.baslikCikis);
const K89 = kare(KAPANIS.cekilme);
const K90 = kare(KAPANIS.dikey);
const K92 = kare(KAPANIS.kunye);
const K93 = kare(KAPANIS.donusum);
const K94 = kare(KAPANIS.logo);
const K95 = kare(KAPANIS.slogan);
const K96 = kare(KAPANIS.dugme);
const SON_KARE = toplamKare(BOLUMLER_169) - 1;

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
 * soluk: odak dışı soluklaştırmanın kalkışı (grup rengi; kalkan kâğıtların sönüşü kâğıt başına saydamlıktır).
 */
export const cocukYiginlari = (f: number, baslangic: Record<ModulId, Kagit[]>, soluk: Record<ModulId, number>): KagitGrubu[] => {
  // Yığın önce dışa (x, bloktan uzağa) açılır, sonra yanından geçer (y): köşesi bloğun köşesine yaklaşmaz.
  const kaymaX = ara(f, K73, K73 + DONUS_KARE, Easing.out(Easing.cubic));
  const kaymaY = ara(f, K73, K73 + DONUS_KARE, Easing.inOut(Easing.sin));
  const gruplar: KagitGrubu[] = [];
  for (const m of ["studio", "atolye"] as const) {
    const [x0, y0] = MODUL_YERI[m];
    const dx = (COCUK_YIGIN_YERI[m][0] - x0) * kaymaX;
    const dy = (COCUK_YIGIN_YERI[m][1] - y0) * kaymaY;
    gruplar.push({ id: `modul-${m}`, p: [x0 + dx, y0 + dy, 0], kagitlar: modulYigini(m, INCE_ADET).kagitlar.map((k) => kaydir(k, dx, dy)), soluk: soluk[m] });
    const kalkanlar = baslangic[m].slice(INCE_ADET);
    kalkanlar.forEach((k, j) => {
      const bas = K73 + KALKIS_ARA * (kalkanlar.length - 1 - j);
      const u = ara(f, bas, bas + KALKIS_KARE);
      const gorunum = (k.opaklik ?? 1) * (1 - Easing.in(Easing.quad)(u));
      if (u >= 1 || gorunum <= 0) return;
      const dz = KALKIS_Z * Easing.out(Easing.cubic)(u);
      gruplar.push({ id: `kalkan-${m}-${j}`, p: [x0 + dx, y0 + dy, k.z0 + dz], kagitlar: [{ ...kaydir(k, dx, dy, dz), opaklik: gorunum }], soluk: soluk[m] });
    });
  }
  return gruplar;
};

/** Açılışın hedef etiketi gibi: çip 18 karede netleşir, çizgi son 10 karede hızlanarak vuruşunda raptiyeye varır. */
const vurusEtiketi = (f: number, v: number, cikisKare: number, e: Omit<EtiketDurumu, "gorunum" | "ilerleme" | "cikis">): EtiketDurumu | null => {
  const k = kare(v);
  if (f < k - 24) return null;
  const cikis = ara(f, cikisKare, cikisKare + 12);
  if (cikis >= 1) return null;
  return { ...e, gorunum: ara(f, k - 24, k - 6, Easing.out(Easing.quad)), ilerleme: ara(f, k - 10, k, Easing.in(Easing.quad)), cikis };
};

const BASLIK = { top: 360, font: "baslik" as const, boyut: 104, agirlik: 800, renk: RENK.teal, opaklik: 1 };

/** Logo viewBox noktası → ekran (logo: kilidin ekrandaki yeri). */
const logoNoktasi = (logo: LogoYeri, [x, y]: V2): V2 => {
  const k = logo.w / LOGO_VIEWBOX.w;
  return [logo.x + x * k, logo.y + y * k];
};
/** Logo viewBox'taki elips → ekran elipsi. */
const logoElipsi = (logo: LogoYeri, e: Elips): Elips => {
  const k = logo.w / LOGO_VIEWBOX.w;
  const [cx, cy] = logoNoktasi(logo, [e.cx, e.cy]);
  return { cx, cy, a: e.a * k, b: e.b * k, aci: e.aci };
};

export type Sahne = { kamera: Kamera; itme: number; odak: V2 };
/** Ekran noktası → kamera kapsayıcısı (itme odak etrafında ölçekler; kapsayıcıda çizilen şey ekranda buraya düşer). */
const kapsayiciya = (s: Sahne, [x, y]: V2): V2 => [s.odak[0] + (x - s.odak[0]) / s.itme, s.odak[1] + (y - s.odak[1]) / s.itme];
const kapsayiciElipsi = (s: Sahne, e: Elips): Elips => {
  const [cx, cy] = kapsayiciya(s, [e.cx, e.cy]);
  return { cx, cy, a: e.a / s.itme, b: e.b / s.itme, aci: e.aci };
};

/** Noktalar boyunca (ilk nokta hariç) en az `uzunluk` px ilerleyen ilk noktalar: ön koşunun dolgusu komşu koşuya bu
 *  kadar taşar ve ek yerindeki kılıf ucunu (yarıçap dolgu/2 + CIZGI.ince) örter. Parçalar elipsin uzun ekseninin
 *  ucunda (ön/arka sınırı hep oradadır) 2 px'e kadar kısalır; bu yüzden taşma parça sayısıyla değil uzunlukla ölçülür. */
const tasan = (ps: V2[], uzunluk: number): V2[] => {
  const out: V2[] = [];
  let yol = 0;
  for (let i = 1; i < ps.length && yol < uzunluk; i++) {
    yol += Math.hypot(ps[i][0] - ps[i - 1][0], ps[i][1] - ps[i - 1][1]);
    out.push(ps[i]);
  }
  return out;
};

/** Halka dönüşümü (0 → 1): iki halka logo işaretinin yörüngelerine oturur. */
const donusum = (f: number) => ara(f, K93, K95, Easing.inOut(Easing.cubic));

/**
 * Halkaların işarete teslimi. İşaretin yörüngeleri değişken kalınlıkta (ince yerlerde 2–3 px), halkalar tekdüze (~10,7 px):
 * halka sönerken ince yerlerde işaretin dışına taşan kısmı açık turuncu bir hale olarak görünüyordu. Halkalar hedefe
 * (K95) opak varır; KIRPMA_BAS'tan K95'e dek logo işaretinin genişletilmiş hâline kırpılır, genişleme halkanın hedefe
 * kalan uzaklığı + yarım kalınlıktan (hiçbir yeri kesmez) 0'a (tam işaret) iner: taşan kısım kare kare incelir, tek
 * karede kopmaz. K95'ten SONUS_BITIS'e dek halkalar tam işaretin içinde söner (logo kilidi netleşirken, K95 + 4):
 * işaretin dışına hiç boyamaz, içinde renkleri işaretinkiyle aynı.
 */
export const KIRPMA_BAS = K94 + 10;
export const SONUS_BITIS = K95 + 4;

const yorungeler = (f: number, s: Sahne, logo: LogoYeri): YorungeCizimi[] => {
  if (f < K85) return [];
  const opaklik = 1 - ara(f, K95, SONUS_BITIS);
  if (opaklik <= 0) return [];
  const u = donusum(f);
  const egim = YORUNGE.egim * ara(f, K90, K92, Easing.inOut(Easing.cubic));
  const kalinlik = lerp(YORUNGE.kalinlik, (ISARET.kalinlik * logo.w) / LOGO_VIEWBOX.w / s.itme, u);
  const kilif = 1 - ara(f, K93, K93 + 18);
  const halkalar: { id: string; noktalar: V3[]; kaynak: Elips; hedef: Elips }[] = [
    { id: "a", noktalar: halkaANoktalari(ara(f, K85, K90, Easing.inOut(Easing.sin))), kaynak: halkaAElipsi(s.kamera), hedef: logoElipsi(logo, ISARET.genis) },
  ];
  if (f >= K90) halkalar.push({ id: "b", noktalar: halkaBNoktalari(egim), kaynak: halkaBElipsi(egim, s.kamera), hedef: logoElipsi(logo, ISARET.dikey) });
  // İşaretin (logo viewBox) kamera kapsayıcısına dönüşümü: halka hedefleriyle aynı yol (logoNoktasi → kapsayiciya).
  const [kx, ky] = kapsayiciya(s, logoNoktasi(logo, [0, 0]));
  const kirpmaOlcegi = logo.w / LOGO_VIEWBOX.w / s.itme;
  const daralma = ara(f, KIRPMA_BAS, K95);
  const cizimler: YorungeCizimi[] = [];
  for (const h of halkalar) {
    if (h.noktalar.length < 2) continue;
    const hedef = kapsayiciElipsi(s, h.hedef);
    const tasi = u > 0 ? elipsDonusumu(h.kaynak, hedef, u) : (p: V2) => p;
    const kapali = h.noktalar.length === YORUNGE.parca + 1;
    const ks = kosular(h.noktalar).map((k) => ({ on: k.on, ps: k.noktalar.map((p) => tasi(izd(p, s.kamera))) }));
    let kirpma: YorungeKirpmasi | null = null;
    if (f >= KIRPMA_BAS) {
      let genisleme = 0;
      if (daralma < 1) {
        // Halkanın hedefteki (u = 1) yerine en büyük uzaklığı: genişleme bunu kapsar, kırpma halkayı erken kesmez.
        const son = elipsDonusumu(h.kaynak, hedef, 1);
        const kalan = Math.max(
          ...h.noktalar.map((p) => {
            const q = izd(p, s.kamera);
            const [a, b] = [tasi(q), son(q)];
            return Math.hypot(a[0] - b[0], a[1] - b[1]);
          }),
        );
        genisleme = kalan + (kalinlik / 2) * (1 - daralma);
      }
      kirpma = { x: kx, y: ky, olcek: kirpmaOlcegi, genisleme };
    }
    const tasma = kalinlik + 2 * CIZGI.ince;
    ks.forEach((k, i) => {
      // Ön koşunun dolgusu komşu (arka) koşulara taşar: kılıfın ek yerindeki yuvarlak ucu turuncuyla örtülür.
      const onceki = i > 0 ? ks[i - 1] : kapali && ks.length > 1 ? ks[ks.length - 1] : null;
      const sonraki = i < ks.length - 1 ? ks[i + 1] : kapali && ks.length > 1 ? ks[0] : null;
      const dolgu = k.on ? [...(onceki ? tasan([...onceki.ps].reverse(), tasma).reverse() : []), ...k.ps, ...(sonraki ? tasan(sonraki.ps, tasma) : [])] : k.ps;
      cizimler.push({ id: `yorunge-${h.id}-${i}`, on: k.on, cizgi: k.ps, dolgu, kalinlik, kilif, opaklik, kirpma });
    });
  }
  return cizimler;
};

export type CocukKapanisKatmani = {
  etiketler: EtiketDurumu[];
  metinler: MetinDurumu[];
  /** 0 → 1: Atölye odağının soluklaştırması, tabla son çeyreği dönerken kalkar. */
  canlanma: number;
  yorungeler: YorungeCizimi[];
  blokIzi: BlokIzi | null;
  arka: ArkaCekilme | null;
  /** Künyenin çıkışı (0 → 1): logo kilidi gelmeden küçük logo gider. */
  kunyeCikis: number;
  kapanis: KapanisDurumu | null;
};

/**
 * logo: halkaların ve bloğun oturduğu logo kilidinin ekrandaki yeri (16:9 çerçevesinde, kamera kapsayıcısının dışı).
 * Varsayılanı kapanış kartının logosu; 9:16 kesim kendi logosunun 16:9 sahne çerçevesindeki karşılığını verir
 * (yerlesim916.ts). Yalnız hedef elipsler, halka kalınlığı ve bloğun hedefi değişir; kart (kapanis) KAPANIS_YERI'nde kalır.
 */
export const cocukKapanisKatmani = (f: number, s: Sahne, logo: LogoYeri = KAPANIS_YERI.logo): CocukKapanisKatmani => {
  const etiketler: EtiketDurumu[] = [];
  HEDEFLER.forEach((h, i) => {
    const y = HEDEF_YERLESIMI[i];
    const e = vurusEtiketi(f, COCUK.etiketler[i], K85, { id: `cocuk-hedef-${i}`, capa: y.capa, x: y.x, y: y.y, hiza: y.hiza, metin: h.metin, nokta: RENK[h.modul] });
    if (e) etiketler.push(e);
  });

  const metinler: MetinDurumu[] = [];
  const cB = ara(f, K88, K88 + 12);
  if (f >= kare(COCUK.baslik[0]) && cB < 1) {
    // Satırlar vuruşlarında açılmaya başlar (seslendirme "Vaktin…" v74'te); ilk satır Atölye yazıları (K73 + 12'de
    // gitmiş) aynı sütundan çekildikten 6 kare sonra gelir, üstlerine binmez.
    metinler.push({ id: "cocuk-baslik", satirlar: [...METIN.cocuk.baslik], ...BASLIK, acilis: COCUK.baslik.map((v) => ara(f, kare(v), kare(v) + 10, Easing.out(Easing.cubic))), cikis: cB });
  }
  const cK = ara(f, K93, K93 + 12);
  if (f >= K89 && cK < 1) {
    // Çocuk başlığı K88 + 12'de gitmiş olur; Kapanış satırları vuruşlarında başlar (aynı yerde üst üste binmez).
    metinler.push({ id: "kapanis-baslik", satirlar: [...METIN.kapanis.baslik], ...BASLIK, acilis: KAPANIS.baslik.map((v) => ara(f, kare(v), kare(v) + 10, Easing.out(Easing.cubic))), cikis: cK });
  }

  const u = donusum(f);
  let blokIzi: BlokIzi | null = null;
  if (f >= K93) {
    const kaynak = izd(YORUNGE.merkez, s.kamera);
    const hedef = kapsayiciya(s, logoNoktasi(logo, ISARET.kesisim));
    blokIzi = { kaynak, merkez: [lerp(kaynak[0], hedef[0], u), lerp(kaynak[1], hedef[1], u)], olcek: 1 - ara(f, K93, K95 - 6, Easing.inOut(Easing.cubic)) };
  }

  const c = ara(f, K89, K89 + 36, Easing.inOut(Easing.sin));
  const arka: ArkaCekilme | null = f >= K89 ? { bulaniklik: 20 * c, opaklik: 1 - c, olcek: 1 - 0.1 * c } : null;

  const kapanis: KapanisDurumu | null =
    f >= K94 + 6
      ? {
          itme: 1 + 0.03 * ara(f, K95, SON_KARE),
          logo: { ...KAPANIS_YERI.logo, gorunum: ara(f, K94 + 6, K95 + 4, Easing.out(Easing.quad)) },
          slogan: { metin: METIN.kapanis.ekran[0], top: KAPANIS_YERI.slogan, acilis: ara(f, K95, K95 + 14, Easing.out(Easing.cubic)) },
          cagri: {
            top: KAPANIS_YERI.cagri,
            // Haplar ve düğme soldan sağa 2 kare arayla, 15 karede netleşir; düğme basılmadan 2 kare önce tam görünür.
            cipler: [
              { metin: METIN.kapanis.ekran[1], nokta: RENK.studio, gorunum: ara(f, K95 - 3, K95 + 12, Easing.out(Easing.quad)) },
              { metin: METIN.kapanis.ekran[2], nokta: RENK.atolye, gorunum: ara(f, K95 - 1, K95 + 14, Easing.out(Easing.quad)) },
            ],
            dugme: {
              metin: METIN.kapanis.ekran[3],
              gorunum: ara(f, K95 + 1, K95 + 16, Easing.out(Easing.quad)),
              // 3 karede basılır, 6 karede yarıya yaylanarak geri çıkar (düğme basılı kalır).
              basma: ara(f, K96, K96 + 3, Easing.out(Easing.quad)) - 0.5 * ara(f, K96 + 3, K96 + 9, Easing.out(Easing.back(1.7))),
            },
          },
        }
      : null;

  return {
    etiketler,
    metinler,
    canlanma: ara(f, K73, K73 + DONUS_KARE, Easing.inOut(Easing.sin)),
    yorungeler: yorungeler(f, s, logo),
    blokIzi,
    arka,
    kunyeCikis: ara(f, K92, K93),
    kapanis,
  };
};
