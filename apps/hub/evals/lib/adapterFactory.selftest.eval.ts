// apps/hub/evals/lib/adapterFactory.selftest.eval.ts
import { describe, expect, it } from "vitest";
import { atolyeAdapter, profilBody, studioAdapter } from "./adapterFactory";
import { resolveFixture } from "./fixtures";
import type { AtolyeFixture, StudioFixture } from "./core";

const s = studioAdapter<{ n: number }>({
  id: "studio/x", label: "X (Studio)", dir: "/tmp", route: async () => ({ POST: async () => new Response("{}") }),
  responseKey: "x", studentRequired: false,
  requestLines: (b) => [`- n: ${b.n}`],
  renderOutput: (o) => `Başlık: ${String(o.title ?? "—")}`,
  checks: ({ output }) => ({ scores: { talimat: output ? 1 : 0 }, details: {}, hard: [] }),
  criteria: [{ key: "ozel", question: "?" }],
  generic: (o) => ({ ...(o as Record<string, unknown>), title: "Jenerik" }),
});

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
    const m = studioAdapter<Record<string, never>>({
      id: "studio/m", label: "M (Studio)", dir: "/tmp", send: async () => new Response("{}"), responseKey: "aiProfile",
      studentRequired: true, output: "markdown", sections: [/kavramsal arka plan/, /uzmana öneriler/],
      requestLines: () => [], criteria: [],
    });
    const text = "## Kavramsal Arka Plan\nmetin\n## Uzmana Öneriler\n- öneri";
    const r = m.checks({ body: {}, output: text, rawText: text, alias: "Hazal" });
    expect(r.hard_fail).toEqual([]);
    expect(r.details.yapi).toBe(1);
    expect(m.renderForJudge(text)).toBe(text);
    expect(m.genericCandidate(text)).toContain("## Uzmana Öneriler");
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
});

describe("atolyeAdapter", () => {
  const a = atolyeAdapter<{ k: string }>({
    id: "atolye/y", label: "Y (Atölye)", dir: "/tmp", route: async () => ({ POST: async () => new Response("{}") }),
    body: (b, f) => ({ ...profilBody(f), ...b }),
    requestLines: (b) => [`- k: ${b.k}`],
    sections: [/okuma/, /yöntem/],
    criteria: [{ key: "ozel", question: "?" }],
  });
  it("profilBody fikstürü şema alanlarına çevirir", () => {
    const f = resolveFixture("atolye", "case-mina") as AtolyeFixture;
    const b = profilBody(f);
    expect(b).toMatchObject({ rumuz: f.code, kademe: f.kademe, taniProfili: f.taniProfili });
    expect(b).not.toHaveProperty("gucluYonler"); // null → gönderilmez
  });
  it("Markdown kontrolleri: yapı, taslak notu, tanı cümlesi", () => {
    const good = "## Okuma\n- a\n## Yöntem\n- b\n\n⚠️ Bu metin yapay zekâ ile üretilmiş bir TASLAKTIR; uygulanmadan önce ilgili uzman tarafından gözden geçirilip onaylanmalıdır.";
    const r = a.checks({ body: { k: "v" }, output: good, rawText: good, alias: "Hazal" });
    expect(r.hard_fail).toEqual([]);
    expect(r.details.yapi).toBe(1);
    const bad = "## Okuma\n- Hazal disleksiktir.";
    const rb = a.checks({ body: { k: "v" }, output: bad, rawText: bad, alias: "Hazal" });
    expect(rb.hard_fail).toEqual(expect.arrayContaining(["taslak_notu_yok", "rumuz_sizintisi"]));
    expect(rb.details.tani_cumlesi).toBe(1);
  });
});
