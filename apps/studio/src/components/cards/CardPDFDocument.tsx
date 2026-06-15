import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { GeneratedCard } from "@/lib/prompts";
import { WORK_AREA_LABEL, DIFFICULTY_LABEL, AGE_LABEL } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

// Noto Sans — tam Unicode + Türkçe desteği
// public/fonts/ klasöründen yüklenir (client-side absolute URL)
const ORIGIN =
  typeof window !== "undefined" ? window.location.origin : "";

const FONT_BASE = `${ORIGIN}/fonts`;
const LOGO_SRC  = `${ORIGIN}/luden-logo-5.png`;

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
          <Image src={LOGO_SRC} style={styles.logo} />
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
