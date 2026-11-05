// apps/hub/src/app/studio/api/students/[id]/parent-link/parentLink.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

/* Uzman tarafı (spec §7): sahiplik, aktif bağlantı GET, yenileme tek transaction (pasifleştir + oluştur), P2002→409,
   DELETE 404/200, owner-404'te yazma yok, URL getBaseUrl ile. */
const prisma = {
  parentLink: { findFirst: vi.fn(), updateMany: vi.fn(), create: vi.fn() },
  $transaction: vi.fn(async (ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
};
vi.mock("@studio/lib/db", () => ({ prisma }));
vi.mock("@studio/lib/auth-helpers", () => ({
  requireAuth: vi.fn(async () => ({ session: { user: { id: "t1" } } })),
  requireStudentOwnership: vi.fn(async (id: string) => (id === "s1" ? { student: { id } } : NextResponse.json({ error: "Öğrenci bulunamadı" }, { status: 404 }))),
}));
vi.mock("@/lib/rateLimit", () => ({ rateLimit: () => ({ allowed: true, retryAfter: 0 }), rateLimitResponse: () => new Response(null, { status: 429 }), getClientIp: () => "1.2.3.4" }));
vi.mock("@studio/lib/audit", () => ({ recordAudit: vi.fn(async () => {}) }));
const getBaseUrl = vi.fn(() => "https://ludenlab.com");
vi.mock("@studio/lib/baseUrl", () => ({ getBaseUrl: () => getBaseUrl() }));
import { recordAudit } from "@studio/lib/audit";
vi.mock("@studio/lib/parentLink/token", async (orig) => ({ ...(await orig<typeof import("@studio/lib/parentLink/token")>()), generateToken: () => "T".repeat(32) }));

const req = (method = "GET") => new NextRequest("http://x/pl", { method });
const params = <T extends Record<string, string>>(p: T) => ({ params: Promise.resolve(p) });
const satir = { id: "pl1", answerCount: 2, lastAnsweredAt: new Date(2026, 9, 14), createdAt: new Date(2026, 9, 1), token: "T".repeat(32) };
beforeEach(() => { vi.clearAllMocks(); getBaseUrl.mockReturnValue("https://ludenlab.com"); });

describe("GET", () => {
  it("sahiplik 404; yoksa null; varsa URL'li DTO", async () => {
    const { GET } = await import("./route");
    expect((await GET(req(), params({ id: "yok" }))).status).toBe(404);
    prisma.parentLink.findFirst.mockResolvedValue(null);
    expect(await (await GET(req(), params({ id: "s1" }))).json()).toEqual({ link: null });
    prisma.parentLink.findFirst.mockResolvedValue(satir);
    const { link } = await (await GET(req(), params({ id: "s1" }))).json();
    expect(link).toMatchObject({ id: "pl1", url: `https://ludenlab.com/veli/${"T".repeat(32)}`, answerCount: 2 });
    expect(prisma.parentLink.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { studentId: "s1", therapistId: "t1", active: true } }));
  });
});

describe("POST (oluştur/yenile)", () => {
  it("owner-404'te yazma yok; başarıda tek transaction: pasifleştir + oluştur, 201", async () => {
    const { POST } = await import("./route");
    expect((await POST(req("POST"), params({ id: "yok" }))).status).toBe(404);
    expect(prisma.parentLink.create).not.toHaveBeenCalled();
    prisma.parentLink.updateMany.mockResolvedValue({ count: 1 });
    prisma.parentLink.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ ...satir, ...data, answerCount: 0, lastAnsweredAt: null }));
    const res = await POST(req("POST"), params({ id: "s1" }));
    expect(res.status).toBe(201);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.parentLink.updateMany).toHaveBeenCalledWith({ where: { studentId: "s1", therapistId: "t1", active: true }, data: { active: false, revokedAt: expect.any(Date) } });
    expect(prisma.parentLink.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ studentId: "s1", therapistId: "t1", token: "T".repeat(32), active: true }) }));
    expect((await res.json()).link.url).toBe(`https://ludenlab.com/veli/${"T".repeat(32)}`);
    expect(prisma.parentLink.updateMany.mock.invocationCallOrder[0]).toBeLessThan(prisma.parentLink.create.mock.invocationCallOrder[0]);
    const ops = prisma.$transaction.mock.calls[0][0] as unknown[];
    expect(ops).toHaveLength(2);
    expect(vi.mocked(recordAudit)).toHaveBeenCalledTimes(1);
    const audit = vi.mocked(recordAudit).mock.calls[0][0] as { targetId: string; action: string; diff?: unknown };
    expect(audit).toMatchObject({ action: "parentLink.create", targetId: "s1" });
    expect(JSON.stringify(audit.diff ?? {})).not.toContain("T".repeat(32));
  });
  it("sonda eğik çizgili taban adreste URL'de tek eğik çizgi", async () => {
    const { POST } = await import("./route");
    getBaseUrl.mockReturnValue("https://ludenlab.com//");
    prisma.parentLink.updateMany.mockResolvedValue({ count: 0 });
    prisma.parentLink.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ ...satir, ...data, answerCount: 0, lastAnsweredAt: null }));
    const { link } = await (await POST(req("POST"), params({ id: "s1" }))).json();
    expect(link.url).toBe(`https://ludenlab.com/veli/${"T".repeat(32)}`);
  });
  it("P2002 → 409; başka hata → 500", async () => {
    const { POST } = await import("./route");
    prisma.$transaction.mockRejectedValueOnce({ code: "P2002" });
    expect((await POST(req("POST"), params({ id: "s1" }))).status).toBe(409);
    expect(vi.mocked(recordAudit)).not.toHaveBeenCalled();
    prisma.$transaction.mockRejectedValueOnce(new Error("db"));
    expect((await POST(req("POST"), params({ id: "s1" }))).status).toBe(500);
  });
});

describe("DELETE", () => {
  it("aktif yoksa 404; varsa pasifleşir 200", async () => {
    const { DELETE } = await import("./route");
    prisma.parentLink.updateMany.mockResolvedValue({ count: 0 });
    expect((await DELETE(req("DELETE"), params({ id: "s1" }))).status).toBe(404);
    expect(vi.mocked(recordAudit)).not.toHaveBeenCalled();
    prisma.parentLink.updateMany.mockResolvedValue({ count: 1 });
    expect((await DELETE(req("DELETE"), params({ id: "s1" }))).status).toBe(200);
    expect(prisma.parentLink.updateMany).toHaveBeenLastCalledWith({ where: { studentId: "s1", therapistId: "t1", active: true }, data: { active: false, revokedAt: expect.any(Date) } });
  });
});
