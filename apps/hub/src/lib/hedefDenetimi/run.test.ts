import { describe, expect, it, vi } from "vitest";
import { DenetimHatasi } from "./dogrula";
import { hedefDenetle, jsonDilimi } from "./run";

const usage = { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheCreationTokens: 0 };
const iyi = JSON.stringify({
  bilesenler: { davranis: { durum: "var", alinti: "okur" }, olcut: { durum: "eksik" }, kosul: { durum: "eksik" }, zaman: { durum: "eksik" }, taban: { durum: "eksik" } },
  mebUyum: null,
  sorular: [],
  ozet: "Ölçüt yok.",
});

describe("jsonDilimi", () => {
  it("ilk { … son } dilimini çözer; JSON yoksa / bozuksa DenetimHatasi", () => {
    expect(jsonDilimi(`İşte yanıt:\n${iyi}\nBitti.`)).toMatchObject({ ozet: "Ölçüt yok." });
    expect(() => jsonDilimi("düz metin")).toThrow(DenetimHatasi);
    expect(() => jsonDilimi("{ bozuk")).toThrow(DenetimHatasi);
  });
});

describe("hedefDenetle", () => {
  it("koşucuyu girdiyle çağırır, doğrular, model/usage geçirir", async () => {
    const calistir = vi.fn(async (_g: { hedef: string }) => ({ text: iyi, model: "claude-sonnet-4-6", usage, stopReason: "end_turn" as string | null }));
    const out = await hedefDenetle({ hedef: "10 kelimeyi okur" }, calistir);
    expect(calistir).toHaveBeenCalledWith({ hedef: "10 kelimeyi okur" });
    expect(out.sonuc.bilesenler.davranis).toEqual({ durum: "var", alinti: "okur", not: "" });
    expect(out.model).toBe("claude-sonnet-4-6");
    expect(out.usage).toBe(usage);
  });
  it("max_tokens kesintisi → DenetimHatasi", async () => {
    await expect(hedefDenetle({ hedef: "okur" }, async () => ({ text: iyi, model: "m", usage, stopReason: "max_tokens" }))).rejects.toThrow(DenetimHatasi);
  });
});
