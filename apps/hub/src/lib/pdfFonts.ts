import type { Font as ReactPdfFont } from "@react-pdf/renderer";

/**
 * Metin için font yığını. NotoSans'ta ok (→), kutu/daire (□ ●) ve onay/uyarı
 * (✓ ⚠ ★) glifleri yok; react-pdf yığındaki sıradaki fonta düşer. Yığın
 * verilmezse bu karakterler PDF'te anlamsız işaretlere dönüşür.
 * NotoSansMath (yalnız ok blokları) metin boyunda ok verir; Mono'nun okları dar.
 * public/fonts'taki Math/Mono/Symbols2 dosyaları yalnız ilgili blokları içeren alt kümelerdir.
 */
export const PDF_FONT_STACK = ["NotoSans", "NotoSansMath", "NotoSansMono", "NotoSansSymbols2"];

/**
 * Kod blokları/eş aralıklı metin için yığın. Courier (PDF standart fontu)
 * Türkçe harfleri ve okları desteklemediği için KULLANILMAZ.
 */
export const PDF_MONO_STACK = ["NotoSansMono", "NotoSansSymbols2"];

/** Emojiler fontla çizilemez; react-pdf bunları Twemoji PNG'si olarak gömer. */
const EMOJI_URL = "https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/72x72/";

/**
 * react-pdf PDF'leri için ortak font kaydı (Türkçe karakterler için NotoSans,
 * simge yedekleri, emoji kaynağı) ve heceleme kapatma. Callback kaydedilmezse
 * react-pdf İngilizce heceleme kurallarını uygular ve Türkçe kelimeleri yanlış
 * yerden böler ("sakince" → "sak-ince"). `Font`, lazy import edilen modülden verilir.
 */
export function registerPdfFonts(Font: typeof ReactPdfFont, base = `${window.location.origin}/fonts`): void {
  Font.register({
    family: "NotoSans",
    fonts: [
      { src: `${base}/NotoSans-Regular.ttf`, fontWeight: "normal" },
      { src: `${base}/NotoSans-Bold.ttf`, fontWeight: "bold" },
    ],
  });
  Font.register({ family: "NotoSansMath", src: `${base}/NotoSansMath-Arrows.ttf` });
  Font.register({ family: "NotoSansMono", src: `${base}/NotoSansMono-Regular.ttf` });
  Font.register({ family: "NotoSansSymbols2", src: `${base}/NotoSansSymbols2-Regular.ttf` });
  Font.registerEmojiSource({ format: "png", url: EMOJI_URL });
  Font.registerHyphenationCallback((word) => [word]);
}
