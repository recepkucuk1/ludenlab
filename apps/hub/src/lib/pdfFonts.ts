import type { Font as ReactPdfFont } from "@react-pdf/renderer";

/**
 * react-pdf PDF'leri için ortak font kaydı (Türkçe karakterler için NotoSans)
 * ve heceleme kapatma. Callback kaydedilmezse react-pdf İngilizce heceleme
 * kurallarını uygular ve Türkçe kelimeleri yanlış yerden böler
 * ("sakince" → "sak-ince"). `Font`, lazy import edilen modülden verilir.
 */
export function registerPdfFonts(Font: typeof ReactPdfFont, base = `${window.location.origin}/fonts`): void {
  Font.register({
    family: "NotoSans",
    fonts: [
      { src: `${base}/NotoSans-Regular.ttf`, fontWeight: "normal" },
      { src: `${base}/NotoSans-Bold.ttf`, fontWeight: "bold" },
    ],
  });
  Font.registerHyphenationCallback((word) => [word]);
}
