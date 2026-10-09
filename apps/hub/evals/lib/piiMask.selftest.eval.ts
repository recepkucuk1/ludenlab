// apps/hub/evals/lib/piiMask.selftest.eval.ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PII_MASK_SNIPPETS, maskStatic } from "./piiMask";
import { piiKesit } from "./shim";

const HUB = path.resolve(import.meta.dirname, "../..");
const kaynak = (rel: string) => readFileSync(path.join(HUB, rel), "utf8");

/** Artikülasyon rotasının SYSTEM_PROMPT'undaki örnek cümle (iki maske parçasını da taşır). */
const SYSTEM_ORNEGI =
  "Selin sabah erkenden sahile gitti. Suyun üstünde sarı bir sandal sallanıyordu. Babası sandalı sessizce kıyıya çekti. Selin sevinçle sandala bindi.";

describe("piiMask", () => {
  it("her parça kaynak dosyasında birebir geçer (prompt değişince parça bayatlar → test düşer)", () => {
    expect(PII_MASK_SNIPPETS.length).toBeGreaterThan(0);
    for (const { snippet, source } of PII_MASK_SNIPPETS) expect(kaynak(source), `${source}: «${snippet}»`).toContain(snippet);
    expect(kaynak("src/app/studio/api/tools/articulation/route.ts")).toContain(SYSTEM_ORNEGI);
  });

  it("maskStatic yalnız parçayı aynı uzunlukta `_` ile değiştirir; geri kalan metin ve konumlar korunur", () => {
    const parca = PII_MASK_SNIPPETS[0]!.snippet;
    const metin = `Önce. ${parca}. Sonra Selin geldi.`;
    const maskeli = maskStatic(metin);
    expect(maskeli).toBe(`Önce. ${"_".repeat(parca.length)}. Sonra Selin geldi.`);
    expect(maskeli).toHaveLength(metin.length);
    expect(maskStatic("Parçasız metin: Selin'in kalemi")).toBe("Parçasız metin: Selin'in kalemi");
    expect(maskStatic(`${parca} ${parca}`)).toBe(`${"_".repeat(parca.length)} ${"_".repeat(parca.length)}`); // her geçiş
  });

  it("maske yalnız parçadaki adı gizler: sistem örneği tek başına kapıyı açık bırakır, başka bir 'Selin' yakalanır", () => {
    expect(piiKesit(SYSTEM_ORNEGI, "Selin")).not.toBeNull(); // maskesiz: kapı yanlış alarm verirdi
    expect(piiKesit(maskStatic(SYSTEM_ORNEGI), "Selin")).toBeNull();
    expect(piiKesit(maskStatic(`${SYSTEM_ORNEGI}\n- Ad: Selin`), "Selin")).toContain("Selin");
    expect(piiKesit(maskStatic(`${SYSTEM_ORNEGI} Selinin çantası`), "Selin")).toContain("Selinin");
    // Rotanın tüm kaynak metni: içindeki her "Selin" bir maske parçasındadır.
    expect(piiKesit(maskStatic(kaynak("src/app/studio/api/tools/articulation/route.ts")), "Selin")).toBeNull();
  });
});
