// apps/hub/evals/tools/studio/session-summary/adapter.ts
import { studioAdapter } from "../../../lib/adapterFactory";
import { str } from "../../../lib/sharedChecks";
import { sessionSummaryChecks, type SessionSummaryBody } from "./checks";

type Rec = Record<string, unknown>;

/** Route'taki SESSION_TYPE_LABEL / PERFORMANCE_LABEL ile aynı. */
const TYPE_TR: Record<SessionSummaryBody["sessionType"], string> = {
  individual: "Bireysel Oturum",
  group: "Grup Oturumu",
  assessment: "Değerlendirme Oturumu",
  parent_meeting: "Veli Görüşmesi",
};
const PERF_TR: Record<SessionSummaryBody["overallPerformance"], string> = {
  above_target: "Beklenenin Üstünde",
  on_target: "Hedefle Uyumlu",
  progressing: "Gelişim Gösteriyor",
  needs_support: "Ek Destek Gerekiyor",
  not_assessed: "Değerlendirme Yapılamadı",
};

export const adapter = studioAdapter<SessionSummaryBody>({
  id: "studio/session-summary",
  label: "Oturum özeti (Studio)",
  dir: import.meta.dirname,
  route: () => import("@/app/studio/api/tools/session-summary/route"),
  responseKey: "summary",
  studentRequired: true,

  requestLines: (b) =>
    [
      `- Tarih: ${b.sessionDate} · Süre: ${b.duration} dk · Tür: ${TYPE_TR[b.sessionType]} · Genel performans: ${PERF_TR[b.overallPerformance]}`,
      "- Girilen hedefler (yüzde ve ipucu düzeyi UZMANIN verisidir, değişmemeli):",
      ...b.goals.map((g, i) => `  ${i + 1}. ${g.goalTitle} — %${g.accuracy}, ipucu: ${g.cueLevel}`),
      b.behaviorNotes ? `- Davranış gözlemi: ${b.behaviorNotes}` : "",
      b.nextSessionNotes ? `- Sonraki oturum notu: ${b.nextSessionNotes}` : "",
    ].filter(Boolean),

  renderOutput(o) {
    const s = o as Rec; // JSON modu: çıktı nesnesi
    const perf = (Array.isArray(s.goalPerformance) ? s.goalPerformance : []) as Rec[];
    const info = (s.sessionInfo ?? {}) as Rec;
    return [
      `Başlık: ${str(s.title) || "—"}`,
      `Oturum: ${[str(info.date), str(info.duration), str(info.type)].filter(Boolean).join(" · ") || "—"}`,
      "Hedef performansı:",
      ...perf.map((p, i) => `  ${i + 1}. ${str(p.goal)} — ${str(p.accuracy)} — ${str(p.cueLevel)}\n     Analiz: ${str(p.analysis)}\n     Öneri: ${str(p.recommendation)}`),
      `Genel değerlendirme: ${str(s.overallAssessment) || "—"}`,
      `Davranış notları: ${str(s.behaviorNotes) || "—"}`,
      `Sonraki oturum planı: ${str(s.nextSessionPlan) || "—"}`,
      `Veli notu: ${str(s.parentNote) || "—"}`,
      `Uzman notları: ${str(s.expertNotes) || "—"}`,
    ].join("\n");
  },

  checks: sessionSummaryChecks,

  criteria: [
    {
      key: "veri_sadakati",
      question:
        "Girilen yüzdeler ve ipucu düzeyleri aynen korunmuş, analizler bu verilerden türetilmiş mi; uydurulmuş sayı, gözlem ya da ilerleme iddiası yok mu?",
    },
    {
      key: "veli_ozeti",
      question: "Veli notu 3–5 cümle, teknik terimsiz, somut ve cesaretlendirici mi; uzman notlarıyla çelişmiyor mu?",
    },
  ],

  // Fabrika çıktının derin kopyasını verir (çıktı yoksa `{}`).
  generic(o) {
    const s = o as Rec;
    const perf = (Array.isArray(s.goalPerformance) ? s.goalPerformance : []) as Rec[];
    return {
      ...s,
      goalPerformance: perf.map((p) => ({ ...p, analysis: "Gelişim gösteriyor.", recommendation: "Düzenli tekrar önemlidir." })),
      overallAssessment: "Genel olarak iyi bir oturumdu.",
      parentNote: "Bugün çalıştık. Evde tekrar edin. Gelişimini takip edin.",
      expertNotes: "Çok duyulu yaklaşım kullanın.",
    };
  },
});
