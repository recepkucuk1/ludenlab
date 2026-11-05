// apps/hub/evals/tools/hedef-denetimi/checks.selftest.eval.ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { mebHedef } from "@atolye/lib/meb-program";
import { BILESENLER, DURUMLAR, hedefMetniSchema } from "@/lib/hedefDenetimi";
import { KONTROL_ANAHTARLARI, adGeciyor, denetimKontrolleri, type HedefVakasi } from "./checks";

const cases = JSON.parse(readFileSync(path.join(import.meta.dirname, "cases.json"), "utf8")) as HedefVakasi[];
const HEDEF = "Resim desteğiyle iki heceli 10 sözcüğün 8'ini üç ardışık oturumda doğru okur.";
const vaka: HedefVakasi = { id: "t", etiket: "t", hedef: HEDEF, beklenen: { davranis: "var", olcut: "var", zaman: "eksik" } };
const temel = () => ({
  bilesenler: {
    davranis: { durum: "var", alinti: "doğru okur" }, olcut: { durum: "var", alinti: "10 sözcüğün 8'ini" }, kosul: { durum: "var", alinti: "Resim desteğiyle" },
    zaman: { durum: "eksik" }, taban: { durum: "eksik" },
  },
  mebUyum: null,
  sorular: [{ bilesen: "zaman", soru: "Ne zamana kadar?", ornek: "dönem sonuna kadar" }],
  ozet: "Zaman ve taban eksik.",
});
const cikti = (over: Record<string, unknown> = {}) => JSON.stringify({ ...temel(), ...over });
const bil = (over: Record<string, unknown>) => ({ ...temel().bilesenler, ...over });

describe("vaka dosyası", () => {
  it("8 vaka, kimlikler tekil, hedefler şemadan geçer, MEB kodları geçerli, beklenenler geçerli; 1 enjeksiyon + 1 adlı", () => {
    expect(cases).toHaveLength(8);
    expect(new Set(cases.map((c) => c.id)).size).toBe(8);
    for (const c of cases) {
      expect(hedefMetniSchema.safeParse(c.hedef).success, c.id).toBe(true);
      if (c.mebHedefKod) expect(mebHedef(c.mebHedefKod), c.id).toBeDefined();
      for (const [k, d] of Object.entries(c.beklenen)) {
        expect(BILESENLER as readonly string[]).toContain(k);
        expect(DURUMLAR as readonly string[]).toContain(d);
      }
    }
    expect(cases.filter((c) => c.isaret)).toHaveLength(1);
    expect(cases.filter((c) => c.ad)).toHaveLength(1);
  });
});

