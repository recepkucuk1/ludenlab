import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

/**
 * Token tavanında kesilen yanıt — ortak araç kapısı.
 *
 * Model `max_tokens`e çarptığında çıktı YARIM kalır. Eskiden bu durum ayrıştırma hatasına
 * düşüp "Bir hata oluştu" diye dönüyordu: uzman nedenini, biz de hangi aracın tavana
 * çarptığını göremiyorduk (haftalık plan 2026-07-30'da 5 denemenin 5'inde bu yüzden boş
 * döndü, API bedeli yine ödendi). Artık `stop_reason` belirleyici: kesilen yanıt, JSON'u
 * tesadüfen ayrışsa bile kaydedilmez.
 */
const create = vi.fn();
const cardCreate = vi.fn();
const refundCredits = vi.fn();

vi.mock("@studio/auth", () => ({ auth: async () => ({ user: { id: "uzman-1" } }) }));
vi.mock("@/generated/studio/client", () => ({ ToolType: {} }));
vi.mock("@/lib/rateLimit", () => ({
  rateLimit: () => ({ allowed: true, retryAfter: 0 }),
  rateLimitResponse: () => new Response(null, { status: 429 }),
}));
vi.mock("@studio/lib/usage", () => ({ logUsage: () => {} }));
vi.mock("@studio/lib/credits", () => ({ reserveCredits: async () => true, refundCredits }));
vi.mock("@studio/lib/db", () => ({
  prisma: { $transaction: (cb: (tx: unknown) => unknown) => cb({ card: { create: cardCreate } }) },
}));
vi.mock("@studio/lib/anthropic", () => ({ anthropic: { messages: { create } }, MODEL: "claude-sonnet-4-6" }));

const { createToolHandler } = await import("./toolHandler");

const POST = createToolHandler({
  rateLimitKey: "deneme",
  bodySchema: z.object({}),
  cost: 1,
  systemPrompt: "sistem",
  toolType: "WEEKLY_PLAN" as never,
  category: "speech",
  creditDescription: "Deneme üretimi",
  responseKey: "plan",
  maxTokens: 6000,
  studentRequired: false,
  buildUserPrompt: () => "istek",
});

async function generate(stopReason: string, text: string) {
  create.mockResolvedValue({
    stop_reason: stopReason,
    content: [{ type: "text", text }],
    usage: { input_tokens: 900, output_tokens: 6000 },
  });
  const res = await POST(
    new Request("http://test.local/x", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    }) as never,
  );
  const events = (await res.text())
    .split("\n\n")
    .map((c) => c.trim())
    .filter((c) => c.startsWith("data: "))
    .map((c) => JSON.parse(c.slice(6)) as { type: string; status: number; body: { error?: string } });
  return events.find((e) => e.type === "result")!;
}

beforeEach(() => {
  create.mockReset();
  cardCreate.mockReset();
  cardCreate.mockResolvedValue({ id: "kart-1" });
  refundCredits.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("araç kapısı — token tavanı", () => {
  it("tamamlanan yanıt kaydedilir (kontrol)", async () => {
    const r = await generate("end_turn", '{"title":"Plan","days":[]}');

    expect(r.status).toBe(200);
    expect(cardCreate).toHaveBeenCalledTimes(1);
    expect(refundCredits).not.toHaveBeenCalled();
  });

  it("tavanda kesilen yanıt kaydedilmez, hak iade edilir ve neden söylenir", async () => {
    const r = await generate("max_tokens", '{"title":"Plan","days":[{"focusArea":"Artikül');

    expect(r.status).not.toBe(200);
    expect(r.body.error).toMatch(/uzunluk sınırını aştı/);
    expect(cardCreate).not.toHaveBeenCalled();
    expect(refundCredits).toHaveBeenCalledTimes(1);
  });

  it("tavanda kesilen yanıtın JSON'u tesadüfen ayrışsa bile kaydedilmez", async () => {
    const r = await generate("max_tokens", '{"title":"Plan","days":[]}\n\nNot: Bu plan');

    expect(r.status).not.toBe(200);
    expect(cardCreate).not.toHaveBeenCalled();
    expect(refundCredits).toHaveBeenCalledTimes(1);
  });
});
