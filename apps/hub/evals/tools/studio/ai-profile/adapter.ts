// apps/hub/evals/tools/studio/ai-profile/adapter.ts
import { HarnessError } from "../../../lib/core";
import { studioAdapter } from "../../../lib/adapterFactory";
import { genericMarkdown } from "../../../lib/markdown";
import { HR, PROFIL_BOLUMLERI, profileChecks, type ProfileBody } from "./checks";

export const adapter = studioAdapter<ProfileBody>({
  id: "studio/ai-profile",
  label: "AI öğrenci profili (Studio)",
  dir: import.meta.dirname,
  // Rota gövde almaz: öğrenci kimliği yoldadır (`students/[id]/ai-profile`).
  send: async (_body, fixtureId) => {
    if (!fixtureId) throw new HarnessError("studio/ai-profile vakası öğrencisiz olamaz", "harness_error");
    const { POST } = await import("@/app/studio/api/students/[id]/ai-profile/route");
    const req = new Request(`http://eval.local/studio/api/students/${fixtureId}/ai-profile`, { method: "POST" });
    return POST(req as never, { params: Promise.resolve({ id: fixtureId }) });
  },
  responseKey: "aiProfile",
  studentRequired: true,
  output: "markdown",
  sections: PROFIL_BOLUMLERI,

  requestLines: (b) => [
    "- Araca giden alanlar: ad (rumuz), yaş, çalışma alanı, tanı ve ortak öğrenci bloğu (atanmış müfredat modülleri, uzman notları, son kartlar, son oturum özeti, tamamlanan ve sürmekte olan hedefler). Mevcut AI profili araca GİTMEZ (yeniden üretim): öğrenci bloğundaki profil satırları yalnız bağlam içindir.",
    ...(b.modulSayisi === 0
      ? ["- Atanmış müfredat modülü yok: istemde modül satırı bulunmaz; 'Müfredat Modülleriyle İlişki' bölümü modül uydurmamalı (kısa ve dürüst olabilir)."]
      : []),
    "- İstenen yapı (sistem prompt'u): '## Kavramsal Arka Plan' (Tanının Klinik Açıklaması, Bu Yaş Grubunda Beklenen Gelişim, Müfredat Modülleriyle İlişki: her biri 3-5 cümle), '---', '## Uzmana Öneriler' (Öncelikli Çalışma Alanları: en önemli 3-5 hedef; Etkili Yaklaşım ve Teknikler; Dikkat Edilmesi Gereken Noktalar; Aile ile Paylaşılabilecek Öneriler), başka hiçbir şey eklenmeden.",
    "- Not: 'Tanının Klinik Açıklaması' uzmanın girdiği tanıyı açıklar; verilen tanıyı açıklamak hata değildir, yeni bir tanı koymak ya da atfetmek hatadır.",
  ],

  checks: profileChecks,

  criteria: [
    {
      key: "klinik_dogruluk",
      question:
        "Tanı açıklaması ve yaş grubu beklentileri klinik olarak doğru ve güncel mi; genelleme ya da uydurma iddia yok mu (verilmeyen modül, tanı ya da öykü eklenmemiş mi)? Yetişkin öğrencide çocuk gelişimi ya da çocuk varsayımı yok mu?",
    },
    {
      key: "eyleme_donukluk",
      question:
        "Uzmana öneriler bu öğrenci için hemen uygulanabilir, somut teknik ve örnek içeriyor mu (uzman notlarındaki ve ilgi alanlarındaki somut veriler öneriye dönüşmüş mü); aile önerileri sade ve yapılabilir mi (yetişkinde aile yerine eş/yakın çevre ve iş bağlamı)?",
    },
  ],

  // Markdown araçta jenerik aday `genericMarkdown`dır (içerik satırları dönen jenerik cümlelerle değişir, başlıklar kalır). Ayraç (`---`) da kalsın:
  // hakem yapıyı değil içeriği kıyaslasın. `genericMarkdown` satır sayısını korur, bu yüzden ayraçlar satır konumundan geri konur.
  generic(o) {
    const metin = typeof o === "string" ? o : "";
    const asil = metin.split("\n");
    return genericMarkdown(metin)
      .split("\n")
      .map((l, i) => (HR.test(asil[i] ?? "") ? (asil[i] as string) : l))
      .join("\n");
  },
});
