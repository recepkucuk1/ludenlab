import type { V2 } from "./izometri.ts";
import { METIN } from "./metin.ts";
import { LOGO_VIEWBOX, TUVAL_169 } from "./tema.ts";
import type { LogoYeri } from "./yerlesim.ts";

// 9:16 kesimin (1080 × 1920) yerleşimi (spec "9:16 kesim": tabla üstte, metin altta). Film 16:9 durumunu çizer:
// 16:9 karesinin iki bölgesi iki ayrı tekdüze dönüşümle taşınır; künye ve kapanış kartı 9:16'da yeniden kurulur.
// Instagram güvenli alanı: kritik yazı y 200–1600 arasında, yanlardan en az 60 px içeride.

export const GUVENLI_916 = { sol: 60, sag: 1020, ust: 200, alt: 1600 } as const;

/**
 * Sahne bölgesi: 16:9 karesinin x ≥ x0 kısmı (tabla, kâğıtlar, blok, yörüngeler, kartlar, damga, etiketler; kamera
 * itmesi dahil) → X = (x − x0)·k, Y = y·k + oy. x0 = 700: Yük'te sol yığının (S3) en uzun çipi ("çalışma kâğıdı",
 * tahmini 245 px) itmeyle 16:9'da x ≈ 772'ye dek uzanır; 760'ta kesilse 9:16'da kenarın dışına, 700'de 64 px içeri
 * düşer. k = 1080 / 1220. oy = 180: kartların tepesi (16:9 y ≈ 124) 290'a, en büyük tablanın altı (Atölye, y ≈ 1035)
 * 1096'ya iner; metin bandı 1150'de başlar.
 */
export const SAHNE_916 = { x0: 700, k: 1080 / 1220, oy: 180 } as const;

/**
 * Metin sütunu: 16:9 x < 760 (bölüm yazıları, kilitler, Dönüş çipleri) → X = tx + x·k, Y = ty + y·k. Sol kenar (120)
 * 60'a, en üst yazı (Atölye kilidi, y 330) 1150'ye oturur; en alt yazı ("02 Atölye" çipinin altı, y 817) k = 0,92 ile
 * 1598'e iner. Genişlik bol (en uzun satır ~600 px); yüksekliği güvenli bant belirler.
 */
const METIN_K = 0.92;
export const METIN_916 = { k: METIN_K, tx: GUVENLI_916.sol - TUVAL_169.sol * METIN_K, ty: 1150 - 330 * METIN_K } as const;

/** 16:9 sahne noktası → 9:16. */
export const sahneden916 = ([x, y]: V2): V2 => [(x - SAHNE_916.x0) * SAHNE_916.k, y * SAHNE_916.k + SAHNE_916.oy];
/** 9:16 noktası → 16:9 sahne çerçevesi (sahneden916'nın tersi). */
export const sahneye169 = ([x, y]: V2): V2 => [SAHNE_916.x0 + x / SAHNE_916.k, (y - SAHNE_916.oy) / SAHNE_916.k];
/** 16:9 metin sütunu noktası → 9:16. */
export const metinden916 = ([x, y]: V2): V2 => [METIN_916.tx + x * METIN_916.k, METIN_916.ty + y * METIN_916.k];

/** CSS: 16:9 tuvalinde (1920 × 1080, transformOrigin 0 0) çizilen bölgeyi 9:16'daki yerine taşır. */
export const SAHNE_DONUSUMU = `translate(${-SAHNE_916.x0 * SAHNE_916.k}px, ${SAHNE_916.oy}px) scale(${SAHNE_916.k})`;
export const METIN_DONUSUMU = `translate(${METIN_916.tx}px, ${METIN_916.ty}px) scale(${METIN_916.k})`;

/** Künye: yalnız renkli logo, sol üstte, güvenli alanın içinde (adres kapanış düğmesinde). x: logonun sol iç boşluğu
 *  (20,5/260 × yükseklik) payı düşülür, yazı 60 px'e hizalanır. */
const KUNYE_H = 72;
export const KUNYE_916 = { x: GUVENLI_916.sol - (KUNYE_H * 20.5) / LOGO_VIEWBOX.h, y: 210, yukseklik: KUNYE_H } as const;

/** Slogan dikeyde iki satır: son iki kelime ikinci satırda ("… destekli" / "öğrenme yönetimi."). */
export const sloganSatirlari = (s: string): string[] => {
  const k = s.split(" ");
  return [k.slice(0, -2).join(" "), k.slice(-2).join(" ")];
};

/**
 * Kapanış kartı: logo kilidi 16:9'daki boyutuyla (760 px) ortada; altında 40 px arayla iki satır slogan (44 px) ve
 * çağrı satırı. İçerik (işaretin tepesi 616 → düğme gölgesinin altı 1185) güvenli bandın ortasında (≈ 900); kart bu
 * nokta etrafında iter.
 */
const LOGO_916: LogoYeri = { x: 160, y: 592, w: 760 };
export const KAPANIS_916 = {
  logo: LOGO_916,
  slogan: { top: 955, satirlar: sloganSatirlari(METIN.kapanis.ekran[0]) },
  cagri: 1109,
  merkez: [540, 900] as V2,
} as const;

/** Halkaların hedefi: 9:16 logosunun 16:9 sahne çerçevesindeki karşılığı (filmDurumu'nun hedefLogo'su). */
export const KAPANIS_916_SAHNEDE: LogoYeri = (() => {
  const [x, y] = sahneye169([LOGO_916.x, LOGO_916.y]);
  return { x, y, w: LOGO_916.w / SAHNE_916.k };
})();
