// apps/hub/evals/tools/studio/homework/adapter.ts
import { studioAdapter } from "../../../lib/adapterFactory";
import { str } from "../../../lib/sharedChecks";
import { homeworkChecks, type HomeworkBody } from "./checks";

type Rec = Record<string, unknown>;

/** Route'taki PARENT_LEVEL_LABEL / MATERIAL_TYPE_LABEL ile aynı (hakem, modelin gördüğü tanımı görsün). */
const LEVEL_TR: Record<HomeworkBody["parentLevel"], string> = {
  basic: "Temel (basit anlatım, teknik terim yok)",
  detailed: "Detaylı (daha fazla açıklama, bazı teknik bilgi)",
};
const TYPE_TR: Record<HomeworkBody["materialType"], string> = {
  exercise: "Ev egzersizi (adım adım yapılandırılmış aktivite)",
  observation: "Gözlem formu (velinin çocuğu gözlemleyip not alacağı form)",
  daily_activity: "Günlük konuşma aktivitesi (günlük rutinlere entegre edilecek aktivite)",
};
const GENERIC = ["Çocuğunuzla düzenli çalışın.", "Sabırlı olun.", "Olumlu pekiştirme yapın.", "Gelişimini takip edin."];

export const adapter = studioAdapter<HomeworkBody>({
  id: "studio/homework",
  label: "Ev ödevi materyali (Studio)",
  dir: import.meta.dirname,
  route: () => import("@/app/studio/api/tools/homework/route"),
  responseKey: "homework",
  studentRequired: true,

  requestLines: (b) =>
    [
      `- Hedef alan: ${b.targetArea} · Süre: ${b.duration} dk · Veli düzeyi: ${LEVEL_TR[b.parentLevel]} · Tür: ${TYPE_TR[b.materialType]}`,
      b.extraNote ? `- Uzman notu: ${b.extraNote}` : "",
    ].filter(Boolean),

  renderOutput(o) {
    const h = o as Rec; // JSON modu: çıktı nesnesi
    const steps = (Array.isArray(h.steps) ? h.steps : []) as Rec[];
    return [
      `Başlık: ${str(h.title) || "—"}`,
      `Giriş: ${str(h.introduction) || "—"}`,
      `Materyaller: ${(Array.isArray(h.materials) ? h.materials : []).map(String).join(", ") || "—"}`,
      "Adımlar:",
      ...steps.map((s) => `  ${String(s.stepNumber)}. ${str(s.instruction)}${str(s.tip) ? ` (ipucu: ${str(s.tip)})` : ""}`),
      `Dikkat: ${str(h.watchFor) || "—"}`,
      `Kutlama: ${str(h.celebration) || "—"}`,
      `Sıklık: ${str(h.frequency) || "—"}`,
      `Uzman notları: ${str(h.expertNotes) || "—"}`,
      `Uyarlamalar: ${str(h.adaptations) || "—"}`,
    ].join("\n");
  },

  checks: homeworkChecks,

  criteria: [
    {
      key: "veli_dili",
      question:
        "Metin veliye hitap ediyor mu: öneri kipi, günlük dil, istenen düzeyde (temel/detaylı) terim yoğunluğu; yetişkin öğrencide 'veli' yerine uygun muhatap?",
    },
    {
      key: "sure_uyumu",
      question:
        "Adımlar ve sıklık istenen süreye (10/15/20 dk) gerçekçi biçimde sığıyor mu; çocuğun yaşına ve dikkat süresine uygun mu?",
    },
  ],

  // Fabrika çıktının derin kopyasını verir (çıktı yoksa `{}`).
  generic(o) {
    const h = o as Rec;
    const steps = (Array.isArray(h.steps) ? h.steps : []) as Rec[];
    return {
      ...h,
      introduction: GENERIC[0],
      steps: steps.map((s, i) => ({ ...s, instruction: GENERIC[i % GENERIC.length], tip: "" })),
      watchFor: GENERIC[3],
      expertNotes: "Düzenli tekrar önemlidir.",
      adaptations: "Bireysel farklılıklara dikkat edin.",
    };
  },
});
