// apps/hub/src/app/studio/api/students/[id]/progress/[goalId]/audit/audit.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { DenetimHatasi } from "@/lib/hedefDenetimi/dogrula";

/* Spec §7.2 + §15: sahiplik → müfredat kontrolü → gövde → temizle → 6/dk → günlük 10 (ApiUsageLog) → 24h tavan →
   scrub → model → alıntı başına ad geri çevirme → logUsage → upsert. Kredi yok, plan kapısı yok. */
const prisma = {
  student: { findFirst: vi.fn() },
  curriculumGoal: { findUnique: vi.fn() },
  apiUsageLog: { count: vi.fn(async (_a: unknown) => 0) },
  studentProgress: { upsert: vi.fn(async (_a: unknown) => ({})) },
};
vi.mock("@studio/lib/db", () => ({ prisma }));
vi.mock("@studio/lib/auth-helpers", () => ({ requireAuth: vi.fn(async () => ({ session: { user: { id: "t1" } } })) }));
vi.mock("@studio/lib/pseudonym", async (orig) => ({
  ...(await orig<typeof import("@studio/lib/pseudonym")>()),
  ensureStudentAlias: vi.fn(async () => "Nisa"),
}));
const rl = { allowed: true, retryAfter: 0 };
const gun = { allowed: true, retryAfter: 0 };
const rateLimit = vi.fn((key: string, ..._r: unknown[]) => (key.includes("-gun:") ? gun : rl));
vi.mock("@/lib/rateLimit", () => ({ rateLimit, rateLimitResponse: () => new Response(null, { status: 429 }) }));
const logUsage = vi.fn((_t: string, _e: string, _u: unknown) => {});
vi.mock("@studio/lib/usage", () => ({ logUsage }));
const usage = { inputTokens: 100, outputTokens: 50, cacheReadTokens: 0, cacheCreationTokens: 0 };
const sonucRumuzlu = () => ({
  bilesenler: {
    davranis: { durum: "var", alinti: "Nisa doğru okur", not: "" },
    olcut: { durum: "var", alinti: "8/10 doğrulukla", not: "" },
    kosul: { durum: "eksik", alinti: "", not: "" }, zaman: { durum: "eksik", alinti: "", not: "" }, taban: { durum: "eksik", alinti: "", not: "" },
  },
  mebUyum: null,
  sorular: [{ bilesen: "zaman", soru: "Ne zamana kadar?", ornek: "8 hafta içinde" }],
  ozet: "Koşul, zaman ve taban eksik.",
});
const hedefDenetle = vi.fn(async (_g: { hedef: string; baglam?: Record<string, unknown> }) => ({ sonuc: sonucRumuzlu(), model: "claude-sonnet-4-6", usage }));
vi.mock("@/lib/hedefDenetimi/run", () => ({ hedefDenetle }));

const ogrenci = { id: "s1", name: "Ela Şahin", llmAlias: null, therapistId: "t1", birthDate: new Date(2020, 4, 14), curriculumIds: ["c1"] };
const hedef = { code: "2.2", title: "Sıra alma", curriculumId: "c1" };
const req = (body: unknown) => new NextRequest("http://x/a", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } });
const params = { params: Promise.resolve({ id: "s1", goalId: "g1" }) };

beforeEach(() => {
  vi.clearAllMocks();
  rl.allowed = true; gun.allowed = true;
  prisma.student.findFirst.mockResolvedValue(ogrenci);
  prisma.curriculumGoal.findUnique.mockResolvedValue(hedef);
  prisma.apiUsageLog.count.mockResolvedValue(0);
});
afterEach(() => { vi.useRealTimers(); });

