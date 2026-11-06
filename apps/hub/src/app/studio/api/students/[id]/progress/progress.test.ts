import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/* Spec §7.1: GET üç yeni alanı döner; PUT `objective` undefined → sütunlara dokunulmaz; verilince metin değiştiyse
   denetim sıfırlanır (Prisma.DbNull), aynıysa korunur; "" → null; >600 → 400. Transaction: ön okuma + upsert aynı tx. */
const tx = { studentProgress: { findUnique: vi.fn(), upsert: vi.fn() } };
const prisma = {
  student: { findFirst: vi.fn() },
  studentProgress: { findMany: vi.fn() },
  $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
};
vi.mock("@studio/lib/db", () => ({ prisma }));
vi.mock("@studio/auth", () => ({ auth: vi.fn(async () => ({ user: { id: "t1" } })) }));
vi.mock("@/generated/studio/client", () => ({ Prisma: { DbNull: "DbNull" } }));

const params = { params: Promise.resolve({ id: "s1" }) };
const put = (updates: unknown[]) =>
  new NextRequest("http://x/p", { method: "PUT", body: JSON.stringify({ updates }), headers: { "content-type": "application/json" } });

beforeEach(() => {
  vi.clearAllMocks();
  prisma.student.findFirst.mockResolvedValue({ id: "s1" });
  tx.studentProgress.findUnique.mockResolvedValue(null);
  tx.studentProgress.upsert.mockResolvedValue({});
});

describe("GET", () => {
  it("objective/objectiveAudit/objectiveAuditedAt seçilir ve döner", async () => {
    const { GET } = await import("./route");
    const tarih = new Date(2026, 10, 5);
    prisma.studentProgress.findMany.mockResolvedValue([{ goalId: "g1", status: "in_progress", notes: null, updatedAt: tarih, objective: "okur", objectiveAudit: { ozet: "x" }, objectiveAuditedAt: tarih }]);
    const res = await GET(new NextRequest("http://x/p"), params);
    expect(prisma.studentProgress.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { studentId: "s1", therapistId: "t1" },
      select: { goalId: true, status: true, notes: true, updatedAt: true, objective: true, objectiveAudit: true, objectiveAuditedAt: true },
    }));
    const { progress } = await res.json();
    expect(progress[0]).toMatchObject({ goalId: "g1", objective: "okur", objectiveAudit: { ozet: "x" } });
  });
});

describe("PUT", () => {
  it("objective verilmezse sütunlara dokunulmaz, ön okuma yapılmaz", async () => {
    const { PUT } = await import("./route");
    expect((await PUT(put([{ goalId: "g1", status: "in_progress", notes: "n" }]), params)).status).toBe(200);
    expect(tx.studentProgress.findUnique).not.toHaveBeenCalled();
    const arg = tx.studentProgress.upsert.mock.calls[0]![0] as { create: Record<string, unknown>; update: Record<string, unknown> };
    expect(arg.create).not.toHaveProperty("objective");
    expect(arg.update).not.toHaveProperty("objective");
    expect(arg.update).not.toHaveProperty("objectiveAudit");
  });
  it("metin değişince denetim DbNull ile sıfırlanır; aynıysa korunur; boş metin null olur", async () => {
    const { PUT } = await import("./route");
    tx.studentProgress.findUnique.mockResolvedValueOnce({ objective: "eski" });
    await PUT(put([{ goalId: "g1", status: "in_progress", objective: "yeni" }]), params);
    expect(tx.studentProgress.findUnique).toHaveBeenCalledWith({ where: { studentId_goalId: { studentId: "s1", goalId: "g1" } }, select: { objective: true } });
    expect(tx.studentProgress.upsert.mock.calls[0]![0]).toMatchObject({
      create: { studentId: "s1", goalId: "g1", therapistId: "t1", status: "in_progress", objective: "yeni" },
      update: { status: "in_progress", objective: "yeni", objectiveAudit: "DbNull", objectiveAuditedAt: null },
    });

    tx.studentProgress.findUnique.mockResolvedValueOnce({ objective: "aynı" });
    await PUT(put([{ goalId: "g1", status: "completed", objective: "aynı" }]), params);
    const ayni = tx.studentProgress.upsert.mock.calls[1]![0] as { update: Record<string, unknown> };
    expect(ayni.update).toMatchObject({ objective: "aynı" });
    expect(ayni.update).not.toHaveProperty("objectiveAudit");

    tx.studentProgress.findUnique.mockResolvedValueOnce({ objective: "vardı" });
    await PUT(put([{ goalId: "g1", status: "not_started", objective: "" }]), params);
    expect(tx.studentProgress.upsert.mock.calls[2]![0]).toMatchObject({ update: { objective: null, objectiveAudit: "DbNull", objectiveAuditedAt: null } });
  });
  it("objective 601 karakter → 400; sahiplik 404'te yazma yok", async () => {
    const { PUT } = await import("./route");
    expect((await PUT(put([{ goalId: "g1", status: "in_progress", objective: "a".repeat(601) }]), params)).status).toBe(400);
    prisma.student.findFirst.mockResolvedValueOnce(null);
    expect((await PUT(put([{ goalId: "g1", status: "in_progress" }]), params)).status).toBe(404);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
