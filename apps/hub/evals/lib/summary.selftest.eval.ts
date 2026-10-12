// apps/hub/evals/lib/summary.selftest.eval.ts
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { tempFlow } from "./testFlow";
import { armSummary, baseOf, collectArms, refOf, renderSummary, type ArmRow, type ResultRow } from "./summary";

const row = (id: string, win: number, hard: string[] = [], out = 1000, talimat = 1, extra: Partial<ResultRow> = {}): ResultRow => ({
  prompt_id: id,
  rep: 0,
  grade: { win, format_ok: 1, talimat, dil_kurali: 1, rumuz_yok: 1, yasak_kalip: 1 },
  hard_fail: hard,
  out_tokens: out,
  usage_estimated: true,
  ...extra,
});
const arm = (tool: string, name: string, rows: ResultRow[], extra: Partial<ArmRow> = {}): ArmRow => ({ tool, arm: name, s: armSummary(rows), ...extra });
const sat = (md: string, tool: string, kol: string) => md.split("\n").find((l) => l.startsWith(`| ${tool} | ${kol} |`)) ?? "";
/** Karar sütunu (son hücre). */
const karar = (md: string, tool: string, kol: string) => sat(md, tool, kol).replace(/ \|$/, "").split(" | ").at(-1)!;
const dortVaka = (win: number, hard: Record<string, string[]> = {}, out = 1000, extra: Partial<ResultRow> = {}) =>
  ["a", "b", "c", "d"].map((id) => row(id, win, hard[id] ?? [], out, 1, extra));

describe("armSummary: vaka bazlı toplama", () => {
  it("ortalamaları ve sert hata sayısını verir (tekrarsız: vaka = satır)", () => {
    const s = armSummary([row("a", 1), row("b", 0, ["dil_kurali"], 2000, 0.5)]);
    expect(s).toMatchObject({ n: 2, satir: 2, win: 0.5, hard: 1, talimat: 0.75, out_tokens: 1500, truncated: 0 });
  });
  it("tekrarlar vakada birleşir: win ortalaması, sert hata KÜMESİ, token ortalaması; kol puanı vaka ortalamalarının ortalaması", () => {
    const s = armSummary([
      row("a", 1, ["dil_kurali"], 1000),
      { ...row("a", 0, ["dil_kurali", "rumuz_sizintisi"], 3000), rep: 1 },
      row("b", 1, [], 2000),
    ]);
    expect(s.n).toBe(2);
    expect(s.satir).toBe(3);
    expect(s.cases[0]).toMatchObject({ id: "a", reps: 2, win: 0.5, reasons: ["dil_kurali", "rumuz_sizintisi"], tokens: 2000 });
    expect(s.win).toBeCloseTo(0.75); // satır ortalaması 0,667 olurdu: çok tekrarlı vaka kolu ezmez
    expect(s.out_tokens).toBe(2000); // (2000 + 2000) / 2
    expect(s.hard).toBe(1); // satır sayısı (2) değil VAKA sayısı
    expect(s.hardReasons).toEqual({ dil_kurali: 1, rumuz_sizintisi: 1 }); // aynı neden iki tekrarda: tek vaka
    expect([s.tekrarMin, s.tekrarMax]).toEqual([1, 2]);
  });
  it("sert hata yoksa neden tablosu boş", () => {
    expect(armSummary([row("a", 1)]).hardReasons).toEqual({});
  });
  it("kesilen satırları sayar; kaynak türü: tahmini / gerçek / karışık / yok", () => {
    expect(armSummary([{ ...row("a", 0.2), status: "truncated" }, row("b", 0.6)]).truncated).toBe(1);
    expect(armSummary([row("a", 1), row("b", 1)]).tokenKind).toBe("tahmini");
    expect(armSummary([row("a", 1, [], 1000, 1, { usage_estimated: false })]).tokenKind).toBe("gercek");
    expect(armSummary([row("a", 1), row("b", 1, [], 1000, 1, { usage_estimated: false })]).tokenKind).toBe("karisik");
    expect(armSummary([row("a", 1, [], null as unknown as number)]).tokenKind).toBe("yok");
  });
  it("çıktı token'ı eksik satır ortalamayı sıfırla çekmez; hiç token yoksa null", () => {
    const eksik: ResultRow = { ...row("b", 1), out_tokens: null };
    expect(armSummary([row("a", 1, [], 1000), eksik]).out_tokens).toBe(1000);
    expect(armSummary([eksik]).out_tokens).toBeNull();
  });
  it("win gerekçesinin ilk satırı: en düşük win'li tekrardan", () => {
    const s = armSummary([
      row("a", 1, [], 1000, 1, { explanation: { win: "Aday daha iyi.\nİkinci satır." } }),
      { ...row("a", 0, [], 1000, 1, { explanation: { win: "\nAday kaybetti: jenerik.\nDetay." } }), rep: 1 },
    ]);
    expect(s.cases[0]!.explanation).toBe("Aday kaybetti: jenerik.");
  });
  it("hakem sırası sayısı satırların meta.judge_orders'ından; yoksa 1", () => {
    expect(armSummary([row("a", 1)]).orders).toBe(1);
    expect(armSummary([row("a", 1, [], 1000, 1, { meta: { judge_orders: 2 } })]).orders).toBe(2);
  });
  it("boş satır listesi ve grade'siz satır çökmez", () => {
    expect(armSummary([])).toMatchObject({ n: 0, satir: 0, win: 0, hard: 0, truncated: 0, hardReasons: {}, out_tokens: null, cases: [] });
    expect(armSummary([{ prompt_id: "a", rep: 0, out_tokens: 5 }]).win).toBe(0);
  });
});

