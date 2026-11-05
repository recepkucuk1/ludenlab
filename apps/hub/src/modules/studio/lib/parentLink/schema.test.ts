import { describe, expect, it } from "vitest";
import { EASY_CHIPS, HARD_CHIPS, parentFeedbackSchema } from "./schema";

describe("parentFeedbackSchema", () => {
  it("geçerli gövde; easy/hard varsayılan boş; not trim", () => {
    const r = parentFeedbackSchema.parse({ days: 4, note: " iyi " });
    expect(r).toEqual({ days: 4, easy: [], hard: [], note: "iyi" });
  });
  it("days 0–7 tam sayı; dışı/ondalık/string red", () => {
    for (const d of [-1, 8, 3.5, "4"]) expect(parentFeedbackSchema.safeParse({ days: d }).success, String(d)).toBe(false);
    expect(parentFeedbackSchema.safeParse({ days: 0 }).success).toBe(true);
  });
  it("çipler katalogdan; tekrar ve bilinmeyen red; en çok katalog kadar", () => {
    expect(parentFeedbackSchema.safeParse({ days: 1, easy: ["istekle_oturdu", "oyunu_sevdi"] }).success).toBe(true);
    expect(parentFeedbackSchema.safeParse({ days: 1, easy: ["istekle_oturdu", "istekle_oturdu"] }).success).toBe(false);
    expect(parentFeedbackSchema.safeParse({ days: 1, hard: ["yok_boyle"] }).success).toBe(false);
    expect(EASY_CHIPS.map((c) => c.key)).toEqual(["istekle_oturdu", "soyledi", "oyunu_sevdi", "kendi_basladi"]);
    expect(HARD_CHIPS.map((c) => c.key)).toEqual(["oturmak_istemedi", "zorlandi", "zaman_bulamadik", "anlamadik"]);
  });
  it("not ≤300; 301 red; bilinmeyen anahtar atılır", () => {
    expect(parentFeedbackSchema.safeParse({ days: 1, note: "a".repeat(301) }).success).toBe(false);
    expect(parentFeedbackSchema.parse({ days: 1, pct: 9 })).not.toHaveProperty("pct");
  });
  it("sınırlar: days=7 ve 300 karakterlik not geçerli; boşluk-only not '' olur", () => {
    expect(parentFeedbackSchema.safeParse({ days: 7, note: "a".repeat(300) }).success).toBe(true);
    expect(parentFeedbackSchema.parse({ days: 2, note: "   " }).note).toBe("");
  });
});
