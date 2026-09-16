/**
 * apps/hub/src/modules/studio/components/cards/articulationWorksheetPdf.tsx
 * içindeki Doc şablonunun SADIK KOPYASI (orijinal dışa aktarılmıyor). Şablon
 * değişirse burası da güncellenmeli.
 */
import React from "react";
import { Document, Font, Image, Page, StyleSheet, Text, View, renderToFile } from "@react-pdf/renderer";
import { resolve } from "node:path";
import { R3_WORDS } from "../../src/reels/r3-artikulasyon/words";

export const renderWorksheetPdf = (outPath: string, promoRoot: string, hubPublic: string) => {
  Font.register({
    family: "NotoSans",
    fonts: [
      { src: `${hubPublic}/fonts/NotoSans-Regular.ttf`, fontWeight: "normal" },
      { src: `${hubPublic}/fonts/NotoSans-Bold.ttf`, fontWeight: "bold" },
    ],
  });

  const styles = StyleSheet.create({
    page: { fontFamily: "NotoSans", fontSize: 10, color: "#18181b", padding: 32, backgroundColor: "#fff" },
    title: { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 18, color: "#023435", marginBottom: 12 },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    card: { width: "31%", borderWidth: 2, borderColor: "#18181b", borderRadius: 10, padding: 8, alignItems: "center" },
    img: { width: 96, height: 96, objectFit: "contain", marginBottom: 6 },
    word: { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 14, color: "#18181b", textAlign: "center" },
  });

  const Doc = () => (
    <Document title="/r/ Sesi — Kelime Başı Çalışması" author="LudenLab">
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>/r/ Sesi — Kelime Başı Çalışması</Text>
        <View style={styles.grid}>
          {R3_WORDS.map((w) => (
            <View key={w.word} style={styles.card}>
              <Image src={resolve(promoRoot, "public", w.file)} style={styles.img} />
              <Text style={styles.word}>{w.word}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );

  return renderToFile(<Doc />, outPath);
};
