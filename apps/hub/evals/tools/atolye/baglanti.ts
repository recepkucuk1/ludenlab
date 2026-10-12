// apps/hub/evals/tools/atolye/baglanti.ts
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { TASLAK_NOTU } from "@atolye/lib/bep";
import { describe, expect, it } from "vitest";
import { HarnessError, type AtolyeFixture, type CaseDef, type ToolAdapter } from "../../lib/core";
import { realFirstName, resolveFixture } from "../../lib/fixtures";
import { metinler, yasakKalip } from "../../lib/sharedChecks";
import { tempFlow } from "../../lib/testFlow";

/* Atölye adaptörlerinin "gerçek rota" bağlantı testlerinin ortak yardımcıları (geçici akış dizini `lib/testFlow`dan; selftest dosyaları kullanır; `*.eval.ts`
   olmadığı için vitest bunu test dosyası olarak toplamaz). Alt-ajan düzeneği: istek `pending.json`'a yazılır, yanıt
   `responseTxt`'ten okunur; hiçbir model çağrılmaz. */

export interface Bekleyen {
  key: string;
  requestMd: string;
  responseTxt: string;
}

export const bekleyenler = (p: string) => JSON.parse(readFileSync(p, "utf8")) as Bekleyen[];
export const sonuclar = (p: string) => readFileSync(p, "utf8").trim().split("\n").map((l) => JSON.parse(l) as Record<string, unknown>);

export async function kos(tool: string, flowDir: string, cases: string[]) {
  const { runEval } = await import("../../lib/runner");
  return runEval({ tool, variant: "baseline", backend: "subagent", flowDir, cases, timeoutS: 30 });
}

/** Vakanın üretim isteği (md). */
export function istek(rows: Bekleyen[], vakaId: string): { md: string; row: Bekleyen } {
  const row = rows.find((r) => r.key.startsWith(`${vakaId}_`));
  if (!row) throw new Error(`${vakaId} için bekleyen istek yok: ${rows.map((r) => r.key).join(", ")}`);
  return { md: readFileSync(row.requestMd, "utf8"), row };
}

/** İstek md'sindeki öğrenci rumuzu ("- Öğrenci: X"). */
export const rumuzOku = (md: string) => /- Öğrenci: ([^,\n]+)/.exec(md)?.[1]?.trim();

/* ── Ortak adaptör öz-test paketi ── */

export interface AtolyeSuiteOpts<Body> {
  /** Beklenen vaka kimlikleri (cases.json sırasıyla). */
  idler: string[];
  /** Dört ortak ölçütten SONRAKİ araç ölçütlerinin anahtarları. */
  olcutler: string[];
  /** Tam, kurallara uygun örnek çıktı (6+ bölüm, taslak notu sonda); `ad` içinde geçer (rumuz/gerçek ad testleri için). */
  ornek(ad?: string): string;
  /** `ornek()` için fabrikadan beklenen puanlar (`toMatchObject`; `talimat` dahil). */
  iyiPuanlar: Record<string, number>;
  /** Hakemin okuduğu istek satırlarından ürün isteminde AYNEN geçmesi gerekenlerin kalıbı (ör. `/^- (Alan|Süre): /`). */
  istekEtiketleri: RegExp;
  /** Ürün isteminde bulunması gereken parçalar (bölüm başlıkları: "SEANS BİLGİSİ", "İSTENEN YAPI …"). */
  istemParcalari: string[];
  /** Örnekteki `## … <bölüm>` başlıkları: tek tek silinince yapı oranı (n−1)/n olmalı (n = bölüm sayısı). Boş liste: araç bölüm başlığı istemez
      (adapter `sections: []`); yapı oranı ölçülmez (`yapi: "—"`) ve bölüm silme testleri atlanır. */
  bolumler: string[];
  /** Vaka başına ek denetim; `md` ürünün gerçek istemidir (rota + taklitten geçmiş). */
  istekEk?(md: string, c: CaseDef<Body>, f: AtolyeFixture): void;
  /** Fikstürde olup araca GİTMEMESİ gereken metinler; ürün isteminin KULLANICI bölümünde geçmemeli. */
  gitmeyen?(f: AtolyeFixture): string[];
}

