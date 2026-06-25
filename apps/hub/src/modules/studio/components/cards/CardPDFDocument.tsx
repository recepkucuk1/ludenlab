import {
  Document,
  Page,
  Text,
  View,
  Svg,
  Path,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { GeneratedCard } from "@studio/lib/prompts";
import { WORK_AREA_LABEL, DIFFICULTY_LABEL, AGE_LABEL } from "@studio/lib/constants";
import { formatDate } from "@studio/lib/utils";

// Noto Sans — tam Unicode + Türkçe desteği
// public/fonts/ klasöründen yüklenir (client-side absolute URL)
const ORIGIN =
  typeof window !== "undefined" ? window.location.origin : "";

const FONT_BASE = `${ORIGIN}/fonts`;

// LudenLab kilidi — react-pdf native vektör (viewBox 0 0 611 260).
// Tek <Logo> kaynağıyla aynı path'ler; teal "Luden" + turuncu "Lab"/yörünge.
const LOGO_TEAL = [
  "M79.42,139.2v-36.21h13.33v36.19c0,15.01,8.29,22.6,20.91,22.6s20.91-7.57,20.91-22.6v-36.19h13.33v36.19c0,23.01-13.75,34.94-34.24,34.94s-34.24-11.78-34.24-34.94h0v.02Z",
  "M153.24,137.23c0-23.01,17.12-36.06,35.22-36.06,11.23,0,20.77,5.04,25.82,14.03v-34.66h13.33v56.54c0,22.6-15.43,37.04-36.92,37.04s-37.46-15.16-37.46-36.9h0v.02h0ZM214.29,137.65c0-14.03-9.54-24.13-23.71-24.13s-23.86,10.1-23.86,24.13,9.55,24.13,23.86,24.13,23.71-10.1,23.71-24.13h0Z",
  "M232.96,137.65c0-21.05,15.45-36.48,37.34-36.48s37.04,15.43,37.04,36.48v4.91h-60.34c1.96,12.35,11.23,19.22,23.3,19.22,8.99,0,15.29-2.81,19.37-8.84h14.73c-5.33,12.91-17.96,21.18-34.1,21.18-21.89,0-37.34-15.44-37.34-36.47ZM293.31,130.63c-2.66-11.08-11.78-17.12-23.01-17.12s-20.21,6.17-22.87,17.12h45.89-.01Z",
  "M312.11,136.24c0-23.15,13.75-35.08,34.23-35.08s34.24,11.78,34.24,35.08v36.06h-13.33v-36.06c0-15.01-8.29-22.73-20.91-22.73s-20.91,7.72-20.91,22.73v36.06h-13.33v-36.06h0Z",
  "M76.75,171.88h-27.4c-15.91,0-28.86-12.94-28.86-28.85v-62.48h13.93v62.5c0,8.22,6.7,14.92,14.92,14.92h27.4v13.93h0v-.02h0Z",
];
const LOGO_ORANGE = [
  "M591.16,117.7l-.02-.1c-4.3-15.99-30.29-16.21-38.88-16.28-18.52.3-38.38,3.42-58.85,9.17-.82-15.97-3.01-32.6-6.6-49.59-1.81-7.69-6.43-27.31-14.84-36.45-1.81-2.02-3.94-3.64-6.44-4.39-.87-.26-1.76-.41-2.69-.44h-.15c-12.85.63-19.31,24.15-23.05,41.81-3,14.99-4.81,31.14-5.38,48.03-.26,8.8-.2,16.96.2,24.64-7.59,4.32-16.11,10.08-20.42,16.35-1.53,2.18-2.62,4.56-2.8,7.11-.07.92-.02,1.84.16,2.76l.03.15c2.43,8.68,15.21,11.8,28.87,12.79,2.77,10.09,9.55,30.42,24.44,30.69h.11c15.83-.61,21.98-23.62,24.22-32.97,5.43-.76,10.93-1.66,16.48-2.72,23.63-4.63,42.16-10.53,58.32-18.58,7.59-3.91,30.67-15.82,27.3-31.98h0ZM433.65,168.35c-4.58-.61-16.6-2.24-18.56-8.83,0-.03-.01-.05-.02-.08-.26-1.48,0-3.02.7-4.59,1.3-2.7,4.47-6.48,11.89-11.57,2.31-1.48,4.68-2.86,7.08-4.16.77,10.67,2.22,20.42,4.39,29.63-1.83-.1-3.65-.23-5.48-.41h0ZM470.79,182.07l-.03.07c-.76,1.44-2.18,4.13-3.74,5.93-1.25,1.44-3.49,1.5-4.79.11-1.72-1.83-3.86-5.23-6.2-10.76-.48-1.24-.94-2.48-1.39-3.73.93,0,1.85,0,2.75-.03,5.62-.15,11.36-.49,17.19-1.01-1.09,3.26-2.31,6.38-3.78,9.42h0ZM479.04,155.36c-.79,3.74-1.59,7.25-2.47,10.57-7.65,1.41-15.57,2.44-23.59,2.84-3.67-11.58-5.97-23.55-7.47-34.89,12.56-5.48,25.65-9.16,38.04-11.96-.88,11.65-2.39,22.86-4.51,33.44h0ZM484.28,108.91c-.05,1.47-.13,2.91-.2,4.37-12.43,3.94-25.02,8.82-37.66,14.6-.47.23-1,.49-1.56.76-.78-6.8-1.3-13.3-1.69-19.26-.99-21.42-.95-46.47,6.89-69.85,1.61-4.32,5.86-15.66,12.74-16.1h.08c1.52.07,2.97.68,4.35,1.71,2.35,1.87,5.33,5.79,8.65,14.11,8.34,23.19,8.92,48.24,8.39,69.67h.01,0ZM576.29,123.63c-1.41,2.08-4.25,4.92-9.15,8.41-20.33,13.72-44.73,21.95-63.67,27.57-4.13,1.14-8.42,2.27-12.82,3.33,2.33-13.52,3.35-28,3.08-43.17,16.18-3.09,31.91-4.84,46.76-5.22,10.52-.17,19.3.13,27.94,2.11l.07.02c1.58.42,4.52,1.21,6.62,2.32,1.68.89,2.24,3.06,1.17,4.64h0Z",
  "M127.99,221.97c0-11.48-8.66-17.99-17.82-17.99-5.68,0-10.51,2.51-13.06,7v-17.29h-6.74v28.21c0,11.28,7.81,18.48,18.68,18.48s18.95-7.56,18.95-18.41h-.01ZM97.1,222.18c0-7,4.83-12.04,12-12.04s12.07,5.04,12.07,12.04-4.83,12.04-12.07,12.04-12-5.04-12-12.04h0Z",
  "M48.96,239.27h-13.86c-8.05,0-14.6-6.46-14.6-14.39v-31.17h7.05v31.18c0,4.1,3.39,7.44,7.55,7.44h13.86v6.95h0Z",
  "M50.22,222.5c0-10.83,7.79-18.44,18.91-18.44s18.63,7.4,18.63,18.44v16.97h-6.16v-7.54c-2.34,5.59-7.51,8.45-13.6,8.45-9.14,0-17.78-6.5-17.78-17.88ZM81.11,222.22c0-6.98-4.82-12.01-12.04-12.01s-12.04,5.03-12.04,12.01,4.82,12.01,12.04,12.01,12.04-5.03,12.04-12.01Z",
];
// "Studio" alt-marka ürün adı (outline, teal) — studio PDF'leri Studio kilidini kullanır
const LOGO_STUDIO_TEXT =
  "M147.88 240.14C157.96 240.14 164.65 234.69 164.65 225.92C164.65 215.44 156.51 213.99 149.68 212.74C144.78 211.85 140.57 211.09 140.57 207.16C140.57 203.84 143.05 201.15 148.02 201.15C152.92 201.15 155.47 203.64 155.54 207.09H163.89C163.55 198.81 157.27 193.22 147.95 193.22C138.36 193.22 132.01 199.08 132.01 207.43C132.01 217.92 140.09 219.37 146.92 220.61C151.82 221.51 156.03 222.27 156.03 226.2C156.03 229.79 153.34 232.2 147.88 232.2C142.5 232.2 139.81 229.79 139.74 226.2H131.12C131.32 234.82 137.88 240.14 147.88 240.14Z M182.94 240.14C191.22 240.14 196.87 235.58 196.87 226.13V225.23H188.66V226.13C188.66 230.75 186.32 232.48 182.94 232.48C179.56 232.48 177.21 230.68 177.21 226.13V212.61H194.8V205.15H177.21V193.08H169.0V226.13C169.0 235.58 174.66 240.14 182.94 240.14Z M217.57 240.14C227.65 240.14 234.41 234.27 234.41 222.89V205.15H226.2V222.89C226.2 229.37 222.75 232.48 217.57 232.48C212.4 232.48 208.95 229.37 208.95 222.89V205.15H200.74V222.89C200.74 234.34 207.5 240.14 217.57 240.14Z M256.83 240.14C267.53 240.14 274.98 232.96 274.98 221.92V190.25H266.77V210.12C264.36 206.33 260.29 204.26 255.39 204.26C247.11 204.26 238.41 210.19 238.41 221.85C238.41 232.69 246.0 240.14 256.83 240.14ZM256.77 232.48C250.76 232.48 246.69 228.2 246.69 222.2C246.69 216.19 250.76 211.92 256.77 211.92C262.77 211.92 266.77 216.19 266.77 222.2C266.77 228.2 262.77 232.48 256.77 232.48Z M285.68 200.74C288.85 200.74 291.13 198.46 291.13 195.29C291.13 192.11 288.85 189.77 285.68 189.77C282.5 189.77 280.23 192.11 280.23 195.29C280.23 198.46 282.5 200.74 285.68 200.74ZM281.54 239.24H289.75V205.15H281.54Z M313.28 240.14C324.04 240.14 331.63 232.55 331.63 222.2C331.63 211.85 324.04 204.26 313.28 204.26C302.51 204.26 294.92 211.85 294.92 222.2C294.92 232.55 302.51 240.14 313.28 240.14ZM313.28 232.48C307.27 232.48 303.2 228.2 303.2 222.2C303.2 216.19 307.27 211.92 313.28 211.92C319.28 211.92 323.28 216.19 323.28 222.2C323.28 228.2 319.28 232.48 313.28 232.48Z";

Font.register({
  family: "NotoSans",
  fonts: [
    { src: `${FONT_BASE}/NotoSans-Regular.ttf`, fontWeight: "normal" },
    { src: `${FONT_BASE}/NotoSans-Bold.ttf`, fontWeight: "bold" },
  ],
});

// Kelime ortasında tire ile bölmeyi kapat
Font.registerHyphenationCallback((word) => [word]);

// Emoji ve geçersiz karakterleri temizle — Türkçe karakterlere dokunma
function sanitize(text: string): string {
  return text
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, "") // emoji blokları
    .replace(/[^\p{L}\p{N}\p{P}\p{Z}\n]/gu, "")
    .trim();
}

