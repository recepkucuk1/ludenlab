// apps/hub/evals/tools/atolye/bep/adapter.ts
import { ALAN } from "@atolye/lib/bep";
import { ORTAK_OLCUTLER, parseSse, type AtolyeFixture, type CaseDef, type Fixture, type ToolAdapter } from "../../../lib/core";
import { genericMarkdown } from "../../../lib/markdown";
import { renderAtolyeCase } from "../../../lib/renderStudent";
import { bepChecks, type BepBody } from "./checks";

/** Fikstürde olup araca GİTMEYEN alanlar (bepInputSchema + bep-prompts `profil()`): hakem özgüllüğü bunlarla ölçmesin. */
const HAKEM_NOTU =
  "- (Hakem notu: güçlük profili, güçlük düzeyi, ilgi alanları, çalışılan MEB bölümleri ve önceki belgeler araca İLETİLMEDİ; özgüllüğü yalnız araca giden alanlara göre değerlendir — ad, kademe, yaş, hedef alanlar, güçlü yönler, güçlük alanları, ek notlar, MEB kodu.)";

const HAKEM_KESIT = 60_000;

export const adapter: ToolAdapter<BepBody> = {
  id: "atolye/bep",
  label: "BEP hedef taslağı (Atölye)",
  module: "atolye",
  dir: import.meta.dirname,

  async invoke(body, fixtureId) {
    const { resolveFixture } = await import("../../../lib/fixtures");
    const f = resolveFixture("atolye", fixtureId) as AtolyeFixture | null;
    if (!f) throw new Error("BEP vakası fikstürsüz olamaz (rumuz zorunlu)");
    const { POST } = await import("@/app/atolye/api/bep/route");
    const request = new Request("http://eval.local/atolye/api/bep", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        // Önce vaka gövdesi, sonra hesaplanan varsayılanlar, en son kimlik: vaka kimliği ezemez.
        ...body,
        gucluYonler: body.gucluYonler ?? f.gucluYonler ?? "",
        ekNotlar: body.ekNotlar ?? "",
        mebDavranisKodlari: body.mebDavranisKodlari ?? [],
        outputType: "bep_hedef",
        rumuz: f.code,
        kademe: f.kademe,
        ...(f.yas ? { yas: f.yas } : {}),
      }),
    });
    const res = await POST(request as never);
    return parseSse(await res.text(), res.status);
  },

  extractOutput: (b) => b.text,

  renderTask(c: CaseDef<BepBody>, fixture: Fixture | null) {
    const f = fixture as AtolyeFixture | null;
    return [
      "İSTEK",
      "- Araç: BEP hedef taslağı (MEB ÖÖG destek eğitim programına hizalı; alan başına uzun/kısa dönem hedef + yöntem + ölçme)",
      f ? renderAtolyeCase(f) : "- Öğrenci seçilmedi.",
      HAKEM_NOTU,
      `- Hedef alanlar: ${c.body.alanlar.map((a) => ALAN[a]).join(", ")}`,
      c.body.gucluYonler ? `- Güçlü yönler (istekte; araca giden): ${c.body.gucluYonler}` : "",
      `- Güçlük alanları / mevcut düzey: ${c.body.guclukAlanlari}`,
      c.body.ekNotlar ? `- Ek notlar: ${c.body.ekNotlar}` : "",
      c.body.mebHedefKod ? `- MEB hedef kodu: ${c.body.mebHedefKod}` : "",
      `- Neyi sınıyor: ${c.purpose}`,
    ]
      .filter(Boolean)
      .join("\n");
  },

  renderForJudge(output) {
    const t = typeof output === "string" ? output : "";
    if (!t.trim()) return "(Çıktı üretilemedi — uzman bir hata mesajı gördü.)";
    return t.length > HAKEM_KESIT ? t.slice(0, HAKEM_KESIT) + "\n…(kesildi)" : t;
  },

  checks: bepChecks,

  criteria: [
    ...ORTAK_OLCUTLER,
    { key: "hedef_olculebilirlik", question: "Kısa dönem hedefler gözlenebilir davranış + ölçüt (%/oran/sıklık) + koşul formülünde mi; uzun dönem amaçla tutarlı mı?" },
    { key: "meb_hizasi", question: "MEB destek eğitim programı çerçevesi ve ölçme aşamaları doğru kullanılmış mı; MEB kodu verildiyse hedefler ona demirli mi?" },
  ],

  genericCandidate: (output) => genericMarkdown(typeof output === "string" ? output : ""),
};
