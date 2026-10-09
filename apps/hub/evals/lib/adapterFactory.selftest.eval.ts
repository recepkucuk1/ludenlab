// apps/hub/evals/lib/adapterFactory.selftest.eval.ts
import { describe, expect, it } from "vitest";
import { atolyeAdapter, profilBody, studioAdapter, type AtolyeToolCfg, type StudioToolCfg, type ToolCheckOut } from "./adapterFactory";
import { resolveFixture } from "./fixtures";
import type { AtolyeFixture, CaseDef, StudioFixture } from "./core";

const TASLAK = "⚠️ Bu metin yapay zekâ ile üretilmiş bir TASLAKTIR; uygulanmadan önce ilgili uzman tarafından gözden geçirilip onaylanmalıdır.";
const config = expect.objectContaining({ failureClass: "config" });
const harness = expect.objectContaining({ failureClass: "harness_error" });
const puan = (scores: Record<string, number>) => (): ToolCheckOut => ({ scores, details: {}, hard: [] });

/** Gönderilen istekleri kaydeden sahte rota. */
function kayitliRota() {
  const istekler: Array<Record<string, unknown>> = [];
  const route = async () => ({
    POST: async (req: Request) => {
      istekler.push((await req.json()) as Record<string, unknown>);
      return new Response(JSON.stringify({ x: 1 }));
    },
  });
  return { istekler, route };
}

const sCfg: StudioToolCfg<{ n: number }> = {
  id: "studio/x", label: "X (Studio)", dir: "/tmp", route: async () => ({ POST: async () => new Response("{}") }),
  responseKey: "x", studentRequired: false,
  requestLines: (b) => [`- n: ${b.n}`],
  renderOutput: (o) => `Başlık: ${typeof o === "string" ? o : String(o.title ?? "—")}`,
  checks: ({ output }) => ({ scores: { talimat: output ? 1 : 0 }, details: {}, hard: [] }),
  criteria: [{ key: "ozel", question: "?" }],
  generic: (o) => ({ ...(o as Record<string, unknown>), title: "Jenerik" }),
};
const s = studioAdapter(sCfg);

const mCfg: StudioToolCfg<Record<string, never>> = {
  id: "studio/m", label: "M (Studio)", dir: "/tmp", send: async () => new Response("{}"), responseKey: "aiProfile",
  studentRequired: true, output: "markdown", sections: [/kavramsal arka plan/, /uzmana öneriler/],
  requestLines: () => [], criteria: [],
};

