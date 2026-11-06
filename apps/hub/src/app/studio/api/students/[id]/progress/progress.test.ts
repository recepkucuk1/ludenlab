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

const BILESEN = { durum: "var", alinti: "okur", not: "" };
const GECERLI = {
  bilesenler: { davranis: BILESEN, olcut: BILESEN, kosul: BILESEN, zaman: BILESEN, taban: BILESEN },
  mebUyum: null,
  sorular: [],
  ozet: "iyi",
};

describe("GET", () => {
  it("objective/objectiveAudit/objectiveAuditedAt seçilir ve döner", async () => {
    const { GET } = await import("./route");
    const tarih = new Date(2026, 10, 5);
    prisma.studentProgress.findMany.mockResolvedValue([{ goalId: "g1", status: "in_progress", notes: null, updatedAt: tarih, objective: "okur", objectiveAudit: GECERLI, objectiveAuditedAt: tarih }]);
    const res = await GET(new NextRequest("http://x/p"), params);
    expect(prisma.studentProgress.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { studentId: "s1", therapistId: "t1" },
      select: { goalId: true, status: true, notes: true, updatedAt: true, objective: true, objectiveAudit: true, objectiveAuditedAt: true },
    }));
    const { progress } = await res.json();
    expect(progress[0]).toMatchObject({ goalId: "g1", objective: "okur", objectiveAudit: GECERLI });
  });
  it("şemaya uymayan objectiveAudit JSON'u null döner", async () => {
    const { GET } = await import("./route");
    prisma.studentProgress.findMany.mockResolvedValue([{ goalId: "g1", status: "in_progress", notes: null, updatedAt: new Date(), objective: "okur", objectiveAudit: { garbage: true }, objectiveAuditedAt: null }]);
    const { progress } = await (await GET(new NextRequest("http://x/p"), params)).json();
    expect(progress[0].objectiveAudit).toBeNull();
    expect(progress[0].objective).toBe("okur");
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
    expect(ayni.update).not.toHaveProperty("objective");
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
  it("kanonik metin: saklı 'Ela okur', gelen 'Ela  okur\u200b' → denetim korunur", async () => {
    const { PUT } = await import("./route");
    tx.studentProgress.findUnique.mockResolvedValueOnce({ objective: "Ela okur" });
    await PUT(put([{ goalId: "g1", status: "in_progress", objective: "Ela  okur\u200b" }]), params);
    const u = tx.studentProgress.upsert.mock.calls[0]![0] as { create: Record<string, unknown>; update: Record<string, unknown> };
    expect(u.update).not.toHaveProperty("objectiveAudit");
    expect(u.update).not.toHaveProperty("objective");
    expect(u.create).toMatchObject({ objective: "Ela okur" });
  });
  it("201 madde → 400, transaction başlamaz", async () => {
    const { PUT } = await import("./route");
    const items = Array.from({ length: 201 }, (_, i) => ({ goalId: `g${i}`, status: "in_progress" }));
    expect((await PUT(put(items), params)).status).toBe(400);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it("notes verilmezse update'e girmez; null verilirse null yazılır", async () => {
    const { PUT } = await import("./route");
    await PUT(put([{ goalId: "g1", status: "in_progress" }, { goalId: "g2", status: "in_progress", notes: null }]), params);
    expect(tx.studentProgress.upsert.mock.calls[0]![0].update).not.toHaveProperty("notes");
    expect(tx.studentProgress.upsert.mock.calls[1]![0].update).toMatchObject({ notes: null });
  });
  it("objective: null, saklı farklıysa → null + denetim sıfırlama", async () => {
    const { PUT } = await import("./route");
    tx.studentProgress.findUnique.mockResolvedValueOnce({ objective: "vardı" });
    await PUT(put([{ goalId: "g1", status: "in_progress", objective: null }]), params);
    expect(tx.studentProgress.upsert.mock.calls[0]![0].update).toMatchObject({ objective: null, objectiveAudit: "DbNull", objectiveAuditedAt: null });
  });
  it("karışık toplu: findUnique bir kez, objective'siz öğe objective anahtarı taşımaz", async () => {
    const { PUT } = await import("./route");
    tx.studentProgress.findUnique.mockResolvedValueOnce({ objective: "a" });
    await PUT(put([{ goalId: "g1", status: "in_progress", objective: "b" }, { goalId: "g2", status: "completed" }]), params);
    expect(tx.studentProgress.findUnique).toHaveBeenCalledTimes(1);
    const u2 = tx.studentProgress.upsert.mock.calls[1]![0] as { update: Record<string, unknown> };
    expect(u2.update).not.toHaveProperty("objective");
    expect(u2.update).not.toHaveProperty("objectiveAudit");
  });
});
