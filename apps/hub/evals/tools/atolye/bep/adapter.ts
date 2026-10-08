// apps/hub/evals/tools/atolye/bep/adapter.ts
import { ALAN } from "@atolye/lib/bep";
import { TANI_LABEL } from "@atolye/lib/ogrenci-profili";
import { KADEME_TR, ORTAK_OLCUTLER, parseSse, type AtolyeFixture, type CaseDef, type Fixture, type ToolAdapter } from "../../../lib/core";
import { bepChecks, type BepBody } from "./checks";

const GENERIC_BULLETS = [
  "Çok duyulu yaklaşım kullanın.",
  "Bireysel farklılıklara dikkat edin.",
  "Düzenli tekrar önemlidir.",
  "Gelişimini takip edin.",
];

export const adapter: ToolAdapter<BepBody> = {
  id: "atolye/bep",
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
        outputType: "bep_hedef",
        rumuz: f.code,
        kademe: f.kademe,
        ...(f.yas ? { yas: f.yas } : {}),
        gucluYonler: body.gucluYonler ?? f.gucluYonler ?? "",
        ekNotlar: body.ekNotlar ?? "",
        mebDavranisKodlari: body.mebDavranisKodlari ?? [],
        ...body,
      }),
    });
    const res = await POST(request as never);
    return parseSse(await res.text(), res.status);
  },

  extractOutput: (b) => b.text,

  renderTask(c: CaseDef<BepBody>, fixture: Fixture | null) {
    const f = fixture as AtolyeFixture;
    return [
      "İSTEK",
      "- Araç: BEP hedef taslağı (MEB ÖÖG destek eğitim programına hizalı; alan başına uzun/kısa dönem hedef + yöntem + ölçme)",
      `- Öğrenci: ${f.code}, ${KADEME_TR[f.kademe]}${f.yas ? `, ${f.yas} yaş` : ""} · Güçlük profili: ${f.taniProfili.map((t) => TANI_LABEL[t as keyof typeof TANI_LABEL] ?? t).join(", ")}`,
      `- Güçlü yönler: ${c.body.gucluYonler ?? f.gucluYonler ?? "—"} · İlgi alanları: ${f.ilgiAlanlari ?? "—"}`,
      `- Hedef alanlar: ${c.body.alanlar.map((a) => ALAN[a]).join(", ")}`,
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
    return t.length > 14_000 ? t.slice(0, 14_000) + "\n…(kesildi)" : t;
  },

  checks: bepChecks,

  criteria: [
    ...ORTAK_OLCUTLER,
    { key: "hedef_olculebilirlik", question: "Kısa dönem hedefler gözlenebilir davranış + ölçüt (%/oran/sıklık) + koşul formülünde mi; uzun dönem amaçla tutarlı mı?" },
    { key: "meb_hizasi", question: "MEB destek eğitim programı çerçevesi ve ölçme aşamaları doğru kullanılmış mı; MEB kodu verildiyse hedefler ona demirli mi?" },
  ],

  genericCandidate(output) {
    const t = typeof output === "string" ? output : "";
    let i = 0;
    return t
      .split("\n")
      .map((l) => (/^\s*[-*]\s+/.test(l) ? `- ${GENERIC_BULLETS[i++ % GENERIC_BULLETS.length]}` : l))
      .join("\n");
  },
};
