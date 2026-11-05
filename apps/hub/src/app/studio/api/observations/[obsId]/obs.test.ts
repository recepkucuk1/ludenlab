import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const prisma = { studentObservation: { updateMany: vi.fn(), findUnique: vi.fn(), deleteMany: vi.fn() } };
vi.mock("@studio/lib/db", () => ({ prisma }));
vi.mock("@studio/lib/auth-helpers", () => ({ requireAuth: vi.fn(async () => ({ session: { user: { id: "t1" } } })) }));
const req = (body: unknown) => new NextRequest("http://x/o", { method: "PATCH", body: JSON.stringify(body), headers: { "content-type": "application/json" } });
const params = (obsId: string) => ({ params: Promise.resolve({ obsId }) });
beforeEach(() => vi.clearAllMocks());
describe("PATCH /studio/api/observations/[obsId]", () => {
  it("veli yanıtı düzenlenemez → 400; sahip olmayan → 404; uzman gözlemi → 200", async () => {
    const { PATCH } = await import("./route");
    prisma.studentObservation.updateMany.mockResolvedValue({ count: 0 });
    prisma.studentObservation.findUnique.mockResolvedValue({ therapistId: "t1", source: "parent" });
    const r1 = await PATCH(req({ text: "x" }), params("o1"));
    expect(r1.status).toBe(400);
    expect((await r1.json()).error).toMatch(/Veli yanıtı düzenlenemez/);
    expect(prisma.studentObservation.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ source: "therapist" }) }));
    prisma.studentObservation.findUnique.mockResolvedValue({ therapistId: "baska", source: "therapist" });
    expect((await PATCH(req({ text: "x" }), params("o2"))).status).toBe(404);
    prisma.studentObservation.findUnique.mockResolvedValue({ therapistId: "baska", source: "parent" });
    expect((await PATCH(req({ text: "x" }), params("o4"))).status).toBe(404);
    prisma.studentObservation.findUnique.mockResolvedValue(null);
    expect((await PATCH(req({ text: "x" }), params("o5"))).status).toBe(404);
    prisma.studentObservation.updateMany.mockResolvedValue({ count: 1 });
    prisma.studentObservation.findUnique.mockResolvedValue({ id: "o3", text: "x", createdAt: new Date(), updatedAt: new Date() });
    expect((await PATCH(req({ text: "x" }), params("o3"))).status).toBe(200);
    expect(prisma.studentObservation.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: { id: "o3", therapistId: "t1", source: "therapist" } }));
  });
});
