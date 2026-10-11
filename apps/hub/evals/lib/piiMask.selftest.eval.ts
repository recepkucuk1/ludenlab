// apps/hub/evals/lib/piiMask.selftest.eval.ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PII_MASK_SNIPPETS, maskStatic } from "./piiMask";
import { piiKesit } from "./shim";

const HUB = path.resolve(import.meta.dirname, "../..");
const kaynak = (rel: string) => readFileSync(path.join(HUB, rel), "utf8");

/** Düzeneğin davranışı için yapay parça (üretim listesi boş: artikülasyon örneği Faz 2 / Task 11'de adsız oldu). */
const PARCA = "Selin sabah erkenden sahile gitti";
const SISTEM_ORNEGI = `${PARCA}. Suyun üstünde sarı bir sandal sallanıyordu.`;
const YAPAY = [{ snippet: PARCA }];

describe("piiMask", () => {
  it("üretim listesi boş; varsa her parça kaynak dosyasında birebir geçer (prompt değişince parça bayatlar → test düşer)", () => {
    expect(PII_MASK_SNIPPETS).toEqual([]);
    for (const { snippet, source } of PII_MASK_SNIPPETS) expect(kaynak(source), `${source}: «${snippet}»`).toContain(snippet);
    // Eski tek girdi gerçekten kalktı: artikülasyon rotası adlı örnek cümleyi taşımaz (başlık yorumu geçmişi anar).
    expect(kaynak("src/app/studio/api/tools/articulation/route.ts")).not.toContain(PARCA);
  });

  it("boş listeyle maskStatic metni aynen döner (üretim davranışı: maske yok, her ad yakalanır)", () => {
    expect(maskStatic(SISTEM_ORNEGI)).toBe(SISTEM_ORNEGI);
    expect(piiKesit(maskStatic(SISTEM_ORNEGI), "Selin")).not.toBeNull();
  });

  it("maskStatic yalnız parçayı aynı uzunlukta `_` ile değiştirir; geri kalan metin ve konumlar korunur", () => {
    const metin = `Önce. ${PARCA}. Sonra Selin geldi.`;
    const maskeli = maskStatic(metin, YAPAY);
    expect(maskeli).toBe(`Önce. ${"_".repeat(PARCA.length)}. Sonra Selin geldi.`);
    expect(maskeli).toHaveLength(metin.length);
    expect(maskStatic("Parçasız metin: Selin'in kalemi", YAPAY)).toBe("Parçasız metin: Selin'in kalemi");
    expect(maskStatic(`${PARCA} ${PARCA}`, YAPAY)).toBe(`${"_".repeat(PARCA.length)} ${"_".repeat(PARCA.length)}`); // her geçiş
  });

  it("maske yalnız parçadaki adı gizler: sistem örneği tek başına kapıyı açık bırakır, başka bir 'Selin' yakalanır", () => {
    expect(piiKesit(SISTEM_ORNEGI, "Selin")).not.toBeNull(); // maskesiz: kapı yanlış alarm verirdi
    expect(piiKesit(maskStatic(SISTEM_ORNEGI, YAPAY), "Selin")).toBeNull();
    expect(piiKesit(maskStatic(`${SISTEM_ORNEGI}\n- Ad: Selin`, YAPAY), "Selin")).toContain("Selin");
    expect(piiKesit(maskStatic(`${SISTEM_ORNEGI} Selinin çantası`, YAPAY), "Selin")).toContain("Selinin");
  });
});
