export interface WorksheetContent {
  title: string;
  targetSounds?: string[];
  positions?: string[];
  level?: string;
  items: Array<{ word?: string; sentence?: string; imageUrl?: string }>;
}

// react-pdf Image bozuk URL'de tüm render'ı çökertir → önce erişilebilir URL'leri süz.
async function reachable(url: string): Promise<boolean> {
  try {
    const r = await fetch(url, { method: "GET", mode: "cors" });
    return r.ok;
  } catch {
    return false;
  }
}

export async function downloadArticulationWorksheetPDF(content: WorksheetContent) {
  const { pdf, Document, Page, Text, View, Image, StyleSheet, Font } = await import("@react-pdf/renderer");

  Font.register({
    family: "NotoSans",
    fonts: [
      { src: `${window.location.origin}/fonts/NotoSans-Regular.ttf`, fontWeight: "normal" },
      { src: `${window.location.origin}/fonts/NotoSans-Bold.ttf`, fontWeight: "bold" },
    ],
  });

  // Görselleri önceden doğrula; erişilemeyenleri imageUrl'siz bırak (PDF çökmesin).
  const items = await Promise.all(
    content.items.map(async (it) => ({
      ...it,
      imageUrl: it.imageUrl && (await reachable(it.imageUrl)) ? it.imageUrl : undefined,
    })),
  );

  const showSentence = content.level === "sentence" || content.level === "contextual";

  const styles = StyleSheet.create({
    page: { fontFamily: "NotoSans", fontSize: 10, color: "#18181b", padding: 32, backgroundColor: "#fff" },
    title: { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 18, color: "#023435", marginBottom: 12 },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    card: { width: "31%", borderWidth: 2, borderColor: "#18181b", borderRadius: 10, padding: 8, alignItems: "center" },
    img: { width: 96, height: 96, objectFit: "contain", marginBottom: 6 },
    imgEmpty: { width: 96, height: 96, marginBottom: 6 },
    word: { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 14, color: "#18181b", textAlign: "center" },
    sentence: { fontFamily: "NotoSans", fontSize: 8, color: "#52525b", textAlign: "center", marginTop: 3 },
  });

  const Doc = () => (
    <Document title={content.title} author="LudenLab">
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{content.title}</Text>
        <View style={styles.grid}>
          {items.map((it, i) => (
            <View key={i} style={styles.card}>
              {it.imageUrl ? (
                <Image src={it.imageUrl} style={styles.img} />
              ) : (
                <View style={styles.imgEmpty} />
              )}
              <Text style={styles.word}>{it.word ?? ""}</Text>
              {showSentence && it.sentence ? <Text style={styles.sentence}>{it.sentence}</Text> : null}
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );

  const blob = await pdf(<Doc />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${content.title.replace(/\s+/g, "_")}_calisma_kagidi.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
