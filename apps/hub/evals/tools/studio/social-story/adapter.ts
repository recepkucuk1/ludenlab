// apps/hub/evals/tools/studio/social-story/adapter.ts
import { studioAdapter } from "../../../lib/adapterFactory";
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

export const adapter = studioAdapter<SocialStoryBody>({
  id: "studio/social-story",
  label: "Sosyal hikâye (Studio)",
  dir: import.meta.dirname,
  route: () => import("@/app/studio/api/tools/social-story/route"),
  responseKey: "story",
  studentRequired: true,

  requestLines: (b) => [
    "- Biçim: Carol Gray biçimi; her cümleye İngilizce görsel sahne tanımı",
    `- Durum: ${b.situation} · Ortam: ${b.environment} · Uzunluk: ${LENGTH_TR[b.length]}`,
  ],

  renderOutput(o) {
    const s = o as Record<string, unknown>; // JSON modu: çıktı nesnesi
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
    {
      key: "gray_oranlari",
      question:
        "Carol Gray oranı: betimleyici cümleler (tanımlayıcı + perspektif + olumlu) yönlendiricilerin en az iki katı mı; yönlendiriciler 'deneyebilirim/yapabilirim' dilinde, birinci tekil kişi, yaşa uygun kelime mi?",
    },
    {
      key: "gorsel_uyum",
      question:
        "Her cümlenin İngilizce görsel tanımı o cümlenin sahnesini somut ve çocuk-dostu biçimde anlatıyor mu (çeviri değil, sahne)?",
    },
  ],

  // Fabrika çıktının derin kopyasını verir (çıktı yoksa `{}`).
  generic(output) {
    const s = output as Record<string, unknown>;
    const sents = (Array.isArray(s.sentences) ? s.sentences : []) as Record<string, unknown>[];
    s.sentences = sents.map((x, i) => ({ ...x, text: GENERIC_SENTENCES[i % GENERIC_SENTENCES.length] }));
    s.expertNotes = "Sabırlı olun. Olumlu pekiştirme yapın. Düzenli tekrar önemlidir.";
    s.homeGuidance = "Uygun ortam sağlayın ve gelişimini takip edin.";
    return s;
  },
});
