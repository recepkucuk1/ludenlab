/**
 * apps/hub/src/app/studio/(main)/cards/[id]/page.tsx → downloadSocialStoryPDF
 * içindeki Doc şablonunun SADIK KOPYASI (orijinal dışa aktarılmıyor). Şablon
 * değişirse burası da güncellenmeli.
 *
 * TEK SAPMA: kelime bölme kapatıldı (CardPDFDocument'teki gibi). Üründeki şablonda
 * bu ayar yok ve Türkçeyi yanlış bölüyor ("sak-ince") — ürün hatası olarak raporlandı.
 */
import React from "react";
import { Document, Font, Image, Page, StyleSheet, Text, View, renderToFile } from "@react-pdf/renderer";
import { resolve } from "node:path";
import { SENTENCE_TYPE, r4Story } from "../../src/reels/r4-sosyal-hikaye/story";

export const renderStoryPdf = (outPath: string, promoRoot: string, hubPublic: string) => {
  Font.register({
    family: "NotoSans",
    fonts: [
      { src: `${hubPublic}/fonts/NotoSans-Regular.ttf`, fontWeight: "normal" },
      { src: `${hubPublic}/fonts/NotoSans-Bold.ttf`, fontWeight: "bold" },
    ],
  });

  Font.registerHyphenationCallback((word) => [word]);

  const sentences = r4Story.sentences.map((s) => ({ ...s, imageUrl: resolve(promoRoot, "public", s.file) }));
  const rows: (typeof sentences)[] = [];
  for (let i = 0; i < sentences.length; i += 2) rows.push(sentences.slice(i, i + 2));

  const styles = StyleSheet.create({
    page: { fontFamily: "NotoSans", fontSize: 10, color: "#18181b", padding: 44, backgroundColor: "#fff" },
    title: { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 18, color: "#023435", marginBottom: 16 },
    gridRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
    cell: { width: "47%", padding: 8, backgroundColor: "#faf9f6", borderRadius: 8, borderWidth: 1, borderColor: "#ececec" },
    cellImg: { width: "100%", height: 175, objectFit: "contain", borderRadius: 5, marginBottom: 6, backgroundColor: "#fff" },
    badge: { fontWeight: "bold", fontSize: 7.5, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99, alignSelf: "flex-start", marginBottom: 4 },
    text: { fontSize: 9.5, lineHeight: 1.45, color: "#3f3f46" },
    section: { marginTop: 14, padding: 10, borderRadius: 6 },
    secTitle: { fontWeight: "bold", fontSize: 9, marginBottom: 4 },
    secText: { fontSize: 9, lineHeight: 1.6 },
  });

  const Doc = () => (
    <Document title={r4Story.title} author="LudenLab">
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{r4Story.title}</Text>
        {rows.map((pair, ri) => (
          <View key={ri} style={styles.gridRow} wrap={false}>
            {pair.map((s, ci) => {
              const t = SENTENCE_TYPE[s.type];
              return (
                <View key={ci} style={styles.cell}>
                  <Image src={s.imageUrl} style={styles.cellImg} />
                  <Text style={[styles.badge, { backgroundColor: `${t.pdfColor}20`, color: t.pdfColor }]}>{t.label}</Text>
                  <Text style={styles.text}>{s.text}</Text>
                </View>
              );
            })}
          </View>
        ))}
        <View style={[styles.section, { backgroundColor: "#fffbeb" }]}>
          <Text style={[styles.secTitle, { color: "#92400e" }]}>Uzman Notları</Text>
          <Text style={[styles.secText, { color: "#78350f" }]}>{r4Story.expertNotes}</Text>
        </View>
        <View style={[styles.section, { backgroundColor: "#eff6ff" }]}>
          <Text style={[styles.secTitle, { color: "#1e40af" }]}>Veli Rehberi</Text>
          <Text style={[styles.secText, { color: "#1e3a8a" }]}>{r4Story.homeGuidance}</Text>
        </View>
      </Page>
    </Document>
  );

  return renderToFile(<Doc />, outPath);
};
