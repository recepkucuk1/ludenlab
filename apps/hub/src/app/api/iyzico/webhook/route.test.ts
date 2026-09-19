import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const upsert = vi.fn();
vi.mock("@/lib/db", () => ({ prisma: { webhookEvent: { upsert }, $transaction: vi.fn() } }));
vi.mock("@/lib/iyzico", () => ({ retrieveSubscription: vi.fn() }));

const { POST } = await import("./route");

const MERCHANT = "M123";
const SECRET = "S456";
const body = {
  iyziEventType: "subscription.order.success",
  iyziReferenceCode: "IYZ1",
  subscriptionReferenceCode: "SUB1",
  orderReferenceCode: "ORD1",
  customerReferenceCode: "CUS1",
  merchantId: MERCHANT,
};
const post = (sig: string) =>
  POST(
    new Request("https://ludenlab.com/api/iyzico/webhook", {
      method: "POST",
      headers: { "x-iyz-signature-v3": sig },
      body: JSON.stringify(body),
    }) as never,
  );

beforeEach(() => {
  process.env.IYZICO_MERCHANT_ID = MERCHANT;
  process.env.IYZICO_SECRET_KEY = SECRET;
});
afterEach(() => {
  vi.restoreAllMocks();
  upsert.mockReset();
});

describe("POST /api/iyzico/webhook — geçersiz imza tanısı", () => {
  it("401 döner, DB'ye yazmaz, tanıyı loglar ve sır/ref sızdırmaz", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    // müşteri ref'siz formülle imzalanmış (bizim formülümüz tutmaz)
    const sig = createHmac("sha256", SECRET)
      .update(MERCHANT + SECRET + body.iyziEventType + "SUB1" + "ORD1")
      .digest("hex");

    const res = await post(sig);

    expect(res.status).toBe(401);
    expect(upsert).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
    const logged = warn.mock.calls[0]!.map(String).join(" ");
    expect(logged).toContain("[iyzico webhook] geçersiz imza");
    expect(logged).toContain('"matchedVariant":"musterisiz"');
    expect(logged).toContain('"eventType":"subscription.order.success"');
    for (const gizli of [SECRET, "SUB1", "ORD1", "CUS1", "IYZ1", sig]) expect(logged).not.toContain(gizli);
  });
});