/**
 * Atölye adaptörlerinin ortak öz-testi: vakalar yüklenir ve fikstürleri çözülür, fikstürsüz çağrı `harness_error`, GERÇEK rota
 * (subagent düzeneği; model çağrılmaz) tüm vakalarda şemadan geçer ve istek satırları ürün isteminde aynen bulunur ve gerçek ad yok,
 * fabrika kontrolleri (iyi örnek, taslak notu, rumuz sızıntısı, boş çıktı, bölüm eksikliği), hakem çizimi, `notSent`, jenerik aday.
 * Test dosyası İLK satırda `import "<…>/mocks.setup"` yapmalıdır (rota taklitleri). Araca özgü testler dosyada ayrıca yazılır.
 */
export function atolyeAdapterSuite<Body>(adapter: ToolAdapter<Body>, o: AtolyeSuiteOpts<Body>): void {
  const cases = JSON.parse(readFileSync(path.join(adapter.dir, "cases.json"), "utf8")) as CaseDef<Body>[];
  const fikstur = (c: CaseDef<Body>) => resolveFixture("atolye", c.student) as AtolyeFixture;
  const kisa = adapter.id.replace("atolye/", "");

  describe(`${adapter.label} — ortak paket`, () => {
    it("vakalar: beklenen kimlikler, hepsi öğrencili ve fikstürleri çözülür; kimlik/modül/ölçütler", () => {
      expect(cases.map((c) => c.id)).toEqual(o.idler);
      for (const c of cases) {
        expect(c.student, c.id).not.toBeNull();
        expect(resolveFixture("atolye", c.student)?.id, c.id).toBe(c.student);
        expect(c.purpose.trim().length, c.id).toBeGreaterThan(20);
        expect(c.tags.length, c.id).toBeGreaterThan(0);
      }
      expect(adapter.module).toBe("atolye");
      expect(adapter.criteria.map((c) => c.key).slice(4)).toEqual(o.olcutler);
    });

    it("fikstürsüz çağrı harness_error; fikstürsüz hakem görevi hata verir; araca gitmeyenler notu hakem görevinde var", async () => {
      await expect(adapter.invoke(cases[0]!.body, null)).rejects.toMatchObject({ failureClass: "harness_error" });
      expect(() => adapter.renderTask(cases[0]!, null)).toThrow(HarnessError);
      for (const c of cases) {
        const t = adapter.renderTask(c, fikstur(c));
        expect(t, c.id).toContain("Hakem notu");
        expect(t, c.id).toContain("İLETİLMEDİ");
        expect(t, c.id).toContain(`- Neyi sınıyor: ${c.purpose}`);
      }
    });

    it("gerçek rota: tüm vakalar şemadan geçer; ürün isteminde rumuzlu öğrenci satırı, gerçek ad yok, istek satırları AYNEN; araca gitmeyenler yok", async () => {
      const flow = tempFlow(`flow-${kisa}-`);
      const s = await kos(adapter.id, flow, cases.map((c) => c.id));
      expect(s).toMatchObject({ done: 0, failed: 0, pending: cases.length });
      const rows = bekleyenler(s.pendingPath);
      for (const c of cases) {
        const f = fikstur(c);
        const { md } = istek(rows, c.id);
        for (const p of o.istemParcalari) expect(md, `${c.id}: ${p}`).toContain(p);
        expect(rumuzOku(md), c.id).toBeTruthy();
        expect(md, c.id).not.toContain(realFirstName(f));
        // Etiket kayması koruması: hakemin okuduğu istek/profil satırları ürün isteminde birebir geçer.
        const satirlar = adapter.renderTask(c, f).split("\n").filter((l) => o.istekEtiketleri.test(l));
        expect(satirlar.length, c.id).toBeGreaterThanOrEqual(2);
        for (const l of satirlar) expect(md, `${c.id}: ${l}`).toContain(l);
        const kullanici = md.slice(md.indexOf("<user>"));
        for (const g of o.gitmeyen?.(f) ?? []) expect(kullanici, `${c.id}: ${g}`).not.toContain(g);
        o.istekEk?.(md, c, f);
      }
    });

    it("gerçek rota: yanıt → fabrika puanları; sert hata yok; rumuz çıktıda gerçek ada geri konur", async () => {
      const flow = tempFlow(`flow-${kisa}1-`);
      const id = cases[0]!.id;
      let s = await kos(adapter.id, flow, [id]);
      const { md, row } = istek(bekleyenler(s.pendingPath), id);
      writeFileSync(row.responseTxt, o.ornek(rumuzOku(md)!));
      s = await kos(adapter.id, flow, [id]);
      expect(s).toMatchObject({ done: 1, failed: 0, pending: 0 });
      const r = sonuclar(s.resultsPath)[0]!;
      expect(r.hard_fail).toEqual([]);
      expect(r.grade).toMatchObject({ ...o.iyiPuanlar, rumuz_yok: 1, dil_kurali: 1, yasak_kalip: 1 });
      expect(r.meta).toMatchObject({ alias_found: true });
    });

    describe("kontroller fabrika üzerinden", () => {
      const body = () => cases[0]!.body;
      const calistir = (text: string, alias: string | null = "Doruk") => adapter.checks({ body: body(), output: text, rawText: text, alias });
      it("iyi örnek: sert hata yok; araca özgü puanlar ve talimat beklenen değerde; yapı tam, taslak notu sonda, tanı cümlesi yok", () => {
        const r = calistir(o.ornek());
        expect(r.hard_fail).toEqual([]);
        expect(r.scores).toMatchObject(o.iyiPuanlar);
        expect(r.details).toMatchObject({ yapi: o.bolumler.length ? 1 : "—", taslak_sonda: 1, tani_cumlesi: 0 });
      });
      it("taslak notu yok / rumuz sızıntısı: sert hata; çıktı yok: talimat 0", () => {
        expect(calistir(o.ornek().replace(`⚠️ ${TASLAK_NOTU}`, "")).hard_fail).toContain("taslak_notu_yok");
        expect(calistir(o.ornek("Doruk")).hard_fail).toContain("rumuz_sizintisi");
        const r = adapter.checks({ body: body(), output: null, rawText: "", alias: null });
        expect(r.hard_fail).toContain("cikti_yok");
        expect(r.scores.talimat).toBe(0);
      });
      if (o.bolumler.length) {
        it.each(o.bolumler)("istenen bölüm eksik (%s): yapı (n−1)/n, talimat düşer", (bolum) => {
          const metin = o.ornek().split("\n").map((l) => (l.startsWith("## ") && l.endsWith(bolum) ? "## Zzz" : l)).join("\n");
          expect(metin).not.toBe(o.ornek());
          const r = calistir(metin);
          expect(r.details.yapi).toBeCloseTo((o.bolumler.length - 1) / o.bolumler.length);
          expect(r.scores.talimat).toBeLessThan(1);
        });
      }
    });

    it("hakem çizimi: çıktı olduğu gibi gider; boş/yok → hata metni", () => {
      expect(adapter.renderForJudge(o.ornek())).toBe(o.ornek());
      expect(adapter.renderForJudge("  ")).toContain("Çıktı üretilemedi");
      expect(adapter.renderForJudge(null)).toContain("Çıktı üretilemedi");
    });

    it("jenerik aday: ≥ 4 yasak kalıp, referanstan farklı; başlıklar ve taslak notu korunur; boş/yok girdide çökmez", () => {
      const g = adapter.genericCandidate(o.ornek()) as string;
      expect(yasakKalip(metinler(g).join("\n")).found.length).toBeGreaterThanOrEqual(4);
      expect(adapter.renderForJudge(g)).not.toBe(adapter.renderForJudge(o.ornek()));
      const satirlar = g.split("\n");
      for (const b of o.bolumler) expect(satirlar.some((l) => l.startsWith("## ") && l.endsWith(b)), b).toBe(true);
      expect(satirlar).toContain(`⚠️ ${TASLAK_NOTU}`);
      const r = adapter.checks({ body: cases[0]!.body, output: g, rawText: g, alias: null });
      expect(r.hard_fail).toEqual([]);
      expect(adapter.genericCandidate("")).toBe("");
      expect(() => adapter.genericCandidate(null)).not.toThrow();
    });
  });
}
