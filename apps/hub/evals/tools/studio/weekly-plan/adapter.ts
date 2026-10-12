// apps/hub/evals/tools/studio/weekly-plan/adapter.ts
import { studioAdapter } from "../../../lib/adapterFactory";
import { kayitlar, nesne, str } from "../../../lib/sharedChecks";
import { weeklyPlanChecks, type WeeklyPlanBody } from "./checks";

type Rec = Record<string, unknown>;

/** Route'taki "Planlama yaklaşımı" satırının AYNI metinleri (hakem, modelin gördüğünü görsün). */
const APPROACH_TR: Record<WeeklyPlanBody["planApproach"], string> = {
  ai: "Öğrenci profiline ve geçmişe göre AI otomatik önersin",
  guided: "Seçilen odak alanlarına göre yönlendirilmiş plan",
};
/** Route'un "Dersler" listesi: gün başına ders sayısı kadar satır; günde birden çok ders varsa "(n. ders / günde N ders)". */
const dersSatirlari = (b: WeeklyPlanBody): string[] =>
  b.daySchedule
    .flatMap(({ dayName, lessonCount }) => Array.from({ length: lessonCount }, (_, li) => `${dayName}${lessonCount > 1 ? ` (${li + 1}. ders / günde ${lessonCount} ders)` : ""}`))
    .map((s, i) => `  ${i + 1}. ${s}`);

/** Metin listesi: metin olmayan öğe "—" görünür (sayı kontrollerle aynı: öğe sayısı korunur). */
const ogeler = (v: unknown) => (Array.isArray(v) ? v : []).map((x) => (typeof x === "string" && x.trim() ? x : "—"));
const blok = (b: unknown, ad: string, ekler: string[] = []) => {
  const x = nesne(b);
  return [`${ad}: ${str(x.activity) || "—"} (${str(x.duration) || "?"})`, ...ekler].join(" · ");
};
const GENERIC_ADIM = ["Başla", "Devam et", "Bitir"];

export const adapter = studioAdapter<WeeklyPlanBody>({
  id: "studio/weekly-plan",
  label: "Haftalık çalışma planı (Studio)",
  dir: import.meta.dirname,
  route: () => import("@/app/studio/api/tools/weekly-plan/route"),
  responseKey: "plan",
  studentRequired: true,

  requestLines: (b) =>
    [
      `- Hafta: ${b.weekStart} başlangıçlı · Ders süresi: ${b.sessionDuration} dakika`,
      "- Dersler (days dizisi bu sırayı izlesin):",
      ...dersSatirlari(b),
      `- Odak alanları: ${b.focusAreas.join(", ")}`,
      `- Planlama yaklaşımı: ${APPROACH_TR[b.planApproach]}`,
      b.extraNote ? `- Ek notlar: ${b.extraNote}` : "",
      "- Not: gün adı, tarih ve ders süresi sistem tarafından eklenir; model yalnız içerik üretir.",
    ].filter(Boolean),

  renderOutput(o) {
    const p = o as Rec; // JSON modu: çıktı nesnesi
    const days = kayitlar(p.days);
    return [
      `Başlık: ${str(p.title) || "—"}`,
      `Öğrenci özeti: ${str(p.studentSummary) || "—"}`,
      `Haftalık hedef: ${str(p.weeklyGoal) || "—"}`,
      `Dersler (${days.length}):`,
      ...days.map((d, i) => {
        const w = nesne(d.warmup);
        const m = nesne(d.mainWork);
        const no = typeof d.dayNumber === "number" || typeof d.dayNumber === "string" ? String(d.dayNumber) : String(i + 1);
        const gun = [str(d.dayName), str(d.date)].filter(Boolean).join(" "); // sistem ekler; ham çıktıda yok
        return [
          `  ${no}. ${gun ? `${gun} — ` : ""}${str(d.focusArea)}: ${str(d.objective)}`,
          `     ${blok(w, "Isınma", [`Materyal: ${ogeler(w.materials).join(", ") || "—"}`])}`,
          `     ${blok(m, "Ana çalışma", [`Adımlar: ${ogeler(m.steps).join(" / ") || "—"}`, `Materyal: ${ogeler(m.materials).join(", ") || "—"}`, `Hedefler: ${ogeler(m.targetGoals).join(", ") || "—"}`])}`,
          `     ${blok(d.closing, "Kapanış")}`,
          ...(str(d.notes) ? [`     Not: ${str(d.notes)}`] : []),
        ].join("\n");
      }),
      `Materyaller: ${ogeler(p.materialsNeeded).join(", ") || "—"}`,
      `Veli iletişimi: ${str(p.parentCommunication) || "—"}`,
      `Uzman notları: ${str(p.expertNotes) || "—"}`,
      `Gelecek hafta: ${str(p.nextWeekSuggestion) || "—"}`,
    ].join("\n");
  },

  checks: weeklyPlanChecks,

  criteria: [
    {
      key: "progresyon",
      question: "Dersler hafta içinde birbirinin üzerine kuruluyor mu (kolaydan zora, ipucu azaltma, genelleme); aynı etkinlik tekrarlanmıyor mu?",
    },
    {
      key: "gecmis_baglanti",
      question: "Plan son kartlara, son oturum özetine ve müfredat modüllerine açıkça bağlanıyor mu (ör. son özetteki sonraki hedefi ilk derse alma)?",
    },
  ],

  // Fabrika çıktının derin kopyasını verir (çıktı yoksa `{}`). Ders sayısı, odak alanı, süreler, adım sayısı ve sistemin
  // eklediği gün/tarih korunur; içerik jenerik kalıplarla değişir. Yasak kalıplar SABİT (üst düzey) alanlardan gelir:
  // tek derslik kısa çıktıda da ≥ 4 kalıp (8'inin hepsi) taşınır.
  generic(o) {
    const p = o as Rec;
    return {
      ...p,
      studentSummary: "Öğrenci gelişim gösteriyor.",
      days: kayitlar(p.days).map((d) => {
        const m = nesne(d.mainWork);
        return {
          ...d,
          objective: "Becerileri geliştirmek.",
          mainWork: { ...m, activity: "Çok duyulu yaklaşımla çalışma.", steps: ogeler(m.steps).map((_, i) => GENERIC_ADIM[i % GENERIC_ADIM.length]) },
        };
      }),
      weeklyGoal: "Gelişimini takip edin ve motivasyonu yüksek tutun.",
      parentCommunication: "Sabırlı olun ve uygun ortam sağlayın.",
      expertNotes: "Düzenli tekrar önemlidir. Çok duyulu yaklaşım kullanın.",
      nextWeekSuggestion: "Olumlu pekiştirme yapın. Bireysel farklılıklara dikkat edin.",
    };
  },
});
