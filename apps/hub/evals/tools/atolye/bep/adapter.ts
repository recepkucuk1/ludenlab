// apps/hub/evals/tools/atolye/bep/adapter.ts
import { ALAN } from "@atolye/lib/bep";
import { ORTAK_OLCUTLER, parseSse, type AtolyeFixture, type CaseDef, type Fixture, type ToolAdapter } from "../../../lib/core";
import { renderAtolyeCase } from "../../../lib/renderStudent";
import { AYRAC, MADDE, TABLO, TASLAK_NORM, baslikMi, bepChecks, notNormu, type BepBody } from "./checks";

/** Rakamsız jenerik cümleler: jenerik adayda hiçbir hedef ölçüt taşımasın. */
const GENERIC_SENTENCES = [
  "Çok duyulu yaklaşım kullanın.",
  "Bireysel farklılıklara dikkat edin.",
  "Düzenli tekrar önemlidir.",
  "Gelişimini takip edin.",
];

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

  /** Başlıklar, tablo başlık/ayraç satırları ve taslak notu kalır; diğer her içerik satırı (madde, numaralı
      madde, tablo gövde hücresi, düz paragraf) sırayla dönen jenerik cümlelerle değiştirilir. */
  genericCandidate(output) {
    const lines = (typeof output === "string" ? output : "").split("\n");
    let i = 0;
    const g = () => GENERIC_SENTENCES[i++ % GENERIC_SENTENCES.length]!;
    let son = lines.length - 1;
    while (son >= 0 && !lines[son]!.trim()) son--;
    return lines
      .map((l, k) => {
        if (!l.trim() || /^\s*#{1,6}\s/.test(l) || baslikMi(l)) return l;
        if (notNormu(l).includes(TASLAK_NORM) || (k === son && l.includes("⚠"))) return l;
        if (TABLO.test(l)) {
          if (AYRAC.test(l) || AYRAC.test(lines[k + 1] ?? "x")) return l;
          const n = Math.max(1, l.trim().replace(/^\||\|$/g, "").split("|").length);
          return `| ${Array.from({ length: n }, g).join(" | ")} |`;
        }
        const m = MADDE.exec(l);
        return m ? `${m[1]}${m[2]} ${g()}` : g();
      })
      .join("\n");
  },
};