describe("renderSummary: tablo", () => {
  it("n = vakalar×tekrar, kapsam, sert hata VAKA sayısı/n ve nedenler vaka bazlı", () => {
    const md = renderSummary([
      arm("studio/cards", "baseline", [
        row("a", 0.5, ["dil_kurali"]),
        { ...row("a", 0.5, ["dil_kurali"]), rep: 1 },
        row("b", 0.5, ["dil_kurali", "rumuz_yok"]),
        { ...row("b", 0.5), rep: 1 },
        row("c", 0.5),
        { ...row("c", 0.5), rep: 1 },
        row("d", 0.5),
        { ...row("d", 0.5), rep: 1 },
      ]),
    ]);
    const [baslik, , taban] = md.split("\n");
    expect(baslik).toContain("| Araç | Kol | n | kapsam | win | sert hata | sert hata (neden) |");
    expect(taban).toContain("| studio/cards | baseline | 4×2 | 4/4 | 0.50 | 2/4 | dil_kurali: 2/4, rumuz_yok: 1/4 |");
  });
  it("sütun sayısı başlıkla her tablo satırında aynı (kaçırılmış '|' dahil)", () => {
    const md = renderSummary([
      arm("t/x", "baseline", [row("a", 0.5, ["a|b"])]),
      arm("t/x", "v1", [row("a", 0.7)], { ref: "baseline" }),
      arm("t/x", "v2", [row("a", 0.5, [], 1000, 1, { explanation: { win: "x | y" } })], { ref: "v1" }),
    ]);
    const sayi = (l: string) => l.replace(/\\\|/g, "").split("|").length;
    const ana = md.split("\n").slice(0, 5).filter((l) => l.startsWith("|"));
    for (const l of ana) expect(sayi(l), l).toBe(sayi(ana[0]!));
    expect(md).toContain("a\\|b: 1/1");
    expect(md).toContain("x \\| y");
  });

  describe("KABUL ADAYI (v1)", () => {
    const kos = (candRows: ResultRow[], baseRows: ResultRow[] = dortVaka(0.5, { a: ["dil_kurali"] })) =>
      karar(renderSummary([arm("t/x", "baseline", baseRows), arm("t/x", "v1", candRows)]), "t/x", "v1");

    it("win ≥ 0,65 (vaka ortalamaları), sert hata gerilemez, token ≤ +%20: sınır değerler dahil", () => {
      expect(kos(dortVaka(0.65, {}, 1200))).toBe("KABUL ADAYI");
      expect(kos(dortVaka(0.64))).toBe("—");
      expect(kos(dortVaka(0.9, {}, 1201))).toBe("win tamam; bütçe +20%");
    });
    it("bütçe etiketi gerçek yüzdeyi söyler", () => {
      expect(kos(dortVaka(0.9, {}, 1270))).toBe("win tamam; bütçe +27%");
    });
    it("sert hata NEDEN bazlı: dil_kurali → rumuz_yok DEĞİŞİMİ (sayı aynı) KABUL ADAYI DEĞİL", () => {
      const l = kos(dortVaka(0.9, { a: ["rumuz_yok"] }));
      expect(l).not.toContain("KABUL ADAYI");
      expect(l).toBe("win tamam; sert hata: rumuz_yok +1/4");
    });
    it("rumuz_sizintisi / pii sınıfı neden adayda varsa HER ZAMAN engel (tabanda da olsa)", () => {
      const takas = kos(dortVaka(0.9, { a: ["rumuz_sizintisi"] }));
      expect(takas).toBe("win tamam; sert hata: rumuz_sizintisi +1/4 (her zaman engel)");
      const tabanda = kos(dortVaka(0.9, { a: ["rumuz_sizintisi"] }), dortVaka(0.5, { a: ["rumuz_sizintisi"] }));
      expect(tabanda).toBe("win tamam; sert hata: rumuz_sizintisi 1/4 (her zaman engel)");
      expect(kos(dortVaka(0.9, { b: ["pii_leak"] }), dortVaka(0.5, { b: ["pii_leak"] }))).toContain("pii_leak 1/4 (her zaman engel)");
    });
    it("aynı nedenin vaka sayısı tabandan fazla olamaz; eşit ya da az olabilir; yeni neden gerileme", () => {
      const taban = dortVaka(0.5, { a: ["dil_kurali"], b: ["dil_kurali"] });
      expect(kos(dortVaka(0.9, { a: ["dil_kurali"], b: ["dil_kurali"] }), taban)).toBe("KABUL ADAYI"); // eşit
      expect(kos(dortVaka(0.9, { a: ["dil_kurali"] }), taban)).toBe("KABUL ADAYI"); // az
      expect(kos(dortVaka(0.9), taban)).toBe("KABUL ADAYI"); // sıfır
      expect(kos(dortVaka(0.9, { a: ["dil_kurali"], b: ["dil_kurali"], c: ["dil_kurali"] }), taban)).toBe("win tamam; sert hata: dil_kurali +1/4");
      expect(kos(dortVaka(0.9, { a: ["dil_kurali"], d: ["json_gecersiz"] }), taban)).toBe("win tamam; sert hata: json_gecersiz +1/4");
    });
    it("sert hata ve bütçe birlikte: ikisi de söylenir", () => {
      expect(kos(dortVaka(0.9, { c: ["json_gecersiz"] }, 1300), dortVaka(0.5))).toBe("win tamam; sert hata: json_gecersiz +1/4; bütçe +30%");
    });
    it("vaka içinde tekrarlar birleşir: tek vakanın iki tekrarında aynı neden TEK vaka sayılır", () => {
      // 4 vaka × 2 tekrar; "a" vakasının İKİ tekrarında da dil_kurali: satır sayısı 2 > taban 1 olurdu, vaka sayısı 1 ≤ 1
      const cand = ["a", "b", "c", "d"].flatMap((id) => [0, 1].map((rep) => ({ ...row(id, 0.9, id === "a" ? ["dil_kurali"] : []), rep })));
      expect(kos(cand, dortVaka(0.5, { a: ["dil_kurali"] }))).toBe("KABUL ADAYI");
    });
    it("karşılaştırma ORTAK vakalar üzerinde: adayda fazladan vaka puanı bozmaz", () => {
      const cand = [row("a", 0.9), row("b", 0.9), row("x", 0)];
      const md = renderSummary([arm("t/x", "baseline", [row("a", 0.5), row("b", 0.5)]), arm("t/x", "v1", cand)]);
      expect(karar(md, "t/x", "v1")).toBe("KABUL ADAYI"); // ortak {a,b}: win 0,9 (tüm kol 0,6 olurdu)
      expect(sat(md, "t/x", "v1")).toContain("| 3×1 | 3/3 | 0.60 |"); // sütunlar kolun kendi vakaları
    });
    it("aday ile taban ortak vaka paylaşmıyorsa etiket yok", () => {
      const md = renderSummary([arm("t/x", "baseline", [row("a", 0.5)]), arm("t/x", "v1", [row("b", 0.9)], { expected: ["b"] })]);
      expect(karar(md, "t/x", "v1")).toBe("ortak vaka yok");
    });
    it("baseline yokken karar verilmez, açıkça söylenir", () => {
      const md = renderSummary([arm("t/x", "v1", [row("a", 0.9)])]);
      expect(karar(md, "t/x", "v1")).toBe("baseline yok");
      expect(sat(md, "t/x", "v1")).toContain("| — | 0 |"); // tabana göre —
    });
  });

  describe("kapsam", () => {
    it("tabanın vakalarını eksik koşan aday etiket almaz; kapsam sütunu ve eksik vaka listesi", () => {
      const md = renderSummary([
        arm("t/x", "baseline", dortVaka(0.5)),
        arm("t/x", "v1", dortVaka(0.9).slice(0, 3), { whyMissing: { d: "bekliyor (üretim)" } }),
      ]);
      expect(sat(md, "t/x", "v1")).toContain("| 3×1 | 3/4 |");
      expect(karar(md, "t/x", "v1")).toBe("eksik kapsam 3/4");
      expect(md).toContain("- t/x v1: d (bekliyor (üretim))");
      expect(karar(md, "t/x", "v1")).not.toContain("KABUL ADAYI");
    });
    it("neden bilinmiyorsa 'koşulmadı'; birden çok eksik sıralı", () => {
      const md = renderSummary([arm("t/x", "baseline", dortVaka(0.5)), arm("t/x", "v1", [row("b", 0.9)], { whyMissing: { c: "hata: tool_parse" } })]);
      expect(md).toContain("- t/x v1: a (koşulmadı), c (hata: tool_parse), d (koşulmadı)");
    });
    it("beklenen küme açıkça verilirse (cases.json) taban da dahil kapsam payda olur: eksik taban etiket vermez", () => {
      const md = renderSummary([
        arm("t/x", "baseline", dortVaka(0.5).slice(0, 3), { expected: ["a", "b", "c", "d"] }),
        arm("t/x", "v1", dortVaka(0.9), { expected: ["a", "b", "c", "d"] }),
      ]);
      expect(karar(md, "t/x", "baseline")).toBe("eksik kapsam 3/4");
      expect(karar(md, "t/x", "v1")).toBe("taban eksik kapsam 3/4");
    });
    it("v2 de eksik kapsamda etiket almaz", () => {
      const md = renderSummary([arm("t/x", "v1", dortVaka(0.7)), arm("t/x", "v2", dortVaka(0.5).slice(0, 2), { ref: "v1" })]);
      expect(karar(md, "t/x", "v2")).toBe("eksik kapsam 2/4");
    });
  });

  describe("HAIKU ADAYI (v2)", () => {
    const v2 = (candRows: ResultRow[], extra: Partial<ArmRow> = {}) =>
      karar(renderSummary([arm("t/x", "v1", dortVaka(0.7)), arm("t/x", "v2", candRows, { ref: "v1", ...extra })]), "t/x", "v2");
    it("win ≥ 0,40 ve TÜM vakalarda sıfır sert hata", () => {
      expect(v2(dortVaka(0.4))).toBe("HAIKU ADAYI");
      expect(v2(dortVaka(0.39))).toBe("—");
      expect(v2(dortVaka(0.9, { a: ["dil_kurali"] }))).toBe("win tamam; sert hata: dil_kurali 1/4");
    });
    it("referans (v1) kolu yoksa belirtilir", () => {
      const md = renderSummary([arm("t/x", "v2", dortVaka(0.9), { ref: "v1" })]);
      expect(karar(md, "t/x", "v2")).toBe("referans v1 yok");
    });
    it("referans satırdaki ref'ten okunur (v2@r2 → kayıtlı v1)", () => {
      const md = renderSummary([arm("t/x", "v1", dortVaka(0.7)), arm("t/x", "v2@r2", dortVaka(0.5), { ref: "v1" })]);
      expect(karar(md, "t/x", "v2@r2")).toBe("HAIKU ADAYI");
    });
  });

  describe("referans: satırdaki ref esas", () => {
    it("v1@r2: ref satırda baseline@r2 ise token ve karar ona göre; ref yoksa dizin çıkarımı (baseline@r2 varsa o)", () => {
      const kol = (extra: Partial<ArmRow>) => renderSummary([
        arm("t/x", "baseline", dortVaka(0.5, {}, 1000)),
        arm("t/x", "baseline@r2", dortVaka(0.5, {}, 2000)),
        arm("t/x", "v1@r2", dortVaka(0.7, {}, 2200), extra),
      ]);
      expect(sat(kol({ ref: "baseline@r2" }), "t/x", "v1@r2")).toContain("+10%");
      expect(karar(kol({ ref: "baseline@r2" }), "t/x", "v1@r2")).toBe("KABUL ADAYI");
      expect(sat(kol({}), "t/x", "v1@r2")).toContain("+10%"); // çıkarım: baseline@r2 var
      // Satırda ref = baseline (eski tabana karşı koşmuş): bütçe 2200/1000, çıkarım baseline@r2 olsa da satır esastır
      const eski = kol({ ref: "baseline", refNote: "ref uyumsuz: satır baseline, dizin baseline@r2" });
      expect(sat(eski, "t/x", "v1@r2")).toContain("+120%");
      expect(karar(eski, "t/x", "v1@r2")).toBe("win tamam; bütçe +120% · ref uyumsuz: satır baseline, dizin baseline@r2");
    });
    it("yalnız ETİKET farkı (v1@r2 ↔ baseline) not düşer, etiketi engellemez; satırlar farklı ref'lerle koşmuşsa etiket verilmez", () => {
      const md = renderSummary([arm("t/x", "baseline", dortVaka(0.5)), arm("t/x", "v1@r2", dortVaka(0.9), { ref: "baseline", refNote: "ref uyumsuz: satır baseline, dizin baseline@r2" })]);
      expect(karar(md, "t/x", "v1@r2")).toBe("KABUL ADAYI · ref uyumsuz: satır baseline, dizin baseline@r2");
      const karisik = renderSummary([arm("t/x", "baseline", dortVaka(0.5)), arm("t/x", "v1", dortVaka(0.9), { ref: "baseline", refMixed: true })]);
      expect(karar(karisik, "t/x", "v1")).toContain("ref karışık");
      expect(karar(karisik, "t/x", "v1")).not.toContain("KABUL ADAYI");
    });
    it("referansın TÜRÜ yanlışsa etiket yok: v2 baseline'a karşı koşmuşsa HAIKU ADAYI verilmez", () => {
      const md = renderSummary([
        arm("t/x", "baseline", dortVaka(0.5)),
        arm("t/x", "v1", dortVaka(0.7), { ref: "baseline" }),
        arm("t/x", "v2", dortVaka(0.9), { ref: "baseline", refNote: "ref uyumsuz: satır baseline, dizin v1" }),
      ]);
      expect(karar(md, "t/x", "v2")).toBe("referans v1 değil (baseline) — EVAL_REF=v1 ile yeniden koş · ref uyumsuz: satır baseline, dizin v1");
      const etiketli = renderSummary([arm("t/x", "baseline@r2", dortVaka(0.5)), arm("t/x", "v1@r2", dortVaka(0.7)), arm("t/x", "v2@r2", dortVaka(0.9), { ref: "baseline@r2" })]);
      expect(karar(etiketli, "t/x", "v2@r2")).toBe("referans v1 değil (baseline@r2) — EVAL_REF=v1@r2 ile yeniden koş");
    });
    it("referansın TÜRÜ yanlışsa etiket yok: v1 başka bir v1'e (ya da v2'ye) karşı ölçülmüşse KABUL ADAYI verilmez; tabana göre —", () => {
      const md = renderSummary([
        arm("t/x", "baseline", dortVaka(0.5)),
        arm("t/x", "v1", dortVaka(0.7), { ref: "baseline" }),
        arm("t/x", "v1@r2", dortVaka(0.9), { ref: "v1" }),
      ]);
      expect(karar(md, "t/x", "v1@r2")).toBe("referans baseline değil (v1) — EVAL_REF=baseline@r2 ile yeniden koş");
      expect(sat(md, "t/x", "v1@r2")).toContain("| 1000~ | — |");
      expect(karar(md, "t/x", "v1")).toBe("KABUL ADAYI"); // doğru türde referans etkilenmez
    });
    it("doğru türde ama farklı etiketli referans (v2@r2 → v1) yalnız not alır, etiketi engellemez", () => {
      const md = renderSummary([arm("t/x", "v1", dortVaka(0.7)), arm("t/x", "v2@r2", dortVaka(0.5), { ref: "v1", refNote: "ref uyumsuz: satır v1, dizin v1@r2" })]);
      expect(karar(md, "t/x", "v2@r2")).toBe("HAIKU ADAYI · ref uyumsuz: satır v1, dizin v1@r2");
    });
  });

  describe("eksik tekrar (vaka başına satır sayısı eşit değil)", () => {
    // 4 vaka × 2 tekrar, yalnız b'nin rep1'i yok
    const ikiTekrar = (win: number, atla: string[] = [], hard: Record<string, string[]> = {}, tekrar = 2) =>
      ["a", "b", "c", "d"].flatMap((id) =>
        Array.from({ length: tekrar }, (_, rep) => rep).filter((rep) => !atla.includes(`${id}:${rep}`)).map((rep) => ({ ...row(id, win, hard[id] ?? []), rep })),
      );
    it("adayda bir vakanın bir tekrarı yoksa KABUL/HAIKU etiketi yok; kapsam sütunu vaka düzeyinde 4/4 kalır; nedeni etiketi ve dipnotu söyler", () => {
      const eksikli = ikiTekrar(0.9, ["b:1"]);
      const md = renderSummary([arm("t/x", "baseline", ikiTekrar(0.5)), arm("t/x", "v1", eksikli, { whyMissingReps: { "b rep1": "hata: tool_parse" } })]);
      expect(sat(md, "t/x", "v1")).toContain("| 4×1–2 | 4/4 |");
      expect(karar(md, "t/x", "v1")).toBe("eksik tekrar b rep1 (hata: tool_parse)");
      expect(md).toContain("- t/x v1: eksik tekrar b rep1 (hata: tool_parse)");
      const v2 = renderSummary([arm("t/x", "v1", ikiTekrar(0.7)), arm("t/x", "v2", ikiTekrar(0.5, ["b:1"]), { ref: "v1" })]);
      expect(karar(v2, "t/x", "v2")).toBe("eksik tekrar b rep1 (koşulmadı)");
      expect(v2).not.toMatch(/\| HAIKU ADAYI/);
    });
    it("tüm tekrarlar tamamsa etiket verilir; birden çok eksik kısaltılır", () => {
      const md = renderSummary([arm("t/x", "baseline", ikiTekrar(0.5)), arm("t/x", "v1", ikiTekrar(0.9))]);
      expect(karar(md, "t/x", "v1")).toBe("KABUL ADAYI");
      const cok = renderSummary([arm("t/x", "baseline", ikiTekrar(0.5, [], {}, 3)), arm("t/x", "v1", ikiTekrar(0.9, ["a:1", "a:2", "b:1", "b:2"], {}, 3))]);
      expect(karar(cok, "t/x", "v1")).toBe("eksik tekrar a rep1 (koşulmadı), a rep2 (koşulmadı), b rep1 (koşulmadı), +1");
      // Tüm vakalar aynı (daha az) sayıda tekrar koşmuşsa eşitsizlik yok: tekrar sayısı farkı eksik tekrar değildir
      const tekduze = renderSummary([arm("t/x", "baseline", ikiTekrar(0.5)), arm("t/x", "v1", ikiTekrar(0.9, ["a:1", "b:1", "c:1", "d:1"]))]);
      expect(karar(tekduze, "t/x", "v1")).toBe("KABUL ADAYI");
    });
    it("taban/referansta eksik tekrar varsa 'taban eksik tekrar'; baseline kolunun kendisi de uyarılır", () => {
      const md = renderSummary([arm("t/x", "baseline", ikiTekrar(0.5, ["c:0"])), arm("t/x", "v1", ikiTekrar(0.9))]);
      expect(karar(md, "t/x", "baseline")).toBe("eksik tekrar c rep0 (koşulmadı)");
      expect(karar(md, "t/x", "v1")).toBe("taban eksik tekrar c rep0 (koşulmadı)");
      const v2 = renderSummary([arm("t/x", "v1", ikiTekrar(0.7, ["d:1"])), arm("t/x", "v2", ikiTekrar(0.5), { ref: "v1" })]);
      expect(karar(v2, "t/x", "v2")).toBe("taban eksik tekrar d rep1 (koşulmadı)");
    });
    it("beklenen küme dışındaki eski vakanın eksik tekrarı sayılmaz", () => {
      const rows = [...ikiTekrar(0.9), { ...row("eski", 0.9), rep: 0 }];
      const md = renderSummary([arm("t/x", "baseline", ikiTekrar(0.5), { expected: ["a", "b", "c", "d"] }), arm("t/x", "v1", rows, { expected: ["a", "b", "c", "d"] })]);
      expect(karar(md, "t/x", "v1")).toBe("KABUL ADAYI");
    });
  });

  describe("beklenen küme dışı (eski) vakalar karara girmez", () => {
    it("yeniden adlandırılan vakanın eski kimliği (d) tabanda artık dururken karar yalnız beklenen vakalarla verilir", () => {
      const beklenen = ["a", "b", "c", "d2"];
      const taban = [...["a", "b", "c", "d2"].map((id) => row(id, 0.5)), row("d", 0.5, ["rumuz_sizintisi"], 9000)];
      const aday = [...["a", "b", "c", "d2"].map((id) => row(id, 0.9)), row("d", 0, ["rumuz_sizintisi"], 9000)]; // eski satır adayda da duruyor
      const md = renderSummary([arm("t/x", "baseline", taban, { expected: beklenen }), arm("t/x", "v1", aday, { expected: beklenen })]);
      expect(sat(md, "t/x", "v1")).toContain("| 5×1 | 4/4 |"); // sütunlar kolun kendi satırları, kapsam beklenen kümeye göre
      expect(karar(md, "t/x", "v1")).toBe("KABUL ADAYI");
    });
  });

  describe("token karşılaştırması", () => {
    it("taban token yoksa '—' ve 'taban token yok' (0~ değil); KABUL ADAYI verilmez", () => {
      const taban = dortVaka(0.5).map((r) => ({ ...r, out_tokens: null }));
      const md = renderSummary([arm("t/x", "baseline", taban), arm("t/x", "v1", dortVaka(0.9))]);
      expect(sat(md, "t/x", "baseline")).toContain("| — | — | 0 |");
      expect(sat(md, "t/x", "baseline")).not.toContain("0~");
      expect(karar(md, "t/x", "v1")).toBe("win tamam; taban token yok");
      expect(sat(md, "t/x", "v1")).toContain("| 1000~ | — |");
    });
    it("tahmini ile gerçek token kıyaslanmaz: hücre 'karşılaştırılamaz (~/gerçek)', bütçe sorunu etikette", () => {
      const md = renderSummary([
        arm("t/x", "baseline", dortVaka(0.5, {}, 1000, { usage_estimated: false })),
        arm("t/x", "v1", dortVaka(0.9, {}, 1000)),
      ]);
      expect(sat(md, "t/x", "v1")).toContain("| 1000~ | karşılaştırılamaz (~/gerçek) |");
      expect(karar(md, "t/x", "v1")).toBe("win tamam; bütçe karşılaştırılamaz (~/gerçek)");
    });
    it("tahmini ve gerçek karışık kol '~?' ile işaretlenir ve kıyaslanmaz", () => {
      const karisik = [...dortVaka(0.9).slice(0, 2), ...dortVaka(0.9, {}, 1000, { usage_estimated: false }).slice(2)];
      const md = renderSummary([arm("t/x", "baseline", dortVaka(0.5)), arm("t/x", "v1", karisik)]);
      expect(sat(md, "t/x", "v1")).toContain("1000~?");
      expect(karar(md, "t/x", "v1")).toBe("win tamam; bütçe karşılaştırılamaz (~/gerçek)");
    });
    it("gerçek token iki tarafta da varsa '~' yok ve kıyas yapılır", () => {
      const md = renderSummary([
        arm("t/x", "baseline", dortVaka(0.5, {}, 1000, { usage_estimated: false })),
        arm("t/x", "v1", dortVaka(0.9, {}, 1100, { usage_estimated: false })),
      ]);
      expect(sat(md, "t/x", "v1")).toContain("| 1100 | +10% |");
      expect(karar(md, "t/x", "v1")).toBe("KABUL ADAYI");
    });
  });

  describe("taban yalnız referans dosyası (artikülasyon)", () => {
    it("v1: yalnız win; 'taban sert hata/token bilinmiyor'; KABUL ADAYI yok", () => {
      const md = renderSummary([arm("studio/articulation", "v1", dortVaka(0.9), { ref: "baseline", refOnly: true })]);
      expect(karar(md, "studio/articulation", "v1")).toBe("win tamam; taban sert hata/token bilinmiyor");
      expect(sat(md, "studio/articulation", "v1")).toContain("| 1000~ | — |");
      const dusuk = renderSummary([arm("studio/articulation", "v1", dortVaka(0.3), { ref: "baseline", refOnly: true })]);
      expect(karar(dusuk, "studio/articulation", "v1")).toBe("win yetersiz; taban sert hata/token bilinmiyor");
    });
    it("adayda rumuz_sizintisi varsa taban bilinmese de söylenir", () => {
      const md = renderSummary([arm("studio/articulation", "v1", dortVaka(0.9, { a: ["rumuz_sizintisi"] }), { ref: "baseline", refOnly: true })]);
      expect(karar(md, "studio/articulation", "v1")).toBe("win tamam; sert hata: rumuz_sizintisi 1/4 (her zaman engel); taban sert hata/token bilinmiyor");
    });
    it("eksik kapsam yine önce gelir", () => {
      const md = renderSummary([arm("studio/articulation", "v1", dortVaka(0.9).slice(0, 2), { ref: "baseline", refOnly: true, expected: ["a", "b", "c", "d"] })]);
      expect(karar(md, "studio/articulation", "v1")).toBe("eksik kapsam 2/4");
    });
  });

  it("etiketli kollar: v1@r2 kendi turunun tabanına (baseline@r2), yoksa baseline'a göre; v2@r2 → v1@r2", () => {
    const md = renderSummary([
      arm("t/x", "baseline", dortVaka(0.5, {}, 1000)),
      arm("t/x", "baseline@r2", dortVaka(0.5, {}, 2000)),
      arm("t/x", "v1@r2", dortVaka(0.7, {}, 2200)),
      arm("t/x", "v1@r3", dortVaka(0.7, {}, 1100)),
      arm("t/x", "v2@r2", dortVaka(0.5, {}, 900), { ref: "v1@r2" }),
    ]);
    expect(sat(md, "t/x", "v1@r2")).toContain("+10%");
    expect(karar(md, "t/x", "v1@r2")).toBe("KABUL ADAYI");
    expect(sat(md, "t/x", "v1@r3")).toContain("+10%");
    expect(karar(md, "t/x", "v1@r3")).toBe("KABUL ADAYI");
    expect(karar(md, "t/x", "v2@r2")).toBe("HAIKU ADAYI");
    expect(sat(md, "t/x", "baseline@r2")).toContain("+100%");
  });
  it("araçlar ayrı gruplanır, sıra korunur", () => {
    const md = renderSummary([
      arm("a/x", "baseline", dortVaka(0.5)),
      arm("b/y", "baseline", dortVaka(0.5)),
      arm("a/x", "v1", dortVaka(0.7)),
    ]);
    const sirasi = md.split("\n").filter((l) => /^\| [ab]\//.test(l)).map((l) => l.split("|").slice(1, 3).map((x) => x.trim()).join(":"));
    expect(sirasi).toEqual(["a/x:baseline", "a/x:v1", "b/y:baseline"]);
  });

  describe("vaka ayrıntısı, granülerlik, dipnotlar", () => {
    const md = renderSummary([
      arm("t/x", "baseline", dortVaka(0.5, { a: ["dil_kurali"] })),
      arm("t/x", "v1", [
        row("a", 0.75, [], 1000, 1, { explanation: { win: "Aday daha somut.\nİkinci satır." } }),
        row("b", 0.25, ["dil_kurali", "rumuz_yok"], 1000, 1, { explanation: { win: "Aday jenerik | boş." } }),
        row("c", 0.5, [], 1000, 1, { explanation: { win: "x".repeat(300) } }),
        row("d", 0.5),
      ]),
    ]);
    it("her aday kol için vaka tablosu: vaka, win, sert hata nedenleri, gerekçenin ilk satırı (| kaçırılır, uzun gerekçe kırpılır); baseline için yok", () => {
      expect(md).toContain("#### t/x · v1");
      expect(md).not.toContain("#### t/x · baseline");
      expect(md).toContain("| a | 1 | 0.75 | — | Aday daha somut. |");
      expect(md).toContain("| b | 1 | 0.25 | dil_kurali, rumuz_yok | Aday jenerik \\| boş. |");
      expect(md).toContain(`| c | 1 | 0.50 | — | ${"x".repeat(199)}… |`);
      expect(md).toContain("| d | 1 | 0.50 | — | — |");
      expect(md).not.toContain("İkinci satır");
    });
    it("granülerlik notu: 4 vaka × 1 tekrar × 1 sıra → 0,125 adım; ≥0,65 pratikte ≥0,75", () => {
      expect(md).toContain("4 vaka × 1 tekrar × 1 sıra: win 0,125 adımlarla değişir; ≥0,65 pratikte ≥0,75.");
    });
    it("iki hakem sırası ve v2 varken adım ve eşikler buna göre", () => {
      const m = renderSummary([
        arm("t/x", "v1", dortVaka(0.7, {}, 1000, { meta: { judge_orders: 2 } })),
        arm("t/x", "v2", dortVaka(0.5, {}, 1000, { meta: { judge_orders: 2 } }), { ref: "v1" }),
      ]);
      expect(m).toContain("4 vaka × 1 tekrar × 2 sıra: win 0,063 adımlarla değişir; ≥0,65 pratikte ≥0,688, ≥0,4 pratikte ≥0,438.");
    });
    it("dipnotlar: tahmini token, vaka bazlı toplama, kör oy dördüncü koşul tabloda yok", () => {
      expect(md).toContain("`~` = alt-ajan tahmini token");
      expect(md).toContain("Vaka bazlı toplama");
      expect(md).toContain("Kör oy (spec B6 dördüncü koşul");
    });
    it("yalnız baseline varsa ayrıntı bölümü ve granülerlik yok", () => {
      const m = renderSummary([arm("t/x", "baseline", dortVaka(0.5))]);
      expect(m).not.toContain("Vaka ayrıntısı");
      expect(m).not.toContain("adımlarla değişir");
    });
  });
});

describe("refOf / baseOf", () => {
  it("v2 → v1 (etiket korunur); diğer kolların referansı yok", () => {
    expect(refOf("v2")).toBe("v1");
    expect(refOf("v2@r2")).toBe("v1@r2");
    expect(refOf("v1")).toBeUndefined();
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
  const dosya = (flow: string, rel: string, icerik: string) => {
    mkdirSync(path.dirname(path.join(flow, rel)), { recursive: true });
    writeFileSync(path.join(flow, rel), icerik);
  };
  const yok = () => null;

  it("kolları bulur; controls (sessiz), geçersiz kol adı (bildirilir), boş ve sonuçsuz kollar ve dosyalar atlanır; sıra alfabetik", () => {
    const flow = tempFlow("ozet-");
    yaz(flow, "studio/cards/baseline", [row("a", 0.5, ["dil_kurali"])]);
    yaz(flow, "studio/cards/v1", [row("a", 0.7)]);
    yaz(flow, "studio/cards/v1@r2", [row("a", 0.7)]);
    yaz(flow, "studio/cards/v2", [row("a", 0.5)]);
    yaz(flow, "studio/cards/v2@r2", [row("a", 0.5)]);
    yaz(flow, "studio/cards/controls", [row("a", 1)]);
    yaz(flow, "studio/cards/controls@r2", [row("a", 1)]);
    yaz(flow, "studio/cards/v3", [row("a", 1)]); // geçersiz kol adı
    yaz(flow, "studio/cards/yedek kopya", [row("a", 1)]); // geçersiz kol adı
    yaz(flow, "studio/cards/v1@bos", []);
    yaz(flow, "studio/cards/v1@boş etiket", [row("a", 1)]); // etiket karakter kümesi dışı
    mkdirSync(path.join(flow, "studio/cards/v1@sonucsuz"), { recursive: true });
    dosya(flow, "studio/cards/ipucu.txt", "dizin değil");
    dosya(flow, "ozet.md", "eski özet");
    yaz(flow, "atolye/bep/baseline", [row("a", 0.5)]);
    mkdirSync(path.join(flow, "diger/x/baseline"), { recursive: true });
    const atlanan: string[] = [];
    const rows = collectArms(flow, { casesFor: yok, onSkip: (p) => atlanan.push(p) });
    expect(rows.map((r) => `${r.tool}|${r.arm}|${r.ref ?? ""}`)).toEqual([
      "studio/cards|baseline|",
      "studio/cards|v1|baseline",
      "studio/cards|v1@r2|baseline",
      "studio/cards|v2|v1",
      "studio/cards|v2@r2|v1@r2",
      "atolye/bep|baseline|",
    ]);
    expect(atlanan.sort()).toEqual(["studio/cards/v1@boş etiket", "studio/cards/v3", "studio/cards/yedek kopya"]);
    expect(rows[0]!.s).toMatchObject({ n: 1, hard: 1, hardReasons: { dil_kurali: 1 } });
  });
  it("akış dizini yoksa boş liste", () => {
    expect(collectArms(path.join(tempFlow("ozet-yok-"), "yok"), { casesFor: yok })).toEqual([]);
  });

  describe("ref: satırdaki `ref` esas, dizin çıkarımı yedek", () => {
    it("satır ref'i kullanılır; dizin çıkarımıyla farklıysa not düşer; uyumluysa not yok", () => {
      const flow = tempFlow("ozet-ref-");
      yaz(flow, "studio/cards/baseline", [row("a", 0.5)]);
      yaz(flow, "studio/cards/baseline@r2", [row("a", 0.5)]);
      yaz(flow, "studio/cards/v1", [row("a", 0.7, [], 1000, 1, { ref: "baseline" })]);
      yaz(flow, "studio/cards/v1@r2", [row("a", 0.7, [], 1000, 1, { ref: "baseline" })]); // r2 turunda EVAL_REF verilmemiş
      yaz(flow, "studio/cards/v2@r2", [row("a", 0.5, [], 1000, 1, { ref: "v1@r2" })]);
      const r = new Map(collectArms(flow, { casesFor: yok }).map((x) => [x.arm, x]));
      expect(r.get("v1")).toMatchObject({ ref: "baseline" });
      expect(r.get("v1")!.refNote).toBeUndefined();
      expect(r.get("v1@r2")).toMatchObject({ ref: "baseline", refNote: "ref uyumsuz: satır baseline, dizin baseline@r2" });
      expect(r.get("v2@r2")).toMatchObject({ ref: "v1@r2" });
      expect(r.get("v2@r2")!.refNote).toBeUndefined();
    });
    it("satırda ref yoksa dizinden çıkarılır (eski sonuçlar); baseline kolunda ref yok", () => {
      const flow = tempFlow("ozet-ref-eski-");
      yaz(flow, "studio/cards/baseline", [row("a", 0.5, [], 1000, 1, { ref: "baseline" })]);
      yaz(flow, "studio/cards/v1@r2", [row("a", 0.7)]);
      yaz(flow, "studio/cards/baseline@r2", [row("a", 0.5)]);
      yaz(flow, "studio/cards/v2", [row("a", 0.5)]);
      const r = new Map(collectArms(flow, { casesFor: yok }).map((x) => [x.arm, x]));
      expect(r.get("baseline")!.ref).toBeUndefined();
      expect(r.get("v1@r2")).toMatchObject({ ref: "baseline@r2" });
      expect(r.get("v1@r2")!.refNote).toBeUndefined();
      expect(r.get("v2")).toMatchObject({ ref: "v1" });
    });
    it("satırlar farklı ref'lerle koşmuşsa refMixed", () => {
      const flow = tempFlow("ozet-ref-karisik-");
      yaz(flow, "studio/cards/baseline", [row("a", 0.5)]);
      yaz(flow, "studio/cards/v1", [row("a", 0.7, [], 1000, 1, { ref: "baseline" }), row("b", 0.7, [], 1000, 1, { ref: "baseline@r2" })]);
      const v1 = collectArms(flow, { casesFor: yok }).find((x) => x.arm === "v1")!;
      expect(v1.refMixed).toBe(true);
    });
  });

  describe("kapsam: beklenen küme = cases.json ∪ referans kolun vakaları (sonuç satırı ve ref/ dosyaları)", () => {
    it("eksik vakaların nedeni pending.json ve errors.jsonl'den; yoksa koşulmadı", () => {
      const flow = tempFlow("ozet-kapsam-");
      yaz(flow, "studio/cards/baseline", ["a", "b", "c", "d"].map((id) => row(id, 0.5)));
      yaz(flow, "studio/cards/v1", [row("a", 0.7, [], 1000, 1, { ref: "baseline" })]);
      dosya(flow, "studio/cards/v1/pending.json", JSON.stringify([{ key: "b_rep0", role: "gen" }, { key: "b_rep1", role: "gen" }, { key: "c_rep0.judge-ab", role: "judge" }]));
      dosya(flow, "studio/cards/v1/errors.jsonl", JSON.stringify({ prompt_id: "d", rep: 0, failure_class: "tool_parse" }) + "\n" + JSON.stringify({ prompt_id: "a", rep: 1, failure_class: "timeout" }) + "\n");
      const v1 = collectArms(flow, { casesFor: yok }).find((x) => x.arm === "v1")!;
      expect(v1.expected).toEqual(["a", "b", "c", "d"]);
      expect(v1.whyMissing).toEqual({ b: "bekliyor (üretim)", c: "bekliyor (hakem)", d: "hata: tool_parse" }); // a'nın eski hatası: sonuç var → eksik değil
      const md = renderSummary(collectArms(flow, { casesFor: yok }));
      expect(karar(md, "studio/cards", "v1")).toBe("eksik kapsam 1/4");
      expect(md).toContain("- studio/cards v1: b (bekliyor (üretim)), c (bekliyor (hakem)), d (hata: tool_parse)");
    });
    it("koşulmayan vaka: 'koşulmadı'; bozuk pending.json çökmez", () => {
      const flow = tempFlow("ozet-kapsam2-");
      yaz(flow, "studio/cards/baseline", ["a", "b"].map((id) => row(id, 0.5)));
      yaz(flow, "studio/cards/v1", [row("a", 0.7)]);
      dosya(flow, "studio/cards/v1/pending.json", "{bozuk");
      const v1 = collectArms(flow, { casesFor: yok }).find((x) => x.arm === "v1")!;
      expect(v1.whyMissing).toEqual({ b: "koşulmadı" });
    });
    it("kayıtlı araçta beklenen küme YALNIZ cases.json: taban sonuçlarındaki eski kimlik (yeniden adlandırılan vaka) kapsamı engellemez", () => {
      const flow = tempFlow("ozet-yeniden-ad-");
      // hw-02 → hw-02b: cases.json artık hw-02b'yi söyler; taban ikisini de koşmuş (eski satır duruyor), aday yalnız güncel vakaları
      yaz(flow, "studio/cards/baseline", ["a", "b", "c", "d", "d2"].map((id) => row(id, 0.5, [], 1000, 1, { ref: "baseline" })));
      yaz(flow, "studio/cards/v1", ["a", "b", "c", "d2"].map((id) => row(id, 0.9, [], 1000, 1, { ref: "baseline" })));
      const rows = collectArms(flow, { casesFor: () => ["a", "b", "c", "d2"] });
      expect(rows.find((x) => x.arm === "v1")!.expected).toEqual(["a", "b", "c", "d2"]);
      expect(rows.find((x) => x.arm === "baseline")!.expected).toEqual(["a", "b", "c", "d2"]);
      const md = renderSummary(rows);
      expect(sat(md, "studio/cards", "v1")).toContain("| 4×1 | 4/4 |");
      expect(karar(md, "studio/cards", "v1")).toBe("KABUL ADAYI");
    });
    it("kayıtsız araçta (cases.json çözülmez) referans kolun vakaları yedek beklenen küme", () => {
      const flow = tempFlow("ozet-yedek-");
      yaz(flow, "studio/olmayan-arac/baseline", ["a", "b"].map((id) => row(id, 0.5)));
      yaz(flow, "studio/olmayan-arac/v1", [row("a", 0.9)]);
      const v1 = collectArms(flow).find((x) => x.arm === "v1")!;
      expect(v1.expected).toEqual(["a", "b"]);
      expect(v1.whyMissing).toEqual({ b: "koşulmadı" });
    });
    it("eksik tekrar: bir vakanın bir tekrarı errors.jsonl'de → aday etiketi yok; neden tekrar bazlı (pending/errors, başka tekrarın kaydı karışmaz)", () => {
      const flow = tempFlow("ozet-tekrar-");
      const iki = (id: string, reps: number[], win: number, ref?: string) => reps.map((rep) => ({ ...row(id, win, [], 1000, 1, ref ? { ref } : {}), rep }));
      yaz(flow, "studio/cards/baseline", ["a", "b"].flatMap((id) => iki(id, [0, 1], 0.5, "baseline")));
      yaz(flow, "studio/cards/v1", [...iki("a", [0, 1], 0.9, "baseline"), ...iki("b", [0], 0.9, "baseline")]);
      dosya(flow, "studio/cards/v1/errors.jsonl", JSON.stringify({ prompt_id: "b", rep: 1, failure_class: "tool_parse" }) + "\n" + JSON.stringify({ prompt_id: "a", rep: 0, failure_class: "timeout" }) + "\n");
      yaz(flow, "studio/cards/v2", [...iki("a", [0, 1], 0.5, "v1"), ...iki("b", [0], 0.5, "v1")]);
      dosya(flow, "studio/cards/v2/pending.json", JSON.stringify([{ key: "b_rep1", role: "gen" }, { key: "a_rep1.judge-ab", role: "judge" }]));
      const rows = collectArms(flow, { casesFor: yok });
      const v1 = rows.find((x) => x.arm === "v1")!;
      expect(v1.whyMissingReps).toEqual({ "b rep1": "hata: tool_parse" }); // a:0'ın eski hatası: o tekrar tamam → eksik değil
      expect(v1.whyMissing).toBeUndefined(); // vaka düzeyinde kapsam tam
      const md = renderSummary(rows);
      expect(karar(md, "studio/cards", "v1")).toBe("eksik tekrar b rep1 (hata: tool_parse)");
      expect(karar(md, "studio/cards", "v2")).toBe("eksik tekrar b rep1 (bekliyor (üretim))");
      expect(md).not.toMatch(/\| (KABUL|HAIKU) ADAYI/);
    });
    it("cases.json (casesFor) beklenen kümeye katılır: taban da eksikse taban kapsamı düşer", () => {
      const flow = tempFlow("ozet-kapsam3-");
      yaz(flow, "studio/cards/baseline", ["a", "b"].map((id) => row(id, 0.5)));
      yaz(flow, "studio/cards/v1", ["a", "b"].map((id) => row(id, 0.9, [], 1000, 1, { ref: "baseline" })));
      const rows = collectArms(flow, { casesFor: () => ["a", "b", "c", "d"] });
      expect(rows.find((x) => x.arm === "baseline")!.expected).toEqual(["a", "b", "c", "d"]);
      expect(rows.find((x) => x.arm === "v1")!.expected).toEqual(["a", "b", "c", "d"]);
      const md = renderSummary(rows);
      expect(sat(md, "studio/cards", "baseline")).toContain("| 2×1 | 2/4 |");
      expect(karar(md, "studio/cards", "baseline")).toBe("eksik kapsam 2/4");
      expect(karar(md, "studio/cards", "v1")).toBe("eksik kapsam 2/4");
    });
    it("varsayılan: kayıt defterindeki araçta cases.json okunur (studio/social-story: ss-01..04)", () => {
      const flow = tempFlow("ozet-kapsam4-");
      yaz(flow, "studio/social-story/baseline", [row("ss-01", 0.5)]);
      const [b] = collectArms(flow);
      expect(b!.expected).toEqual(["ss-01", "ss-02", "ss-03", "ss-04"]);
      expect(b!.whyMissing).toEqual({ "ss-02": "koşulmadı", "ss-03": "koşulmadı", "ss-04": "koşulmadı" });
    });
    it("kayıt defterinde olmayan araç: beklenen küme yalnız taban/referanstan", () => {
      const flow = tempFlow("ozet-kapsam5-");
      yaz(flow, "studio/olmayan-arac/baseline", [row("a", 0.5)]);
      expect(collectArms(flow)[0]!.expected).toEqual(["a"]);
    });
    it("referans yalnız ref/ dosyası olarak varsa (artikülasyon) refOnly ve beklenen küme dosya adlarından", () => {
      const flow = tempFlow("ozet-refonly-");
      dosya(flow, "studio/articulation/baseline/ref/art-01", "{}");
      dosya(flow, "studio/articulation/baseline/ref/art-02", "{}");
      dosya(flow, "studio/articulation/baseline/source.json", "{}");
      yaz(flow, "studio/articulation/v1", [row("art-01", 0.8, [], 1000, 1, { ref: "baseline" })]);
      const [v1] = collectArms(flow, { casesFor: yok });
      expect(v1).toMatchObject({ arm: "v1", ref: "baseline", refOnly: true });
      expect(v1!.expected).toEqual(["art-01", "art-02"]);
      const md = renderSummary([v1!]);
      expect(karar(md, "studio/articulation", "v1")).toBe("eksik kapsam 1/2");
    });
    it("uçtan uca: sonuçları tam v1 + taban sonuçları → KABUL ADAYI; vaka ayrıntısı yazılır", () => {
      const flow = tempFlow("ozet-ucuca-");
      yaz(flow, "studio/cards/baseline", dortVaka(0.5, { a: ["dil_kurali"] }, 1000, { ref: "baseline" }));
      yaz(flow, "studio/cards/v1", dortVaka(0.8, {}, 1100, { ref: "baseline", explanation: { win: "Aday daha somut." } }));
      const md = renderSummary(collectArms(flow, { casesFor: yok }));
      expect(karar(md, "studio/cards", "v1")).toBe("KABUL ADAYI");
      expect(md).toContain("| a | 1 | 0.80 | — | Aday daha somut. |");
    });
  });
});