describe("studioAdapter", () => {
  it("ortak ölçütleri ve kontrolleri birleştirir", () => {
    expect(s.criteria.map((c) => c.key)).toEqual(["ozgulluk", "klinik_derinlik", "bicim_butce", "dil_etik", "ozel"]);
    const r = s.checks({ body: { n: 1 }, output: { title: "A" }, rawText: '{"title":"A"}', alias: "Defne" });
    expect(r.scores).toMatchObject({ talimat: 1, dil_kurali: 1, rumuz_yok: 1, yasak_kalip: 1 });
    expect(r.hard_fail).toEqual([]);
    const bad = s.checks({ body: { n: 1 }, output: null, rawText: "Üzgünüm", alias: null });
    expect(bad.hard_fail).toEqual(expect.arrayContaining(["json_gecersiz", "cikti_yok"]));
  });
  it("markdown modu: bölüm oranı, tanı cümlesi, taslak notu zorunlu DEĞİL", () => {
    const m = studioAdapter(mCfg);
    const text = "## Kavramsal Arka Plan\nmetin\n## Uzmana Öneriler\n- öneri";
    const r = m.checks({ body: {}, output: text, rawText: text, alias: "Hazal" });
    expect(r.hard_fail).toEqual([]);
    expect(r.details.yapi).toBe(1);
    expect(m.renderForJudge(text)).toBe(text);
    expect(m.genericCandidate(text)).toContain("## Uzmana Öneriler");
  });
  it("markdown modu: renderOutput metni doğrudan alır", () => {
    const m = studioAdapter({ ...mCfg, renderOutput: (o) => `[${typeof o === "string" ? o : "nesne"}]` });
    expect(m.renderForJudge("## A")).toBe("[## A]");
  });
  it("renderTask öğrenci bağlamını ve rumuz notunu ekler", () => {
    const f = resolveFixture("studio", "stu-ela") as StudioFixture;
    const t = s.renderTask({ id: "x-01", tags: [], purpose: "p", body: { n: 1 }, student: "stu-ela" }, f);
    expect(t).toContain("- Araç: X (Studio)");
    expect(t).toContain("- n: 1");
    expect(t).toContain(f.name);
    expect(t).toContain("rumuz");
    expect(t).toContain("Neyi sınıyor: p");
  });

  describe("talimat kuralı", () => {
    it("JSON: araç talimat vermezse puanlarının ortalaması, puan yoksa 1, geçersiz JSON'da 0", () => {
      const j = studioAdapter({ ...sCfg, checks: puan({ a: 1, b: 0 }) });
      const ok = j.checks({ body: { n: 1 }, output: { t: "x" }, rawText: '{"t":"x"}', alias: null });
      expect(ok.scores).toMatchObject({ talimat: 0.5, a: 1, b: 0 });
      expect(j.checks({ body: { n: 1 }, output: { t: "x" }, rawText: "bozuk", alias: null }).scores.talimat).toBe(0);
      const yalin = studioAdapter({ ...sCfg, checks: undefined });
      expect(yalin.checks({ body: { n: 1 }, output: { t: "x" }, rawText: '{"t":"x"}', alias: null }).scores.talimat).toBe(1);
    });
    it("markdown: aracın döndürdüğü talimat çift sayılmaz (Studio markdown + Atölye)", () => {
      const tool = puan({ talimat: 0, p: 0.5 });
      const m = studioAdapter({ ...mCfg, sections: [/a/], checks: tool });
      const r = m.checks({ body: {}, output: "## A\nmetin", rawText: "## A\nmetin", alias: null });
      expect(r.scores.talimat).toBeCloseTo((1 + 1 + 0.5) / 3); // yapi, tanı cümlesi yok, p
      expect(r.scores.p).toBe(0.5);
      const a = atolyeAdapter({ ...aCfg, sections: [/okuma/], checks: tool });
      const t = `## Okuma\n- a\n\n${TASLAK}`;
      expect(a.checks({ body: { k: "v" }, output: t, rawText: t, alias: null }).scores.talimat).toBeCloseTo((1 + 1 + 1 + 0.5) / 4); // + taslak sonda
    });
    it("yapi: bölüm listesi boşsa '—' ve talimata girmez", () => {
      const m = studioAdapter({ ...mCfg, sections: undefined });
      const r = m.checks({ body: {}, output: "metin", rawText: "metin", alias: null });
      expect(r.details.yapi).toBe("—");
      expect(r.scores.talimat).toBe(1); // yalnız tanı cümlesi yok = 1
      expect(m.checks({ body: {}, output: "Öğrenci disleksiktir.", rawText: "x", alias: null }).scores.talimat).toBe(0);
    });
  });

  it("ayrılmış puan anahtarı config hatasıdır (talimat serbest)", () => {
    for (const k of ["win", "format_ok", "dil_kurali", "rumuz_yok", "yasak_kalip"]) {
      const j = studioAdapter({ ...sCfg, checks: puan({ [k]: 1 }) });
      expect(() => j.checks({ body: { n: 1 }, output: { t: "x" }, rawText: '{"t":"x"}', alias: null }), k).toThrow(config);
    }
  });

  it("kurulum anında config hataları: route/send yok, JSON araçta generic yok", () => {
    expect(() => studioAdapter({ ...sCfg, route: undefined })).toThrow(config);
    expect(() => studioAdapter({ ...sCfg, generic: undefined })).toThrow(config);
    expect(() => studioAdapter({ ...mCfg, generic: undefined })).not.toThrow(); // markdown: genericMarkdown varsayılanı
  });

  describe("invoke", () => {
    it("send verilirse route yerine o çağrılır (gövde + fikstür kimliği)", async () => {
      const { istekler, route } = kayitliRota();
      const gonderilen: unknown[] = [];
      const a = studioAdapter({
        ...sCfg,
        route,
        send: async (body, fixtureId) => {
          gonderilen.push({ body, fixtureId });
          return new Response(JSON.stringify({ x: 2 }));
        },
      });
      await expect(a.invoke({ n: 1 }, "stu-ela")).resolves.toEqual({ status: 200, body: { x: 2 } });
      expect(gonderilen).toEqual([{ body: { n: 1 }, fixtureId: "stu-ela" }]);
      expect(istekler).toEqual([]);
    });
    it("varsayılan gövde { ...body, studentId }; mapBody verilirse onun çıktısı gider", async () => {
      const { istekler, route } = kayitliRota();
      await studioAdapter({ ...sCfg, route }).invoke({ n: 1 }, "stu-ela");
      await studioAdapter({ ...sCfg, route }).invoke({ n: 2 }, null);
      await studioAdapter({ ...sCfg, route, mapBody: (b, id) => ({ sayi: b.n, ogr: id }) }).invoke({ n: 3 }, "stu-ela");
      expect(istekler).toEqual([{ n: 1, studentId: "stu-ela" }, { n: 2 }, { sayi: 3, ogr: "stu-ela" }]);
    });
    it("studentRequired: öğrencisiz vaka harness_error, istek gönderilmez", async () => {
      const { istekler, route } = kayitliRota();
      await expect(studioAdapter({ ...sCfg, route, studentRequired: true }).invoke({ n: 1 }, null)).rejects.toThrow(harness);
      expect(istekler).toEqual([]);
    });
  });
});

