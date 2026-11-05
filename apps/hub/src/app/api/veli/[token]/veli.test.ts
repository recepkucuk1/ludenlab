// apps/hub/src/app/api/veli/[token]/veli.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/* Açık uç (spec §6): biçimsiz token DB'ye sorulmaz; pasif/yok 404; zod 400; 201'de gözlem source=parent + meta + text,
   bağlantı sayacı aynı transaction'da; rate limit 429. */
const prisma = {
  parentLink: { findUnique: vi.fn(), update: vi.fn() },
  studentObservation: { create: vi.fn() },
  $transaction: vi.fn(async (ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
};
vi.mock("@studio/lib/db", () => ({ prisma }));
const rl = { allowed: true, retryAfter: 0 };
const throttled = { value: false };
const rateLimit = vi.fn((..._a: unknown[]) => rl);
const isThrottled = vi.fn((..._a: unknown[]) => throttled.value);
const noteFailureCount = { value: 1 };
const noteFailure = vi.fn((..._a: unknown[]) => noteFailureCount.value);
vi.mock("@/lib/rateLimit", () => ({
  rateLimit,
  isThrottled,
  noteFailure,
  rateLimitResponse: () => new Response(null, { status: 429 }),
  getClientIp: () => "1.2.3.4",
}));
const recordAudit = vi.fn(async (_input: Record<string, unknown>) => {});
vi.mock("@studio/lib/audit", () => ({ recordAudit }));

const TOK = "a".repeat(32);
const req = (url: string, body?: unknown, method = "POST") =>
  new NextRequest(`http://x${url}`, { method, body: body === undefined ? undefined : JSON.stringify(body), headers: { "content-type": "application/json" } });
const params = <T extends Record<string, string>>(p: T) => ({ params: Promise.resolve(p) });
const aktif = { id: "pl1", studentId: "s1", therapistId: "t1", active: true, therapist: { name: "Ayşe Yılmaz" } };

beforeEach(() => { vi.clearAllMocks(); rl.allowed = true; throttled.value = false; noteFailureCount.value = 1; });

describe("GET /api/veli/[token]", () => {
  it("biçimsiz token → 404, DB'ye sorulmaz; pasif → 404; aktif → uzman adı", async () => {
    const { GET } = await import("./route");
    expect((await GET(req("/v", undefined, "GET"), params({ token: "kisa" }))).status).toBe(404);
    expect(prisma.parentLink.findUnique).not.toHaveBeenCalled();
    prisma.parentLink.findUnique.mockResolvedValue({ ...aktif, active: false });
    expect((await GET(req("/v", undefined, "GET"), params({ token: TOK }))).status).toBe(404);
    prisma.parentLink.findUnique.mockResolvedValue(aktif);
    const res = await GET(req("/v", undefined, "GET"), params({ token: TOK }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ therapistName: "Ayşe Yılmaz" });
    expect(prisma.parentLink.findUnique).toHaveBeenLastCalledWith(expect.objectContaining({ where: { token: TOK } }));
  });
});

describe("POST /api/veli/[token]", () => {
  it("biçimsiz token → 404, ne rate limit ne DB", async () => {
    const { POST } = await import("./route");
    expect((await POST(req("/v", { days: 3 }), params({ token: "kisa" }))).status).toBe(404);
    expect(rateLimit).not.toHaveBeenCalled();
    expect(prisma.parentLink.findUnique).not.toHaveBeenCalled();
  });
  it("IP limiti 429 (token kotasına bakılmaz); token kotası dolu 429", async () => {
    const { POST } = await import("./route");
    rl.allowed = false;
    expect((await POST(req("/v", { days: 3 }), params({ token: TOK }))).status).toBe(429);
    expect(isThrottled).not.toHaveBeenCalled();
    rl.allowed = true;
    throttled.value = true;
    expect((await POST(req("/v", { days: 3 }), params({ token: TOK }))).status).toBe(429);
    expect(isThrottled).toHaveBeenCalledWith(`veli-post:${TOK}`, 3);
    expect(prisma.parentLink.findUnique).not.toHaveBeenCalled();
  });
  it("zod 400: DB sorulmaz, kota harcanmaz; pasif 404 ve yazma yok", async () => {
    const { POST } = await import("./route");
    expect((await POST(req("/v", { days: 9 }), params({ token: TOK }))).status).toBe(400);
    expect(prisma.parentLink.findUnique).not.toHaveBeenCalled();
    expect(noteFailure).not.toHaveBeenCalled();
    prisma.parentLink.findUnique.mockResolvedValue(null);
    expect((await POST(req("/v", { days: 3 }), params({ token: TOK }))).status).toBe(404);
    expect(prisma.studentObservation.create).not.toHaveBeenCalled();
    expect(noteFailure).not.toHaveBeenCalled();
  });
  it("transaction hatası → 500, audit yok", async () => {
    const { POST } = await import("./route");
    prisma.parentLink.findUnique.mockResolvedValue(aktif);
    prisma.$transaction.mockRejectedValueOnce(new Error("db"));
    expect((await POST(req("/v", { days: 3 }), params({ token: TOK }))).status).toBe(500);
    expect(recordAudit).not.toHaveBeenCalled();
  });
  it("429: paralel isteklerde ön kontrol geçse bile say-ve-denetle 4. yanıtı reddeder; DB'ye yazılmaz", async () => {
    const { POST } = await import("./route");
    prisma.parentLink.findUnique.mockResolvedValue(aktif);
    noteFailureCount.value = 4;
    const res = await POST(req("/v", { days: 3 }), params({ token: TOK }));
    expect(res.status).toBe(429);
    expect(noteFailure).toHaveBeenCalledWith(`veli-post:${TOK}`, 3600000);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(recordAudit).not.toHaveBeenCalled();
  });
  it("201: gözlem source=parent + meta + derlenmiş metin; sayaç artar; audit token/metin taşımaz", async () => {
    const { POST } = await import("./route");
    prisma.parentLink.findUnique.mockResolvedValue(aktif);
    prisma.studentObservation.create.mockResolvedValue({ id: "o1" });
    prisma.parentLink.update.mockResolvedValue({});
    const res = await POST(req("/v", { days: 4, easy: ["istekle_oturdu"], hard: [], note: " <b>İyi</b> " }), params({ token: TOK }));
    expect(res.status).toBe(201);
    expect(rateLimit).toHaveBeenCalledWith("veli-post:1.2.3.4", 10, 3600000);
    expect(noteFailure).toHaveBeenCalledWith(`veli-post:${TOK}`, 3600000);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.studentObservation.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ studentId: "s1", therapistId: "t1", source: "parent", meta: { days: 4, easy: ["istekle_oturdu"], hard: [] }, text: "Veli: 4 gün çalışıldı. Kolay: istekle oturdu. Not: İyi" }),
    }));
    expect(prisma.parentLink.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "pl1" }, data: expect.objectContaining({ answerCount: { increment: 1 } }) }));
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({ actorId: null, action: "parentFeedback.receive", targetType: "student", targetId: "s1", ip: "1.2.3.4", diff: { days: 4 } }));
    const auditArg = JSON.stringify(recordAudit.mock.calls[0]?.[0]);
    expect(auditArg).not.toContain(TOK);
    expect(auditArg).not.toContain("İyi");
  });
});
