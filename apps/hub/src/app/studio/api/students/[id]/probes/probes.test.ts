// apps/hub/src/app/studio/api/students/[id]/probes/probes.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

/* Rota sözleşmesi (spec §6): sahiplik kapısı, bankadan set, aynı anahtarda eski serinin pasifleşmesi,
   sunucu taraflı puanlama, kelime listesi uyuşmazlığı 400, silmede sahiplik. Prisma/auth/banka taklit. */
const prisma = {
  probeSeries: { findMany: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn(), create: vi.fn() },
  probeRun: { create: vi.fn(), deleteMany: vi.fn() },
  $transaction: vi.fn(async (ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
};
vi.mock("@studio/lib/db", () => ({ prisma }));
vi.mock("@studio/lib/auth-helpers", () => ({
  requireAuth: vi.fn(async () => ({ session: { user: { id: "t1" } } })),
  requireStudentOwnership: vi.fn(async (id: string) => (id === "s1" ? { student: { id } } : NextResponse.json({ error: "Öğrenci bulunamadı" }, { status: 404 }))),
}));
vi.mock("@/lib/rateLimit", () => ({ rateLimit: () => ({ allowed: true, retryAfter: 0 }), rateLimitResponse: () => new Response(null, { status: 429 }) }));
vi.mock("@studio/lib/generateWordImage", () => ({ lookupCachedWordImage: vi.fn(async () => null) }));

const req = (url: string, body?: unknown, method = "POST") =>
  new NextRequest(`http://x${url}`, { method, body: body === undefined ? undefined : JSON.stringify(body), headers: { "content-type": "application/json" } });
const params = <T extends Record<string, string>>(p: T) => ({ params: Promise.resolve(p) });

beforeEach(() => vi.clearAllMocks());

describe("GET /students/[id]/probes", () => {
  it("sahiplik yoksa 404; varsa serileri aktif önce, koşuları tarih artan döner", async () => {
    const { GET } = await import("./route");
    expect((await GET(req("/p", undefined, "GET"), params({ id: "yok" }))).status).toBe(404);
    prisma.probeSeries.findMany.mockResolvedValue([
      { id: "ser1", sound: "/r/", position: "initial", level: "word", active: true, words: [{ word: "resim", syllableBreak: "re-sim", imageUrl: null }], createdAt: new Date(2026, 9, 1), runs: [{ id: "run1", date: new Date(2026, 9, 14), pct: 60, correct: 6, total: 10, cuedCount: 1, note: null }] },
    ]);
    const res = await GET(req("/p", undefined, "GET"), params({ id: "s1" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(prisma.probeSeries.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { studentId: "s1", therapistId: "t1" }, orderBy: [{ active: "desc" }, { createdAt: "desc" }] }));
    expect(data.series[0].runs[0]).toMatchObject({ id: "run1", pct: 60 });
    expect(data.series[0].words[0].word).toBe("resim");
  });
});

describe("POST /students/[id]/probes", () => {
  it("geçersiz gövde 400; bankada kelime yoksa 400 (başta /ğ/)", async () => {
    const { POST } = await import("./route");
    expect((await POST(req("/p", { sound: "r", position: "initial" }), params({ id: "s1" }))).status).toBe(400);
    const res = await POST(req("/p", { sound: "/ğ/", position: "initial" }), params({ id: "s1" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/yeterli kelime yok/);
    expect(prisma.probeSeries.create).not.toHaveBeenCalled();
  });
  it("aynı ses+pozisyon+düzeydeki aktif seri pasifleşir, yeni seri 201 ile döner", async () => {
    const { POST } = await import("./route");
    prisma.probeSeries.updateMany.mockResolvedValue({ count: 1 });
    prisma.probeSeries.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: "ser2", ...data, createdAt: new Date(2026, 9, 2), runs: [] }));
    const res = await POST(req("/p", { sound: "/r/", position: "initial", count: 6 }), params({ id: "s1" }));
    expect(res.status).toBe(201);
    expect(prisma.probeSeries.updateMany).toHaveBeenCalledWith({ where: { studentId: "s1", therapistId: "t1", sound: "/r/", position: "initial", level: "word", active: true }, data: { active: false } });
    const { series } = await res.json();
    expect(series.words).toHaveLength(6);
    expect(series.active).toBe(true);
  });
});

describe("POST /students/[id]/probes/[seriesId]/runs", () => {
  const seri = { id: "ser1", studentId: "s1", therapistId: "t1", words: [{ word: "resim", syllableBreak: "re-sim", imageUrl: null }, { word: "radyo", syllableBreak: "rad-yo", imageUrl: null }] };
  it("seri bulunamazsa 404; kelime listesi serininkiyle aynı sıra değilse 400", async () => {
    const { POST } = await import("./[seriesId]/runs/route");
    prisma.probeSeries.findFirst.mockResolvedValue(null);
    expect((await POST(req("/r", { items: [{ word: "resim", correct: true }] }), params({ id: "s1", seriesId: "yok" }))).status).toBe(404);
    prisma.probeSeries.findFirst.mockResolvedValue(seri);
    const res = await POST(req("/r", { items: [{ word: "radyo", correct: true }, { word: "resim", correct: true }] }), params({ id: "s1", seriesId: "ser1" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/kelime listesi/);
  });
  it("puan sunucuda hesaplanır (cued doğru sayılmaz), istemci sayıları yok sayılır, 201", async () => {
    const { POST } = await import("./[seriesId]/runs/route");
    prisma.probeSeries.findFirst.mockResolvedValue(seri);
    prisma.probeRun.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: "run9", ...data, date: new Date(2026, 9, 14) }));
    const res = await POST(req("/r", { items: [{ word: "resim", correct: true, cued: true }, { word: "radyo", correct: true }], note: " ilk ", pct: 100 }), params({ id: "s1", seriesId: "ser1" }));
    expect(res.status).toBe(201);
    expect(prisma.probeRun.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ seriesId: "ser1", therapistId: "t1", correct: 1, total: 2, pct: 50, cuedCount: 1, note: "ilk" }) }));
    expect((await res.json()).run.pct).toBe(50);
  });
});

describe("DELETE /students/[id]/probes/runs/[runId]", () => {
  it("sahiplik therapistId ile; yoksa 404, varsa 200", async () => {
    const { DELETE } = await import("./runs/[runId]/route");
    prisma.probeRun.deleteMany.mockResolvedValue({ count: 0 });
    expect((await DELETE(req("/d", undefined, "DELETE"), params({ id: "s1", runId: "x" }))).status).toBe(404);
    prisma.probeRun.deleteMany.mockResolvedValue({ count: 1 });
    const res = await DELETE(req("/d", undefined, "DELETE"), params({ id: "s1", runId: "run1" }));
    expect(res.status).toBe(200);
    expect(prisma.probeRun.deleteMany).toHaveBeenCalledWith({ where: { id: "run1", therapistId: "t1", series: { studentId: "s1" } } });
  });
});