const aCfg: AtolyeToolCfg<{ k: string }> = {
  id: "atolye/y", label: "Y (Atölye)", dir: "/tmp", route: async () => ({ POST: async () => new Response("{}") }),
  body: (b, f) => ({ ...profilBody(f), ...b }),
  requestLines: (b) => [`- k: ${b.k}`],
  sections: [/okuma/, /yöntem/],
  criteria: [{ key: "ozel", question: "?" }],
};

describe("atolyeAdapter", () => {
  const a = atolyeAdapter(aCfg);
  it("profilBody fikstürü şema alanlarına çevirir", () => {
    const f = resolveFixture("atolye", "case-mina") as AtolyeFixture;
    const b = profilBody(f);
    expect(b).toMatchObject({ rumuz: f.code, kademe: f.kademe, taniProfili: f.taniProfili });
    expect(b).not.toHaveProperty("gucluYonler"); // null → gönderilmez
  });
  it("Markdown kontrolleri: yapı, taslak notu, tanı cümlesi", () => {
    const good = `## Okuma\n- a\n## Yöntem\n- b\n\n${TASLAK}`;
    const r = a.checks({ body: { k: "v" }, output: good, rawText: good, alias: "Hazal" });
    expect(r.hard_fail).toEqual([]);
    expect(r.details.yapi).toBe(1);
    const bad = "## Okuma\n- Hazal disleksiktir.";
    const rb = a.checks({ body: { k: "v" }, output: bad, rawText: bad, alias: "Hazal" });
    expect(rb.hard_fail).toEqual(expect.arrayContaining(["taslak_notu_yok", "rumuz_sizintisi"]));
    expect(rb.details.tani_cumlesi).toBe(1);
  });
  it("g/y bayraklı bölüm kalıbı ardışık çağrılarda durum taşımaz", () => {
    const g = atolyeAdapter({ ...aCfg, sections: [/okuma/g, /yöntem/y] });
    const t = `## Okuma\n- a\n## Yöntem\n- b\n\n${TASLAK}`;
    for (let i = 0; i < 3; i++) expect(g.checks({ body: { k: "v" }, output: t, rawText: t, alias: null }).details.yapi).toBe(1);
  });
  it("kurulum anında config hatası: route yok", () => {
    expect(() => atolyeAdapter({ ...aCfg, route: undefined as never })).toThrow(config);
  });
  it("renderTask fikstürsüz çağrılırsa harness_error (TypeError değil)", () => {
    const c: CaseDef<{ k: string }> = { id: "y-01", tags: [], purpose: "p", body: { k: "v" }, student: null };
    expect(() => a.renderTask(c, null)).toThrow(harness);
  });
  it("rumuz ve kademe fikstürden yazılır: vaka gövdesi ezemez", async () => {
    const { istekler, route } = kayitliRota();
    const f = resolveFixture("atolye", "case-mina") as AtolyeFixture;
    const sahte = { k: "v", rumuz: "Sahte Ad", kademe: "lise_9_uzeri" };
    await atolyeAdapter({ ...aCfg, route }).invoke(sahte, "case-mina");
    expect(istekler[0]).toMatchObject({ k: "v", rumuz: f.code, kademe: f.kademe });
  });
});
