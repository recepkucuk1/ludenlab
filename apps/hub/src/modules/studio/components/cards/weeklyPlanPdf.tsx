import { formatDate } from "@studio/lib/utils";
import { PDF_FONT_STACK, registerPdfFonts } from "@/lib/pdfFonts";
import type { WeeklyPlanContent } from "./WeeklyPlanView";

/* Haftalık plan PDF'i — react-pdf. Eskiden jsPDF'ti; jsPDF eksik glifi başka
   fonttan alamadığı için →, ✓ ve emojiler bozuluyordu ve Türkçe başlıklar
   ("GUN", "Haftalik") ASCII'ye indirilmişti. Araç sayfası ve kart sayfası
   ortak kullanır. */
export async function downloadWeeklyPlanPDF(plan: WeeklyPlanContent, studentName?: string) {
  const { pdf, Document, Page, Text, View, StyleSheet, Font } = await import("@react-pdf/renderer");

  registerPdfFonts(Font);

  const days = Array.isArray(plan.days) ? plan.days : [];
  const today = formatDate(new Date(), "medium");
  const meta = [
    plan.weekRange,
    studentName ?? "",
    plan.sessionsPerWeek ? `${plan.sessionsPerWeek} ders/hafta` : "",
    plan.sessionDuration ? `${plan.sessionDuration} dk/ders` : "",
  ]
    .filter(Boolean)
    .join("  |  ");

  const TEAL = "#023435";
  const INK = "#18181b";
  const LINE = "#e4e4e7";

  const styles = StyleSheet.create({
    page: { fontFamily: PDF_FONT_STACK, fontSize: 8.5, color: INK, paddingTop: 40, paddingBottom: 60, paddingHorizontal: 40 },
    title: { fontFamily: PDF_FONT_STACK, fontWeight: "bold", fontSize: 16, color: TEAL },
    meta: { fontSize: 9, color: "#71717a", marginTop: 4, marginBottom: 12 },
    day: { marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: LINE },
    dayLast: { marginBottom: 10 },
    dayBar: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: TEAL,
      borderRadius: 4,
      paddingVertical: 5,
      paddingHorizontal: 8,
      marginBottom: 5,
    },
    dayTitle: { fontFamily: PDF_FONT_STACK, fontWeight: "bold", fontSize: 10, color: "#fff" },
    dayDuration: { fontSize: 8, color: "#ffffffcc" },
    focus: { fontSize: 8, color: "#52525b" },
    objective: { fontFamily: PDF_FONT_STACK, fontWeight: "bold", fontSize: 9, marginTop: 2, marginBottom: 5 },
    table: { borderTopWidth: 1, borderLeftWidth: 1, borderColor: LINE },
    tr: { flexDirection: "row" },
    thRow: { backgroundColor: TEAL },
    cell: { borderRightWidth: 1, borderBottomWidth: 1, borderColor: LINE, padding: 5 },
    colSection: { width: 80 },
    colActivity: { flex: 1 },
    colDuration: { width: 56, textAlign: "center" },
    th: { fontFamily: PDF_FONT_STACK, fontWeight: "bold", fontSize: 8, color: "#fff" },
    tdBold: { fontFamily: PDF_FONT_STACK, fontWeight: "bold" },
    small: { fontSize: 7.5, color: "#52525b", marginTop: 4 },
    note: { fontSize: 7.5, color: "#a1a1aa", marginTop: 3 },
    section: { marginTop: 6, marginBottom: 8 },
    sectionBar: { borderRadius: 3, paddingVertical: 3, paddingHorizontal: 8, marginBottom: 4 },
    sectionTitle: { fontFamily: PDF_FONT_STACK, fontWeight: "bold", fontSize: 8.5 },
    footer: {
      position: "absolute",
      left: 40,
      right: 40,
      bottom: 24,
      flexDirection: "row",
      justifyContent: "space-between",
      borderTopWidth: 1,
      borderTopColor: LINE,
      paddingTop: 5,
      fontSize: 7,
      color: "#a1a1aa",
    },
  });

  const Row = ({ section, activity, duration }: { section: string; activity: string; duration: string }) => (
    <View style={styles.tr} wrap={false}>
      <View style={[styles.cell, styles.colSection]}>
        <Text style={styles.tdBold}>{section}</Text>
      </View>
      <View style={[styles.cell, styles.colActivity]}>
        <Text>{activity}</Text>
      </View>
      <View style={[styles.cell, styles.colDuration]}>
        <Text>{duration}</Text>
      </View>
    </View>
  );

  const Section = ({ title, text, bg, color }: { title: string; text: string; bg: string; color: string }) => (
    <View style={styles.section} wrap={false}>
      <View style={[styles.sectionBar, { backgroundColor: bg }]}>
        <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
      </View>
      <Text>{text}</Text>
    </View>
  );

  const Doc = () => (
    <Document title={plan.title} author="LudenLab">
      <Page size="A4" style={styles.page} wrap>
        <Text style={styles.title}>{plan.title}</Text>
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}

        {days.map((day, di) => {
          const steps = day.mainWork?.steps?.join("; ") ?? "";
          const mainText = steps ? `${day.mainWork.activity}\n${steps}` : day.mainWork?.activity ?? "";
          const mats = [...(day.warmup?.materials ?? []), ...(day.mainWork?.materials ?? [])];
          return (
            <View key={di} style={di < days.length - 1 ? styles.day : styles.dayLast}>
              <View wrap={false}>
                <View style={styles.dayBar}>
                  <Text style={styles.dayTitle}>
                    {day.dayNumber}. GÜN — {day.dayName}, {day.date}
                  </Text>
                  <Text style={styles.dayDuration}>{day.duration}</Text>
                </View>
                <Text style={styles.focus}>Odak: {day.focusArea}</Text>
                <Text style={styles.objective}>{day.objective}</Text>
                <View style={[styles.tr, styles.thRow]}>
                  <View style={[styles.cell, styles.colSection]}>
                    <Text style={styles.th}>Bölüm</Text>
                  </View>
                  <View style={[styles.cell, styles.colActivity]}>
                    <Text style={styles.th}>Aktivite</Text>
                  </View>
                  <View style={[styles.cell, styles.colDuration]}>
                    <Text style={styles.th}>Süre</Text>
                  </View>
                </View>
              </View>
              <View style={styles.table}>
                <Row section="Isınma" activity={day.warmup?.activity ?? ""} duration={day.warmup?.duration ?? ""} />
                <Row section="Ana Çalışma" activity={mainText} duration={day.mainWork?.duration ?? ""} />
                <Row section="Kapanış" activity={day.closing?.activity ?? ""} duration={day.closing?.duration ?? ""} />
              </View>
              {mats.length > 0 ? <Text style={styles.small}>Materyaller: {mats.join(", ")}</Text> : null}
              {day.notes ? <Text style={styles.note}>Not: {day.notes}</Text> : null}
            </View>
          );
        })}

        {plan.weeklyGoal ? <Section title="Haftalık Hedef" text={plan.weeklyGoal} bg="#fff7ed" color="#c2410c" /> : null}
        {plan.materialsNeeded?.length ? (
          <Section title="Gerekli Materyaller" text={plan.materialsNeeded.join(", ")} bg="#f9fafb" color="#374151" />
        ) : null}
        {plan.parentCommunication ? (
          <Section title="Veli Bilgilendirme" text={plan.parentCommunication} bg="#eff6ff" color="#1e40af" />
        ) : null}

        <View style={styles.footer} fixed>
          <Text>LudenLab — ludenlab.com</Text>
          <Text>{today}</Text>
        </View>
      </Page>
    </Document>
  );

  const blob = await pdf(<Doc />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${plan.title.replace(/\s+/g, "_")}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
