// apps/hub/evals/lib/summary.selftest.eval.ts
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { tempFlow } from "./testFlow";
import { armSummary, baseOf, collectArms, refOf, renderSummary, type ResultRow } from "./summary";

const row = (id: string, win: number, hard: string[] = [], out = 1000, talimat = 1): ResultRow => ({ prompt_id: id, rep: 0, grade: { win, format_ok: 1, talimat, dil_kurali: 1, rumuz_yok: 1, yasak_kalip: 1 }, hard_fail: hard, out_tokens: out, usage_estimated: true });

describe("özet", () => {
  it("armSummary ortalamaları ve sert hata sayısını verir", () => {
    const s = armSummary([row("a", 1), row("b", 0, ["dil_kurali"], 2000, 0.5)]);
    expect(s).toMatchObject({ n: 2, win: 0.5, hard: 1, talimat: 0.75, out_tokens: 1500, truncated: 0 });
  });
  it("renderSummary tabana göre token farkı ve karar etiketi yazar", () => {
    const md = renderSummary([
      { tool: "studio/x", arm: "baseline", s: armSummary([row("a", 0.5, [], 1000)]) },
      { tool: "studio/x", arm: "v1", s: armSummary([row("a", 0.7, [], 1100)]) },
      { tool: "studio/x", arm: "v2", s: armSummary([row("a", 0.45, [], 900)]), ref: "v1" },
    ]);
    expect(md).toContain("| studio/x | v1 |");
    expect(md).toContain("+10%");
    expect(md).toContain("KABUL ADAYI");
    expect(md).toContain("HAIKU ADAYI");
  });

  describe("armSummary", () => {
    it("sert hata nedenlerini madde başına sayar (satır sayısı `hard`'dan ayrıdır)", () => {
      const s = armSummary([
        row("a", 0, ["dil_kurali"]),
        row("b", 0, ["dil_kurali", "rumuz_yok"]),
        row("c", 0, ["dil_kurali"]),
        row("d", 1),
      ]);
      expect(s.hard).toBe(3); // en az bir sert hata içeren satır
      expect(s.hardReasons).toEqual({ dil_kurali: 3, rumuz_yok: 1 });
    });
    it("sert hata yoksa neden tablosu boş", () => {
      expect(armSummary([row("a", 1)]).hardReasons).toEqual({});
    });
    it("kesilen satırları ve tahmini token bayrağını sayar", () => {
      const kesik: ResultRow = { ...row("a", 0.2), status: "truncated" };
      const s = armSummary([kesik, { ...row("b", 0.6), usage_estimated: false }]);
      expect(s.truncated).toBe(1);
      expect(s.estimated).toBe(true); // en az bir satır tahminiyse
      expect(armSummary([{ ...row("a", 1), usage_estimated: false }]).estimated).toBe(false);
    });
    it("çıktı token'ı eksik olan satır ortalamayı sıfırla çekmez", () => {
      const eksik: ResultRow = { ...row("b", 1), out_tokens: null };
      expect(armSummary([row("a", 1, [], 1000), eksik]).out_tokens).toBe(1000);
      expect(armSummary([eksik]).out_tokens).toBe(0);
    });
    it("boş satır listesi çökmez", () => {
      expect(armSummary([])).toMatchObject({ n: 0, win: 0, hard: 0, truncated: 0, hardReasons: {} });
    });
  });

  describe("renderSummary", () => {
    it("sert hata nedenini ayrı sütunda gösterir; hatasız kolda '—'", () => {
      const md = renderSummary([
        { tool: "studio/cards", arm: "baseline", s: armSummary([row("a", 0.5, ["dil_kurali"]), row("b", 0.5, ["dil_kurali"]), row("c", 0.5, ["rumuz_yok"]), row("d", 0.5)]) },
        { tool: "studio/cards", arm: "v1", s: armSummary([row("a", 0.8)]) },
      ]);
      const [baslik, , tabanSatiri, v1Satiri] = md.split("\n");
      expect(baslik).toContain("| sert hata | sert hata (neden) |");
      expect(tabanSatiri).toContain("| 3 | dil_kurali: 2, rumuz_yok: 1 |");
      expect(v1Satiri).toContain("| 0 | — |");
    });
    it("neden metnindeki '|' tabloyu bozmasın", () => {
      const md = renderSummary([{ tool: "t/x", arm: "baseline", s: armSummary([row("a", 0, ["a|b"])]) }]);
      expect(md).toContain("a\\|b: 1");
    });
    it("sütun sayısı başlıkla her satırda aynı", () => {
      const md = renderSummary([
        { tool: "t/x", arm: "baseline", s: armSummary([row("a", 0.5, ["dil_kurali"])]) },
        { tool: "t/x", arm: "v1", s: armSummary([row("a", 0.7)]) },
        { tool: "t/x", arm: "v2", s: armSummary([row("a", 0.5)]), ref: "v1" },
      ]);
      const sayi = (l: string) => l.replace(/\\\|/g, "").split("|").length;
      const tablo = md.split("\n").filter((l) => l.startsWith("|"));
      for (const l of tablo) expect(sayi(l), l).toBe(sayi(tablo[0]!));
    });
    it("KABUL ADAYI: win ≥ 0,65, sert hata tabandan fazla değil, token ≤ +%20", () => {
      const kol = (win: number, hard: string[], out: number) => renderSummary([
        { tool: "t/x", arm: "baseline", s: armSummary([row("a", 0.5, ["dil_kurali"], 1000)]) },
        { tool: "t/x", arm: "v1", s: armSummary([row("a", win, hard, out)]) },
      ]).split("\n").find((l) => l.startsWith("| t/x | v1 |"))!;
      expect(kol(0.65, [], 1200)).toContain("KABUL ADAYI"); // sınır değerler dahil
      expect(kol(0.64, [], 1000)).not.toContain("KABUL ADAYI");
      expect(kol(0.9, [], 1201)).not.toContain("KABUL ADAYI"); // bütçe aşımı
      expect(kol(0.9, [], 1201)).toContain("bütçe/sert hata gerilemesi");
      expect(kol(0.9, ["dil_kurali", "rumuz_yok"], 1000)).toContain("KABUL ADAYI"); // 1 satır = taban kadar
    });
    it("KABUL ADAYI: sert hata sayısı (satır) tabanı aşarsa verilmez", () => {
      const md = renderSummary([
        { tool: "t/x", arm: "baseline", s: armSummary([row("a", 0.5, [], 1000)]) },
        { tool: "t/x", arm: "v1", s: armSummary([row("a", 0.9, ["dil_kurali"], 1000)]) },
      ]);
      expect(md).not.toContain("KABUL ADAYI");
      expect(md).toContain("bütçe/sert hata gerilemesi");
    });
    it("HAIKU ADAYI: win ≥ 0,40 ve sert hata 0; referans kol yoksa belirtilir", () => {
      const v2 = (win: number, hard: string[]) => renderSummary([
        { tool: "t/x", arm: "v1", s: armSummary([row("a", 0.7)]) },
        { tool: "t/x", arm: "v2", s: armSummary([row("a", win, hard)]), ref: "v1" },
      ]).split("\n").find((l) => l.startsWith("| t/x | v2 |"))!;
      expect(v2(0.4, [])).toContain("HAIKU ADAYI");
      expect(v2(0.39, [])).not.toContain("HAIKU ADAYI");
      expect(v2(0.9, ["dil_kurali"])).not.toContain("HAIKU ADAYI");
      const yalniz = renderSummary([{ tool: "t/x", arm: "v2", s: armSummary([row("a", 0.9)]), ref: "v1" }]);
      expect(yalniz).not.toContain("HAIKU ADAYI");
      expect(yalniz).toContain("referans v1 yok");
    });
    it("baseline yokken v1 karar verilmez, açıkça söylenir; tabana göre '—'", () => {
      const md = renderSummary([{ tool: "t/x", arm: "v1", s: armSummary([row("a", 0.9)]) }]);
      expect(md).not.toContain("KABUL ADAYI");
      expect(md).toContain("baseline yok");
    });
    it("etiketli kollar: v1@r2 kendi turunun tabanına (baseline@r2) göre, yoksa baseline'a göre ölçülür", () => {
      const md = renderSummary([
        { tool: "t/x", arm: "baseline", s: armSummary([row("a", 0.5, [], 1000)]) },
        { tool: "t/x", arm: "baseline@r2", s: armSummary([row("a", 0.5, [], 2000)]) },
        { tool: "t/x", arm: "v1@r2", s: armSummary([row("a", 0.7, [], 2200)]) },
        { tool: "t/x", arm: "v1@r3", s: armSummary([row("a", 0.7, [], 1100)]) },
        { tool: "t/x", arm: "v2@r2", s: armSummary([row("a", 0.5, [], 900)]), ref: "v1@r2" },
      ]);
      const sat = (arm: string) => md.split("\n").find((l) => l.startsWith(`| t/x | ${arm} |`))!;
      expect(sat("v1@r2")).toContain("+10%"); // 2200 / 2000 (baseline@r2)
      expect(sat("v1@r2")).toContain("KABUL ADAYI");
      expect(sat("v1@r3")).toContain("+10%"); // r3 tabanı yok → baseline: 1100 / 1000
      expect(sat("v1@r3")).toContain("KABUL ADAYI");
      expect(sat("v2@r2")).toContain("HAIKU ADAYI");
      expect(sat("baseline@r2")).toContain("+100%"); // yeniden koşulan taban, ilk tabana göre
    });
    it("tahmini token '~' ile işaretlenir; araçlar ayrı gruplanır", () => {
      const md = renderSummary([
        { tool: "a/x", arm: "baseline", s: armSummary([row("a", 0.5, [], 1000)]) },
        { tool: "b/y", arm: "baseline", s: armSummary([row("a", 0.5, [], 500)]) },
        { tool: "a/x", arm: "v1", s: armSummary([row("a", 0.7, [], 1000)]) },
      ]);
      expect(md).toContain("1000~");
      const sirasi = md.split("\n").filter((l) => l.startsWith("| a/x") || l.startsWith("| b/y")).map((l) => l.split("|")[1]!.trim() + ":" + l.split("|")[2]!.trim());
      expect(sirasi).toEqual(["a/x:baseline", "a/x:v1", "b/y:baseline"]);
    });
  });

  describe("refOf / baseOf", () => {
    it("v2 → v1 (etiket korunur); diğer kolların referansı yok", () => {
      expect(refOf("v2")).toBe("v1");
      expect(refOf("v2@r2")).toBe("v1@r2");
      expect(refOf("v1")).toBeUndefined();
      expect(refOf("v1@r2")).toBeUndefined();
      expect(refOf("baseline")).toBeUndefined();
    });
    it("baseOf: etiketin kendi tabanı, yoksa etiketsiz baseline; baseline'ın kendisi için undefined", () => {
      expect(baseOf("v1", ["baseline", "v1"])).toBe("baseline");
      expect(baseOf("v1@r2", ["baseline", "baseline@r2", "v1@r2"])).toBe("baseline@r2");
      expect(baseOf("v1@r2", ["baseline", "v1@r2"])).toBe("baseline");
      expect(baseOf("v1", ["v1"])).toBeUndefined();
      expect(baseOf("baseline", ["baseline"])).toBeUndefined();
      expect(baseOf("baseline@r2", ["baseline", "baseline@r2"])).toBe("baseline");
    });
  });

  describe("collectArms: <flow>/<modül>/<araç>/<kol>/results.jsonl", () => {
    const yaz = (flow: string, rel: string, rows: unknown[]) => {
      const f = path.join(flow, rel, "results.jsonl");
      mkdirSync(path.dirname(f), { recursive: true });
      writeFileSync(f, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
    };
    it("kolları, v2 referanslarını (etiketli dahil) bulur; controls, boş, sonuçsuz kolları ve dosyaları atlar", () => {
      const flow = tempFlow("ozet-");
      yaz(flow, "studio/cards/baseline", [row("a", 0.5, ["dil_kurali"])]);
      yaz(flow, "studio/cards/v1", [row("a", 0.7)]);
      yaz(flow, "studio/cards/v1@r2", [row("a", 0.7)]);
      yaz(flow, "studio/cards/v2", [row("a", 0.5)]);
      yaz(flow, "studio/cards/v2@r2", [row("a", 0.5)]);
      yaz(flow, "studio/cards/controls", [row("a", 1)]);
      yaz(flow, "studio/cards/controls@r2", [row("a", 1)]);
      yaz(flow, "studio/cards/v1@bos", []); // boş results.jsonl
      mkdirSync(path.join(flow, "studio/cards/v1@sonucsuz"), { recursive: true }); // results.jsonl yok
      writeFileSync(path.join(flow, "studio/cards/ipucu.txt"), "dizin değil");
      writeFileSync(path.join(flow, "ozet.md"), "eski özet");
      yaz(flow, "atolye/bep/baseline", [row("a", 0.5)]);
      mkdirSync(path.join(flow, "diger/x/baseline"), { recursive: true }); // bilinmeyen modül
      const rows = collectArms(flow);
      expect(rows.map((r) => `${r.tool}|${r.arm}|${r.ref ?? ""}`)).toEqual([
        "studio/cards|baseline|",
        "studio/cards|v1|",
        "studio/cards|v1@r2|",
        "studio/cards|v2|v1",
        "studio/cards|v2@r2|v1@r2",
        "atolye/bep|baseline|",
      ]);
      expect(rows[0]!.s).toMatchObject({ n: 1, hard: 1, hardReasons: { dil_kurali: 1 } });
    });
    it("akış dizini yoksa boş liste", () => {
      expect(collectArms(path.join(tempFlow("ozet-yok-"), "yok"))).toEqual([]);
    });
  });
});