describe("POST …/progress/[goalId]/audit", () => {
  it("sahiplik 404; hedef müfredatta değil 404; ikisinde de model çağrılmaz", async () => {
    const { POST } = await import("./route");
    prisma.student.findFirst.mockResolvedValueOnce(null);
    expect((await POST(req({ objective: "okur" }), params)).status).toBe(404);
    prisma.curriculumGoal.findUnique.mockResolvedValueOnce({ ...hedef, curriculumId: "başka" });
    expect((await POST(req({ objective: "okur" }), params)).status).toBe(404);
    expect(prisma.student.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "s1", therapistId: "t1" } }));
    expect(hedefDenetle).not.toHaveBeenCalled();
  });
  it("boş / yalnız görünmez / 601 karakter → 400; hız sınırı sorulmaz", async () => {
    const { POST } = await import("./route");
    expect((await POST(req({ objective: "  " }), params)).status).toBe(400);
    expect((await POST(req({ objective: "​" }), params)).status).toBe(400);
    expect((await POST(req({ objective: "a".repeat(601) }), params)).status).toBe(400);
    expect(rateLimit).not.toHaveBeenCalled();
  });
  it("dakikalık 429; günlük sayım 10 → 429 DAILY_CAP (24h tavan ve model yok); 24h tavan → 429 DAILY_CAP", async () => {
    const { POST } = await import("./route");
    rl.allowed = false;
    expect((await POST(req({ objective: "okur" }), params)).status).toBe(429);
    expect(prisma.apiUsageLog.count).not.toHaveBeenCalled();
    rl.allowed = true;
    prisma.apiUsageLog.count.mockResolvedValueOnce(10);
    const cap = await POST(req({ objective: "okur" }), params);
    expect(cap.status).toBe(429);
    expect(await cap.json()).toMatchObject({ code: "DAILY_CAP" });
    expect(rateLimit).not.toHaveBeenCalledWith(expect.stringContaining("-gun:"), expect.anything(), expect.anything());
    gun.allowed = false;
    const tavan = await POST(req({ objective: "okur" }), params);
    expect(tavan.status).toBe(429);
    expect(await tavan.json()).toMatchObject({ code: "DAILY_CAP" });
    expect(hedefDenetle).not.toHaveBeenCalled();
  });
  it("mutlu yol: temizle → rumuzla; üst hedef ve yaş bağlamda; gerçek ad geri gelir; logUsage etiketi; upsert; kalan 9", async () => {
    const { POST } = await import("./route");
    const res = await POST(req({ objective: "Ela­ doğru okur; 8/10 doğrulukla." }), params);
    expect(res.status).toBe(200);
    const girdi = hedefDenetle.mock.calls[0]![0];
    expect(girdi.hedef).not.toContain("Ela");
    expect(girdi.hedef).toContain("Nisa");
    expect(girdi.baglam).toEqual({ kademeYas: expect.stringMatching(/^\d+ yaşında$/), ustHedef: "2.2 Sıra alma" });
    const body = await res.json();
    expect(body.audit.bilesenler.davranis.alinti).toBe("Ela doğru okur"); // parça adayı (tam ad "Ela Şahin" hedefte yok)
    expect(body).toMatchObject({ kalan: 9, objective: "Ela doğru okur; 8/10 doğrulukla." });
    expect(typeof body.auditedAt).toBe("string");
    expect(logUsage).toHaveBeenCalledWith("t1", "students/goal-audit", { input_tokens: 100, output_tokens: 50, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 });
    expect(prisma.studentProgress.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { studentId_goalId: { studentId: "s1", goalId: "g1" } },
      create: expect.objectContaining({ studentId: "s1", goalId: "g1", therapistId: "t1", status: "not_started", objective: "Ela doğru okur; 8/10 doğrulukla." }),
      update: expect.objectContaining({ objective: "Ela doğru okur; 8/10 doğrulukla." }),
    }));
    const upd = (prisma.studentProgress.upsert.mock.calls[0]![0] as { update: { objectiveAudit: { bilesenler: { davranis: { alinti: string } } }; objectiveAuditedAt: Date } }).update;
    expect(upd.objectiveAudit.bilesenler.davranis.alinti).toBe("Ela doğru okur");
    expect(upd.objectiveAuditedAt).toBeInstanceOf(Date);
    expect(logUsage.mock.invocationCallOrder[0]!).toBeLessThan(prisma.studentProgress.upsert.mock.invocationCallOrder[0]!);
  });
  it("sayım patlarsa açık sayılır (model çağrılır); doğum tarihi yoksa kademeYas yok", async () => {
    const { POST } = await import("./route");
    prisma.apiUsageLog.count.mockRejectedValueOnce(new Error("db"));
    prisma.student.findFirst.mockResolvedValueOnce({ ...ogrenci, birthDate: null });
    expect((await POST(req({ objective: "okur" }), params)).status).toBe(200);
    expect(hedefDenetle.mock.calls[0]![0].baglam).toEqual({ kademeYas: undefined, ustHedef: "2.2 Sıra alma" });
  });
  it("DenetimHatasi → 502, kullanım varsa loglanır, upsert yok; diğer hata → 500", async () => {
    const { POST } = await import("./route");
    const e = new DenetimHatasi("parse");
    e.kullanim = { model: "m", usage };
    hedefDenetle.mockRejectedValueOnce(e);
    expect((await POST(req({ objective: "okur" }), params)).status).toBe(502);
    expect(logUsage).toHaveBeenCalledTimes(1);
    expect(prisma.studentProgress.upsert).not.toHaveBeenCalled();
    hedefDenetle.mockRejectedValueOnce(new Error("ağ"));
    expect((await POST(req({ objective: "okur" }), params)).status).toBe(500);
  });
});