// PDF'e özgü hex renkler (Tailwind class'ları burada çalışmaz)
const DIFFICULTY_COLOR: Record<string, string> = {
  easy: "#059669",
  medium: "#d97706",
  hard: "#dc2626",
};

const F = "NotoSans"; // kısaltma

const styles = StyleSheet.create({
  page: {
    fontFamily: F,
    fontWeight: "normal",
    fontSize: 10,
    color: "#18181b",
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 44,
    backgroundColor: "#ffffff",
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: "#2563eb",
  },
  logo: {
    width: 100,         // 600px orijinal genişlik → 100pt PDF
    height: 37,         // 221/600 * 100 ≈ 37pt (oran korunuyor)
    objectFit: "contain",
  },
  headerRight: { alignItems: "flex-end" },
  appName: {
    fontFamily: F,
    fontWeight: "bold",
    fontSize: 9,
    color: "#2563eb",
    letterSpacing: 1,
  },
  dateText: {
    fontFamily: F,
    fontSize: 8,
    color: "#a1a1aa",
    marginTop: 2,
  },

  // Başlık
  titleSection: { marginBottom: 14 },
  badgeRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  badge: {
    fontFamily: F,
    fontWeight: "bold",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    fontSize: 8,
  },
  badgeCategory: { backgroundColor: "#dbeafe", color: "#1d4ed8" },
  badgeAge:      { backgroundColor: "#f4f4f5", color: "#52525b" },
  badgeDuration: { backgroundColor: "#f4f4f5", color: "#52525b" },
  cardTitle: {
    fontFamily: F,
    fontWeight: "bold",
    fontSize: 18,
    color: "#09090b",
    marginBottom: 6,
    lineHeight: 1.3,
  },
  objective: {
    fontFamily: F,
    fontSize: 10,
    color: "#52525b",
    lineHeight: 1.6,
  },

  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#e4e4e7",
    marginVertical: 12,
  },

  // Bölüm
  section: { marginBottom: 12 },
  sectionTitle: {
    fontFamily: F,
    fontWeight: "bold",
    fontSize: 8,
    color: "#71717a",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },

  // Materyaller
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  chip: {
    fontFamily: F,
    backgroundColor: "#f4f4f5",
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 9,
    color: "#3f3f46",
  },

  // Adımlar
  stepRow: { flexDirection: "row", gap: 8, marginBottom: 5 },
  stepNumber: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#dbeafe",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  stepNumberText: {
    fontFamily: F,
    fontWeight: "bold",
    fontSize: 7,
    color: "#1d4ed8",
  },
  stepText: {
    fontFamily: F,
    fontSize: 9,
    color: "#3f3f46",
    lineHeight: 1.6,
    flex: 1,
  },

  // Etkinlik kutusu
  exerciseBox: {
    backgroundColor: "#f9f9f9",
    borderRadius: 6,
    padding: 8,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: "#2563eb",
  },
  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  exerciseName: {
    fontFamily: F,
    fontWeight: "bold",
    fontSize: 9,
    color: "#18181b",
    flex: 1,
  },
  exerciseReps: {
    fontFamily: F,
    fontSize: 8,
    color: "#71717a",
    backgroundColor: "#ffffff",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: "#e4e4e7",
  },
  exerciseDesc: {
    fontFamily: F,
    fontSize: 8.5,
    color: "#52525b",
    lineHeight: 1.55,
  },

  // Uzman notları
  notesBox: {
    backgroundColor: "#fffbeb",
    borderRadius: 6,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#f59e0b",
  },
  notesText: {
    fontFamily: F,
    fontSize: 9,
    color: "#78350f",
    lineHeight: 1.6,
  },

  // İlerleme göstergeleri
  checkRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 4,
    alignItems: "flex-start",
  },
  checkMark: {
    fontFamily: F,
    fontWeight: "bold",
    fontSize: 9,
    color: "#059669",
    marginTop: 1,
  },
  checkText: {
    fontFamily: F,
    fontSize: 9,
    color: "#3f3f46",
    lineHeight: 1.5,
    flex: 1,
  },

  // Ev ödevi
  homeBox: {
    backgroundColor: "#eff6ff",
    borderRadius: 6,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#2563eb",
  },
  homeText: {
    fontFamily: F,
    fontSize: 9,
    color: "#1e3a8a",
    lineHeight: 1.6,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 20,
    left: 44,
    right: 44,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#e4e4e7",
    paddingTop: 8,
  },
  footerText: {
    fontFamily: F,
    fontSize: 7.5,
    color: "#a1a1aa",
  },
});

