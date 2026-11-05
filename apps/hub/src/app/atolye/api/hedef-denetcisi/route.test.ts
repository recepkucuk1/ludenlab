// apps/hub/src/app/atolye/api/hedef-denetcisi/route.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pickAlias } from "@ludenlab/ai";
import { DenetimHatasi } from "@/lib/hedefDenetimi/dogrula";

/* Spec §6.1: kredi düşmez; sıra biçim → hız sınırı → günlük sayım → rumuz → model → geri çevir → logUsage → doküman (best-effort). */
const auth = vi.fn(async (): Promise<{ user: { id: string } } | null> => ({ user: { id: "acc1" } }));
vi.mock("@atolye/auth", () => ({ auth }));
const count = vi.fn(async (_a: unknown) => 0);
vi.mock("@atolye/lib/db", () => ({ prisma: { generatedDocument: { count } } }));
const saveDocument = vi.fn(async (_acc: string, _input: Record<string, unknown>) => ({ caseId: "c1", docId: "d1" }));
vi.mock("@atolye/lib/cases", () => ({ saveDocument }));
const logUsage = vi.fn(async (_acc: string, _model: string, _usage: unknown) => {});
vi.mock("@atolye/lib/usage", () => ({ logUsage }));
const withCredits = vi.fn();
vi.mock("@atolye/lib/credits", () => ({ withCredits }));
const rl = { allowed: true, retryAfter: 0 };
const gunRl = { allowed: true, retryAfter: 0 };
const rateLimit = vi.fn((key: string, ..._a: unknown[]) => (key.includes("-gun:") ? gunRl : rl));
vi.mock("@/lib/rateLimit", () => ({ rateLimit, rateLimitResponse: () => new Response(null, { status: 429 }) }));
const usage = { inputTokens: 100, outputTokens: 50, cacheReadTokens: 0, cacheCreationTokens: 0 };
const ALIAS = pickAlias("Arda Yılmaz", { scope: "acc1" });
const sonucRumuzlu = () => ({
  bilesenler: {
    davranis: { durum: "var", alinti: `${ALIAS} doğru okur`, not: "" },
    olcut: { durum: "var", alinti: "8/10 doğrulukla", not: "" },
    kosul: { durum: "var", alinti: "resim desteğiyle", not: "" },
    zaman: { durum: "eksik", alinti: "", not: "" },
    taban: { durum: "eksik", alinti: "", not: "" },
  },
  mebUyum: null,
  sorular: [{ bilesen: "zaman", soru: "Hangi tarihe kadar?", ornek: "dönem sonuna kadar" }],
  ozet: "Zaman ve taban eksik.",
});
const hedefDenetle = vi.fn(async (_g: { hedef: string; baglam?: Record<string, unknown> }) => ({ sonuc: sonucRumuzlu(), model: "claude-sonnet-4-6", usage }));
vi.mock("@/lib/hedefDenetimi/run", () => ({ hedefDenetle }));