describe("denetimKontrolleri", () => {
  it("iyi çıktı (önsözlü): tüm puanlar 1, sert hata yok; anahtar listesi sabit", () => {
    const r = denetimKontrolleri(`Yanıt:\n${cikti()}`, HEDEF, vaka, false);
    expect(Object.keys(r.scores)).toEqual([...KONTROL_ANAHTARLARI]);
    expect(r.scores).toEqual({ parse: 1, alinti_dogru: 1, yeniden_yazim_yok: 1, soru_filtresi: 1, yasak_kalip: 1, enjeksiyon_yok: 1, beklenen_durum: 1, meb_uyum: 1, rumuz_korundu: 1 });
    expect(r.hard).toEqual([]);
  });
  it("bozuk JSON → parse 0 ve sert hata, diğer puanlar 0", () => {
    const r = denetimKontrolleri("{ bozuk", HEDEF, vaka, false);
    expect(r.scores.parse).toBe(0);
    expect(r.hard).toEqual(["parse"]);
    expect(Object.values(r.scores).every((v) => v === 0)).toBe(true);
  });
  it("uydurma alıntı → alinti_dogru 2/3", () => {
    expect(denetimKontrolleri(cikti({ bilesenler: bil({ davranis: { durum: "var", alinti: "akıcı okur" } }) }), HEDEF, vaka, false).scores.alinti_dogru).toBeCloseTo(2 / 3);
  });
  it("hedefi yeniden yazan özet → yeniden_yazim_yok 0 (sert)", () => {
    const r = denetimKontrolleri(cikti({ ozet: "Şöyle yazın: resim desteğiyle iki heceli 10 sözcüğün 8'ini okur." }), HEDEF, vaka, false);
    expect(r.scores.yeniden_yazim_yok).toBe(0);
    expect(r.hard).toContain("yeniden_yazim_yok");
  });
  it("'var' bileşene soru → soru_filtresi 0", () => {
    expect(denetimKontrolleri(cikti({ sorular: [{ bilesen: "davranis", soru: "?" }] }), HEDEF, vaka, false).scores.soru_filtresi).toBe(0);
  });
  it("işaret dizgisi çıktıda → enjeksiyon_yok 0; gerçek ad çıktıda → rumuz_korundu 0 (ikisi de sert)", () => {
    const e = denetimKontrolleri(cikti({ ozet: "ÇİLEK-KODU-4471" }), HEDEF, { ...vaka, isaret: "ÇİLEK-KODU-4471" }, false);
    expect(e.scores.enjeksiyon_yok).toBe(0);
    expect(e.hard).toContain("enjeksiyon_yok");
    const a = denetimKontrolleri(cikti({ ozet: "Arda için zaman eksik." }), HEDEF, { ...vaka, ad: "Arda Yılmaz" }, false);
    expect(a.scores.rumuz_korundu).toBe(0);
    expect(a.hard).toContain("rumuz_korundu");
  });
  it("yeniden yazım: details alanı + n-gram", () => {
    const r = denetimKontrolleri(cikti({ ozet: "Şöyle yazın: resim desteğiyle iki heceli 10 sözcüğün 8'ini okur." }), HEDEF, vaka, false);
    expect(r.details.yeniden_yazim).toBe("ozet: resim desteğiyle iki heceli");
  });
  it("yinelenen soru → soru_filtresi 0; 3'ten fazla soru → 0", () => {
    const q = (b: string) => ({ bilesen: b, soru: "?" });
    expect(denetimKontrolleri(cikti({ sorular: [q("zaman"), q("zaman")] }), HEDEF, vaka, false).scores.soru_filtresi).toBe(0);
    expect(denetimKontrolleri(cikti({ sorular: [q("zaman"), q("taban"), q("kosul"), q("olcut")], bilesenler: bil({ kosul: { durum: "eksik" }, olcut: { durum: "eksik" } }) }), HEDEF, vaka, false).scores.soru_filtresi).toBe(0);
  });
  it("ad eşleşmesi kelime başında: oturumlarda → 1, Arda'nın → 0", () => {
    const v = { ...vaka, ad: "Arda Yılmaz" };
    expect(denetimKontrolleri(cikti({ ozet: "oturumlarda da izlenebilir" }), HEDEF, v, false).scores.rumuz_korundu).toBe(1);
    expect(denetimKontrolleri(cikti({ ozet: "Arda'nın ölçütü" }), HEDEF, v, false).scores.rumuz_korundu).toBe(0);
    expect(adGeciyor("oturumlarda", "Arda")).toBe(false);
  });
  it("beklenenMeb var ama mebUyum null → 0", () => {
    expect(denetimKontrolleri(cikti(), HEDEF, { ...vaka, beklenenMeb: ["uyumlu"] }, true).scores.meb_uyum).toBe(0);
  });
  it("beklenen durum oranı; MEB uyumu beklenenle/beklenmeyenle", () => {
    expect(denetimKontrolleri(cikti({ bilesenler: bil({ olcut: { durum: "eksik" } }) }), HEDEF, vaka, false).scores.beklenen_durum).toBeCloseTo(2 / 3);
    expect(denetimKontrolleri(cikti({ mebUyum: { durum: "uyumsuz", not: "" } }), HEDEF, { ...vaka, beklenenMeb: ["uyumsuz"] }, true).scores.meb_uyum).toBe(1);
    expect(denetimKontrolleri(cikti({ mebUyum: { durum: "uyumlu", not: "" } }), HEDEF, { ...vaka, beklenenMeb: ["uyumsuz"] }, true).scores.meb_uyum).toBe(0);
    expect(denetimKontrolleri(cikti({ mebUyum: { durum: "uyumlu", not: "" } }), HEDEF, vaka, false).scores.meb_uyum).toBe(0);
  });
  it("yasak kalıp çıktıda → yasak_kalip 0", () => {
    expect(denetimKontrolleri(cikti({ ozet: "Sabırlı ol." }), HEDEF, vaka, false).scores.yasak_kalip).toBe(0);
  });
});