interface CardPDFDocumentProps {
  card: GeneratedCard;
}

export function CardPDFDocument({ card }: CardPDFDocumentProps) {
  const today = formatDate(new Date(), "short");
  const diffColor = DIFFICULTY_COLOR[card.difficulty] ?? "#2563eb";

  return (
    <Document
      title={sanitize(card.title)}
      author="LudenLab"
      subject="Öğrenme Kartı"
    >
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <View style={styles.header}>
          <Svg viewBox="0 0 611 260" style={styles.logo}>
            {LOGO_TEAL.map((d, i) => (
              <Path key={`t${i}`} d={d} fill="#023435" />
            ))}
            <Path d={LOGO_STUDIO_TEXT} fill="#023435" />
            {LOGO_ORANGE.map((d, i) => (
              <Path key={`o${i}`} d={d} fill="#fe703a" />
            ))}
          </Svg>
          <View style={styles.headerRight}>
            <Text style={styles.appName}>LudenLab</Text>
            <Text style={styles.dateText}>{today}</Text>
          </View>
        </View>

        {/* Başlık */}
        <View style={styles.titleSection}>
          <View style={styles.badgeRow}>
            {WORK_AREA_LABEL[card.category] && (
              <Text style={[styles.badge, styles.badgeCategory]}>
                {WORK_AREA_LABEL[card.category]}
              </Text>
            )}
            <Text style={[styles.badge, {
              backgroundColor: "#fef9c3",
              color: diffColor,
              fontFamily: F,
              fontWeight: "bold",
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 99,
              fontSize: 8,
            }]}>
              {DIFFICULTY_LABEL[card.difficulty] ?? card.difficulty}
            </Text>
            <Text style={[styles.badge, styles.badgeAge]}>
              {AGE_LABEL[card.ageGroup] ?? card.ageGroup}
            </Text>
          </View>

          <Text style={styles.cardTitle}>{sanitize(card.title)}</Text>
          {card.objective && (
            <Text style={styles.objective}>{sanitize(card.objective)}</Text>
          )}
        </View>

        <View style={styles.divider} />

        {/* Materyaller */}
        {card.materials?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Materyaller</Text>
            <View style={styles.chipRow}>
              {card.materials.map((m, i) => (
                <Text key={i} style={styles.chip}>{sanitize(m)}</Text>
              ))}
            </View>
          </View>
        )}

        {/* Uygulama Adımları */}
        {card.instructions?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Uygulama Adımları</Text>
            {card.instructions.map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{i + 1}</Text>
                </View>
                <Text style={styles.stepText}>
                  {sanitize(step.replace(/^Adım \d+:\s*/, ""))}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Etkinlikler */}
        {card.exercises?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Etkinlikler</Text>
            {card.exercises.map((ex, i) => (
              <View key={i} style={styles.exerciseBox}>
                <View style={styles.exerciseHeader}>
                  <Text style={styles.exerciseName}>{sanitize(ex.name)}</Text>
                  <Text style={styles.exerciseReps}>{sanitize(ex.repetitions)}</Text>
                </View>
                <Text style={styles.exerciseDesc}>{sanitize(ex.description)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Uzman Notları */}
        {card.therapistNotes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Uzman Notları</Text>
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>{sanitize(card.therapistNotes)}</Text>
            </View>
          </View>
        )}

        {/* İlerleme Göstergeleri */}
        {card.progressIndicators?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>İlerleme Göstergeleri</Text>
            {card.progressIndicators.map((pi, i) => (
              <View key={i} style={styles.checkRow}>
                <Text style={styles.checkMark}>✓</Text>
                <Text style={styles.checkText}>{sanitize(pi)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Ev Ödevi */}
        {card.homeExercise && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ev Ödevi</Text>
            <View style={styles.homeBox}>
              <Text style={styles.homeText}>{sanitize(card.homeExercise)}</Text>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>LudenLab — AI Destekli Öğrenme Kartı</Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) =>
              `Sayfa ${pageNumber} / ${totalPages}`
            }
          />
        </View>

      </Page>
    </Document>
  );
}