const govde = (over: Record<string, unknown> = {}) => ({
  rumuz: "Arda Yılmaz", kademe: "ilkokul_1_4", yas: 8,
  hedef: "Arda doğru okur; resim desteğiyle 8/10 doğrulukla.",
  ...over,
});
const req = (body: unknown) =>
  new Request("http://x/atolye/api/hedef-denetcisi", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

beforeEach(() => {
  vi.clearAllMocks();
  rl.allowed = true;
  gunRl.allowed = true;
  count.mockResolvedValue(0);
  auth.mockResolvedValue({ user: { id: "acc1" } });
  process.env.ANTHROPIC_API_KEY = "test-key";
});
afterEach(() => { delete process.env.ANTHROPIC_API_KEY; });

describe("POST /atolye/api/hedef-denetcisi", () => {
  it("oturum yok → 401; anahtar yok → 503; hiçbir yan etki yok", async () => {
    const { POST } = await import("./route");
    auth.mockResolvedValueOnce(null);
    expect((await POST(req(govde()))).status).toBe(401);
    delete process.env.ANTHROPIC_API_KEY;
    expect((await POST(req(govde()))).status).toBe(503);
    expect(count).not.toHaveBeenCalled();
    expect(hedefDenetle).not.toHaveBeenCalled();
  });
  it("geçersiz form → 422 (issues), hız sınırı ve sayım sorulmaz", async () => {
    const { POST } = await import("./route");
    const res = await POST(req(govde({ hedef: "   " })));
    expect(res.status).toBe(422);
    expect((await res.json()).issues[0].path).toBe("hedef");
    expect(rateLimit).not.toHaveBeenCalled();
    expect(count).not.toHaveBeenCalled();
  });
  it("hız sınırı → 429; günlük sınır → 429 DAILY_CAP (model çağrılmaz)", async () => {
    const { POST } = await import("./route");
    rl.allowed = false;
    expect((await POST(req(govde()))).status).toBe(429);
    expect(rateLimit).toHaveBeenCalledWith("hedef-denetim:acc1", 6);
    expect(count).not.toHaveBeenCalled();
    rl.allowed = true;
    count.mockResolvedValueOnce(10);
    const res = await POST(req(govde()));
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ code: "DAILY_CAP" });
    expect(count).toHaveBeenCalledWith({ where: { type: "hedef_denetim", createdAt: { gte: expect.any(Date) }, case: { ownerId: "acc1" } } });
    expect(hedefDenetle).not.toHaveBeenCalled();
  });
  it("mutlu yol: rumuzlu hedef modele gider, gerçek ad çıktıya ve dokümana döner, kredi düşmez, kalan 9", async () => {
    const { POST } = await import("./route");
    const res = await POST(req(govde()));
    expect(res.status).toBe(200);
    const girdi = hedefDenetle.mock.calls[0]![0];
    expect(girdi.hedef).not.toContain("Arda");
    expect(girdi.hedef).toContain(ALIAS);
    expect(girdi.baglam).toEqual({ kademeYas: "İlkokul (1–4. sınıf), 8 yaş", meb: undefined });
    const body = await res.json();
    expect(body.sonuc.bilesenler.davranis.alinti).toBe("Arda doğru okur"); // alıntı hedefteki yazımla eşleşir (ad parçası)
    expect(body).toMatchObject({ docId: "d1", caseId: "c1", kalan: 9 });
    expect(logUsage).toHaveBeenCalledWith("acc1", "claude-sonnet-4-6", usage);
    const kayit = saveDocument.mock.calls[0]![1];
    expect(kayit).toMatchObject({ code: "Arda Yılmaz", kademe: "ilkokul_1_4", type: "hedef_denetim", credits: 0, model: "claude-sonnet-4-6", mebDavranisKodlari: [] });
    expect(String(kayit.content)).toContain("## Hedef\n> Arda doğru okur");
    expect(String(kayit.content)).toContain('"Arda doğru okur"');
    expect(withCredits).not.toHaveBeenCalled();
  });
  it("MEB kodu: modele MEB bloğu gider, dokümana kod yazılır", async () => {
    const { POST } = await import("./route");
    await POST(req(govde({ mebHedefKod: "3.2.5", mebDavranisKodlari: [] })));
    expect(String(hedefDenetle.mock.calls[0]![0].baglam?.meb)).toContain("3.2.5");
    expect(saveDocument.mock.calls[0]![1]).toMatchObject({ mebHedefKod: "3.2.5" });
  });
  it("doküman kaydı patlarsa yine 200, docId/caseId null", async () => {
    const { POST } = await import("./route");
    saveDocument.mockRejectedValueOnce(new Error("db"));
    const res = await POST(req(govde()));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ docId: null, caseId: null });
  });
  it("DenetimHatasi → 502, diğer hata → 500; ikisinde de doküman yazılmaz", async () => {
    const { POST } = await import("./route");
    hedefDenetle.mockRejectedValueOnce(new DenetimHatasi("parse"));
    expect((await POST(req(govde()))).status).toBe(502);
    hedefDenetle.mockRejectedValueOnce(new Error("ağ"));
    expect((await POST(req(govde()))).status).toBe(500);
    expect(saveDocument).not.toHaveBeenCalled();
  });
  it.each(["Ar\u00ADda okur.", "Ar\u200Bda okur.", "Ar<i></i>da okur."])("gizli karakterle bölünmüş ad (%j) modele ham gitmez", async (h) => {
    const { POST } = await import("./route");
    expect((await POST(req(govde({ hedef: h })))).status).toBe(200);
    expect(hedefDenetle.mock.calls[0]![0].hedef).not.toContain("Arda");
  });
  it("yalnız görünmez karakterli hedef → 422, hız sınırı sorulmaz", async () => {
    const { POST } = await import("./route");
    expect((await POST(req(govde({ hedef: "\u200B" })))).status).toBe(422);
    expect(rateLimit).not.toHaveBeenCalled();
  });
  it("24 saatlik tavan (günlük sayımdan sonra) → 429 DAILY_CAP, model çağrılmaz", async () => {
    const { POST } = await import("./route");
    gunRl.allowed = false;
    const res = await POST(req(govde()));
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ code: "DAILY_CAP" });
    expect(count).toHaveBeenCalled();
    expect(hedefDenetle).not.toHaveBeenCalled();
  });
  it("günlük sınırla reddedilen istek 24 saatlik sayacı tüketmez", async () => {
    const { POST } = await import("./route");
    count.mockResolvedValueOnce(10);
    expect((await POST(req(govde()))).status).toBe(429);
    expect(rateLimit.mock.calls.some((c) => String(c[0]).includes("-gun:"))).toBe(false);
  });
  it("parse hatası kullanım taşıyorsa logUsage bir kez + 502; taşımıyorsa çağrılmaz", async () => {
    const { POST } = await import("./route");
    const err = new DenetimHatasi("parse", "x", { model: "mm", usage });
    hedefDenetle.mockRejectedValueOnce(err);
    expect((await POST(req(govde()))).status).toBe(502);
    expect(logUsage).toHaveBeenCalledTimes(1);
    expect(logUsage).toHaveBeenCalledWith("acc1", "mm", usage);
    logUsage.mockClear();
    hedefDenetle.mockRejectedValueOnce(new DenetimHatasi("parse"));
    expect((await POST(req(govde()))).status).toBe(502);
    expect(logUsage).not.toHaveBeenCalled();
  });
  it("kayıt patlarsa kalan 10", async () => {
    const { POST } = await import("./route");
    saveDocument.mockRejectedValueOnce(new Error("db"));
    expect((await (await POST(req(govde()))).json()).kalan).toBe(10);
  });
  it("sayım patlarsa açık sayılır (200, model çağrılır)", async () => {
    const { POST } = await import("./route");
    count.mockRejectedValueOnce(new Error("db"));
    expect((await POST(req(govde()))).status).toBe(200);
    expect(hedefDenetle).toHaveBeenCalled();
  });
  it("yas yoksa kademeYas yaşsız; logUsage saveDocument'tan önce", async () => {
    const { POST } = await import("./route");
    await POST(req(govde({ yas: undefined })));
    expect(hedefDenetle.mock.calls[0]![0].baglam?.kademeYas).toBe("İlkokul (1–4. sınıf)");
    expect(logUsage.mock.invocationCallOrder[0]!).toBeLessThan(saveDocument.mock.invocationCallOrder[0]!);
  });
});
