import { beforeEach, describe, expect, it, vi } from "vitest";

const { withCredits, saveDocument } = vi.hoisted(() => ({ withCredits: vi.fn(), saveDocument: vi.fn() }));
vi.mock("./credits", () => ({ withCredits }));
vi.mock("./cases", () => ({ saveDocument }));

import { runTool } from "./generate";

type Girdi = { rumuz: string; kademe: string; notlar?: string };
const uret = () =>
  vi.fn(async (safe: Girdi) => ({
    text: `${safe.rumuz} için plan`,
    model: "test",
    usage: { inputTokens: 1, outputTokens: 1, cacheReadTokens: 0, cacheCreationTokens: 0 },
    stopReason: "end_turn" as const,
  }));

beforeEach(() => {
  withCredits.mockReset();
  saveDocument.mockReset();
  withCredits.mockImplementation(async (_acc: string, fn: () => Promise<unknown>) => ({
    ok: true,
    result: await fn(),
    balance: 42,
  }));
  saveDocument.mockResolvedValue({ caseId: "c1", docId: "d1" });
});

describe("runTool — çocuk PII kapısı, görünmez karakter", () => {
  it("ad alanı temiz, serbest metin yumuşak tireyle bölünmüş (Word/PDF yapıştırması): ad modele gitmez", async () => {
    const generate = uret();
    const res = await runTool("acc-1", {
      type: "seans_plani",
      input: { rumuz: "Arda Yılmaz", kademe: "ilkokul", notlar: "Ar\u00ADda top oynamayı sever" },
      generate,
    });
    expect(res.ok).toBe(true);
    const safe = generate.mock.calls[0][0];
    const tumu = JSON.stringify(safe);
    expect(tumu).not.toContain("Arda");
    expect(tumu).not.toContain("\u00AD");
    expect(safe.rumuz).not.toBe("Arda Yılmaz");
  });

  it("tersi: ad alanı bölünmüş, serbest metin temiz — yine sızmaz", async () => {
    const generate = uret();
    await runTool("acc-1", {
      type: "seans_plani",
      input: { rumuz: "Ar\u00ADda", kademe: "ilkokul", notlar: "Arda top oynamayı sever" },
      generate,
    });
    expect(JSON.stringify(generate.mock.calls[0][0])).not.toContain("Arda");
  });

  it("çıktıda rumuz gerçek (temizlenmiş) ada döner; kayıt temiz adla yapılır", async () => {
    const generate = vi.fn(async (safe: Girdi) => ({
      text: `${safe.rumuz} haftada iki kez çalışır.`,
      model: "test",
      usage: { inputTokens: 1, outputTokens: 1, cacheReadTokens: 0, cacheCreationTokens: 0 },
      stopReason: "end_turn" as const,
    }));
    const res = await runTool("acc-1", {
      type: "seans_plani",
      input: { rumuz: "Ar\u00ADda", kademe: "ilkokul" },
      generate,
    });
    expect(res.ok && res.data.text).toBe("Arda haftada iki kez çalışır.");
    expect(saveDocument).toHaveBeenCalledWith("acc-1", expect.objectContaining({ code: "Arda" }));
  });
});
