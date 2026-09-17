import { formatDate } from "@studio/lib/utils";
import { PDF_FONT_STACK, registerPdfFonts } from "@/lib/pdfFonts";

/* Hedef takip raporu PDF'i — react-pdf. Eskiden jsPDF'ti; jsPDF eksik glifi
   başka fonttan alamadığı için notlardaki →, ✓ ve emojiler bozuluyordu ve
   Türkçe etiketler ("Kazanildi") ASCII'ye indirilmişti. */

export interface GoalTrackerPdfData {
  student: { name: string };
  modules: Array<{
    curriculum: { title: string };
    goals: Array<{
      goal: { code: string; title: string };
      progress: { status: string; notes: string | null } | null;
    }>;
  }>;
}

const STATUS_LABEL: Record<string, string> = {
  not_started: "Başlanmamış",
  in_progress: "Devam Ediyor",
  consolidating: "Pekiştiriliyor",
  mastered: "Kazanıldı",
  completed: "Kazanıldı",
};

const isMastered = (s: string) => s === "mastered" || s === "completed";
const isActive = (s: string) => s === "in_progress" || s === "consolidating";

export async function downloadGoalTrackerPDF(data: GoalTrackerPdfData) {
  const { pdf, Document, Page, Text, View, StyleSheet, Font } = await import("@react-pdf/renderer");

  registerPdfFonts(Font);

  const today = formatDate(new Date(), "medium");
  const allGoals = data.modules.flatMap((m) => m.goals);
  const total = allGoals.length;
  const mastered = allGoals.filter((g) => g.progress && isMastered(g.progress.status)).length;
  const active = allGoals.filter((g) => g.progress && isActive(g.progress.status)).length;
  const notStarted = total - mastered - active;
  const overall = total ? Math.round(((mastered + active * 0.5) / total) * 100) : 0;

  const TEAL = "#023435";
  const LINE = "#e4e4e7";

  const styles = StyleSheet.create({
    page: { fontFamily: PDF_FONT_STACK, fontSize: 7.5, color: "#18181b", paddingTop: 40, paddingBottom: 60, paddingHorizontal: 40 },
    title: { fontFamily: PDF_FONT_STACK, fontWeight: "bold", fontSize: 16, color: TEAL },
    date: { fontSize: 9, color: "#71717a", marginTop: 3 },
    summary: { fontSize: 9, marginTop: 6, marginBottom: 12 },
    module: { marginBottom: 14 },
    modBar: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: TEAL,
      borderRadius: 4,
      paddingVertical: 4,
      paddingHorizontal: 8,
      marginBottom: 5,
    },
    modTitle: { fontFamily: PDF_FONT_STACK, fontWeight: "bold", fontSize: 9.5, color: "#fff", flex: 1, paddingRight: 8 },
    modCount: { fontSize: 8, color: "#fff" },
    table: { borderTopWidth: 1, borderLeftWidth: 1, borderColor: LINE },
    tr: { flexDirection: "row" },
    thRow: { backgroundColor: "#f0f0f0" },
    cell: { borderRightWidth: 1, borderBottomWidth: 1, borderColor: LINE, padding: 5 },
    colCode: { width: 40 },
    colGoal: { flex: 1 },
    colStatus: { width: 85 },
    colNote: { width: 113 },
    th: { fontFamily: PDF_FONT_STACK, fontWeight: "bold", fontSize: 7, color: "#323232" },
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

  const Doc = () => (
    <Document title={`Hedef Takip Raporu — ${data.student.name}`} author="LudenLab">
      <Page size="A4" style={styles.page} wrap>
        <Text style={styles.title}>Hedef Takip Raporu — {data.student.name}</Text>
        <Text style={styles.date}>{today}</Text>
        <Text style={styles.summary}>
          Toplam: {total}   Kazanıldı: {mastered}   Devam Eden: {active}   Başlanmamış: {notStarted}   Genel İlerleme: %{overall}
        </Text>

        {data.modules.map((mod, mi) => {
          const modMastered = mod.goals.filter((g) => g.progress && isMastered(g.progress.status)).length;
          return (
            <View key={mi} style={styles.module}>
              <View wrap={false}>
                <View style={styles.modBar}>
                  <Text style={styles.modTitle}>{mod.curriculum.title}</Text>
                  <Text style={styles.modCount}>
                    {modMastered}/{mod.goals.length} kazanıldı
                  </Text>
                </View>
                <View style={[styles.tr, styles.thRow, { borderTopWidth: 1, borderLeftWidth: 1, borderColor: LINE }]}>
                  <View style={[styles.cell, styles.colCode]}><Text style={styles.th}>Kod</Text></View>
                  <View style={[styles.cell, styles.colGoal]}><Text style={styles.th}>Hedef</Text></View>
                  <View style={[styles.cell, styles.colStatus]}><Text style={styles.th}>Durum</Text></View>
                  <View style={[styles.cell, styles.colNote]}><Text style={styles.th}>Not</Text></View>
                </View>
              </View>
              <View style={[styles.table, { borderTopWidth: 0 }]}>
                {mod.goals.map(({ goal, progress }, gi) => (
                  <View key={gi} style={styles.tr} wrap={false}>
                    <View style={[styles.cell, styles.colCode]}><Text>{goal.code}</Text></View>
                    <View style={[styles.cell, styles.colGoal]}><Text>{goal.title}</Text></View>
                    <View style={[styles.cell, styles.colStatus]}>
                      <Text>{progress ? (STATUS_LABEL[progress.status] ?? progress.status) : "Başlanmamış"}</Text>
                    </View>
                    <View style={[styles.cell, styles.colNote]}><Text>{progress?.notes ?? ""}</Text></View>
                  </View>
                ))}
              </View>
            </View>
          );
        })}

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
  a.download = `Hedef_Takip_${data.student.name.replace(/\s+/g, "_")}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
