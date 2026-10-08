// apps/hub/evals/tools/studio/social-story/adapter.ts
import { HarnessError, ORTAK_OLCUTLER, parseSse, type CaseDef, type Fixture, type StudioFixture, type ToolAdapter } from "../../../lib/core";
import { RUMUZ_NOTU, renderStudioStudent } from "../../../lib/renderStudent";
import { str } from "../../../lib/sharedChecks";
import { socialStoryChecks, type SocialStoryBody } from "./checks";

const LENGTH_TR: Record<SocialStoryBody["length"], string> = { short: "Kısa (3–5 cümle)", medium: "Orta (6–10 cümle)", long: "Uzun (11–15 cümle)" };
const TYPE_TR: Record<string, string> = { descriptive: "tanımlayıcı", perspective: "perspektif", directive: "yönlendirici", affirmative: "olumlu" };

const GENERIC_SENTENCES = [
  "Okulda ve evde kurallara uymak önemlidir.",
  "Herkes sakin olmalıdır.",
  "Ben iyi davranmalıyım.",
  "Böylece her şey güzel olur.",
];

export const adapter: ToolAdapter<SocialStoryBody> = {
  id: "studio/social-story",
  label: "Sosyal hikâye (Studio)",
  module: "studio",
  dir: import.meta.dirname,

  async invoke(body, fixtureId) {
    if (!fixtureId) throw new HarnessError("sosyal hikâye vakası öğrencisiz olamaz (route studentId ister)", "harness_error");
    const { POST } = await import("@/app/studio/api/tools/social-story/route");
    const request = new Request("http://eval.local/studio/api/tools/social-story", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...body, studentId: fixtureId }),
    });
    const res = await POST(request as never);
    return parseSse(await res.text(), res.status);
  },

  extractOutput: (b) => b.story,

  renderTask(c: CaseDef<SocialStoryBody>, fixture: Fixture | null) {
    const f = fixture as StudioFixture | null;
    return [
      "İSTEK",
      "- Araç: Sosyal hikâye (Carol Gray biçimi; her cümleye İngilizce görsel sahne tanımı)",
      `- Durum: ${c.body.situation} · Ortam: ${c.body.environment} · Uzunluk: ${LENGTH_TR[c.body.length]}`,
      ...(f ? [renderStudioStudent(f), RUMUZ_NOTU] : ["- Öğrenci seçilmedi."]),
      `- Neyi sınıyor: ${c.purpose}`,
    ].join("\n");
  },

  renderForJudge(output) {
    const s = (output ?? null) as Record<string, unknown> | null;
    if (!s) return "(Çıktı üretilemedi — uzman bir hata mesajı gördü.)";
    const sents = (Array.isArray(s.sentences) ? s.sentences : []) as Record<string, unknown>[];
    return [
      `Başlık: ${str(s.title) || "—"}`,
      `Cümleler (${sents.length}):`,
      ...sents.map((x, i) => {
        const t = str(x.type);
        return `${i + 1}. [${TYPE_TR[t] ?? (t || "?")}] ${str(x.text)}\n   → görsel: ${str(x.visualPrompt) || "—"}`;
      }),
      `Uzman notları: ${str(s.expertNotes) || "—"}`,
      `Veli rehberi: ${str(s.homeGuidance) || "—"}`,
    ].join("\n");
  },

  checks: socialStoryChecks,

  criteria: [
    ...ORTAK_OLCUTLER,
    {
      key: "gray_oranlari",
      question:
        "Carol Gray oranı: betimleyici cümleler (tanımlayıcı + perspektif + olumlu) yönlendiricilerin en az iki katı mı; yönlendiriciler 'deneyebilirim/yapabilirim' dilinde, birinci tekil kişi, yaşa uygun kelime mi?",
    },
    { key: "gorsel_uyum", question: "Her cümlenin İngilizce görsel tanımı o cümlenin sahnesini somut ve çocuk-dostu biçimde anlatıyor mu (çeviri değil, sahne)?" },
  ],

  genericCandidate(output) {
    const s = structuredClone((output ?? {}) as Record<string, unknown>);
    const sents = (Array.isArray(s.sentences) ? s.sentences : []) as Record<string, unknown>[];
    s.sentences = sents.map((x, i) => ({ ...x, text: GENERIC_SENTENCES[i % GENERIC_SENTENCES.length] }));
    s.expertNotes = "Sabırlı olun. Olumlu pekiştirme yapın. Düzenli tekrar önemlidir.";
    s.homeGuidance = "Uygun ortam sağlayın ve gelişimini takip edin.";
    return s;
  },
};
