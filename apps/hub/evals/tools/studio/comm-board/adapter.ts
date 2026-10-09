// apps/hub/evals/tools/studio/comm-board/adapter.ts
import { studioAdapter } from "../../../lib/adapterFactory";
import { kayitlar, str } from "../../../lib/sharedChecks";
import { commBoardChecks, type CommBoardBody } from "./checks";

type Rec = Record<string, unknown>;

/** Route'taki BOARD_TYPE_LABEL ve parametre satırlarının AYNI metinleri (hakem, modelin gördüğünü görsün). */
const BOARD_TR: Record<CommBoardBody["boardType"], string> = {
  basic_needs: "Temel İhtiyaçlar",
  emotions: "Duygular",
  daily_routines: "Günlük Rutinler",
  school: "Okul Aktiviteleri",
  social: "Sosyal İfadeler",
  requests: "İstek ve Seçim",
  custom: "Özel",
};
const GRID: Record<CommBoardBody["symbolCount"], string> = { 4: "2×2", 6: "2×3", 9: "3×3", 12: "3×4" };
const sayiMetni = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? String(v) : "?");
const GENERIC_KALIP = ["Sabırlı olun.", "Olumlu pekiştirme yapın.", "Düzenli tekrar önemlidir."];

export const adapter = studioAdapter<CommBoardBody>({
  id: "studio/comm-board",
  label: "İletişim panosu (Studio, AAC)",
  dir: import.meta.dirname,
  route: () => import("@/app/studio/api/tools/comm-board/route"),
  responseKey: "board",
  studentRequired: false,

  requestLines: (b) => [
    `- Pano türü: ${b.boardType === "custom" && b.customCategory ? `Özel — ${b.customCategory}` : BOARD_TR[b.boardType]}`,
    `- Sembol sayısı: ${b.symbolCount} (${GRID[b.symbolCount]} grid)`,
    `- Düzen: ${b.layout === "grid" ? "Grid" : "Satır (iletişim şeridi)"}`,
    `- Metin modu: ${b.textMode === "word_only" ? "Sadece kelime" : "Kelime + kısa cümle"}`,
    `- Fitzgerald renk kodlaması: ${b.colorCoding ? "Evet" : "Hayır"}`,
  ],

  renderOutput(o) {
    const b = o as Rec; // JSON modu: çıktı nesnesi
    const cells = kayitlar(b.cells);
    return [
      `Başlık: ${str(b.title) || "—"} (${sayiMetni(b.rows)}×${sayiMetni(b.cols)})`,
      ...cells.map(
        (c, i) =>
          `${sayiMetni(c.position === undefined ? i + 1 : c.position)}. ${str(c.word) || "—"}${str(c.sentence) ? ` — "${str(c.sentence)}"` : ""} [${str(c.category) || "?"}/${str(c.fitzgeraldColor) || "?"}]\n` +
          `   görsel: ${str(c.visualDescription) || "—"} · üretim komutu: ${str(c.visualPrompt) || "—"} · kullanım: ${str(c.usage) || "—"}`,
      ),
      `Yönerge: ${str(b.instructions) || "—"}`,
      `Uzman notları: ${str(b.expertNotes) || "—"}`,
      `Ev rehberi: ${str(b.homeGuidance) || "—"}`,
      `Uyarlamalar: ${str(b.adaptations) || "—"}`,
    ].join("\n");
  },

  checks: commBoardChecks,

  criteria: [
    {
      key: "aac_uygunluk",
      question:
        "Sembol seçimi AAC ilkelerine uygun mu: çekirdek sözcükler + istek/ret/yorum gibi iletişim işlevleri, öğrencinin düzeyine ve pano türüne göre; kullanım notları gerçekçi mi?",
    },
    {
      key: "sembol_netligi",
      question: "Her hücrenin görsel tanımı tek, somut, çocuk-dostu bir simge mi (metin yok); kelime–görsel–cümle birbirini tutuyor mu?",
    },
  ],

  // Fabrika çıktının derin kopyasını verir (çıktı yoksa `{}`). Hücre sayısı, kelime, kategori/renk, cümle ve görsel komutu
  // korunur (yapı ve ızgara aynı); yorum metinleri ve kullanım/görsel tanımı jenerik olur. Yasak kalıplar SABİT
  // (üst düzey) alanlardan gelir: tek hücreli kısa çıktıda da ≥ 4 kalıp taşınır.
  generic(o) {
    const b = o as Rec;
    return {
      ...b,
      cells: kayitlar(b.cells).map((c) => ({ ...c, usage: "İhtiyaç duyduğunda gösterir.", visualDescription: "Bir nesne." })),
      instructions: `Panoyu düzenli kullanın. ${GENERIC_KALIP[0]}`,
      expertNotes: "Bireysel farklılıklara dikkat edin.",
      homeGuidance: "Uygun ortam sağlayın ve gelişimini takip edin.",
      adaptations: `Gerekirse uyarlayın. ${GENERIC_KALIP[1]} ${GENERIC_KALIP[2]}`,
    };
  },
});
