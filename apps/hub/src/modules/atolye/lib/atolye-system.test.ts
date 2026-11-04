// apps/hub/src/modules/atolye/lib/atolye-system.test.ts
import { describe, expect, it } from "vitest";
import { ETIK_SINIR, ORTAK_SON_BLOK } from "@/lib/prompts/ortakBloklar";
import { yasakSozcukDenetimi } from "@/lib/prompts/yasakSozcuk";
import { TASLAK_NOTU } from "./bep";
import { ATOLYE_SYSTEM } from "./atolye-system";

/* Faz 0 (spec 2026-11-03 §4): Atölye'nin bütün araçları Studio ile aynı kapanış bloğunu alır.
   Model çıktısı birim testte ölçülmez; kilitlenen şey MODELE GİDEN METİNDİR. */
describe("ATOLYE_SYSTEM — ortak kapanış bloğu", () => {
  it("ORTAK_SON_BLOK ile biter", () => {
    expect(ATOLYE_SYSTEM.endsWith(ORTAK_SON_BLOK)).toBe(true);
  });
  it("ETİK SINIR tam bir kez geçer ve ortak sabitle aynıdır (satır içi kopya yok)", () => {
    expect(ATOLYE_SYSTEM.match(/ETİK SINIR/g)).toHaveLength(1);
    expect(ATOLYE_SYSTEM).toContain(ETIK_SINIR);
  });
  it("çerçeve, ilgi alanı cümlesi ve taslak notu korunur; bölüm sırası rol → çerçeve → biçim → ortak blok", () => {
    expect(ATOLYE_SYSTEM).toContain("çocuğun ilgi alanlarını etkinliklere taşı");
    expect(ATOLYE_SYSTEM).toContain(`⚠️ ${TASLAK_NOTU}`);
    expect(ATOLYE_SYSTEM).toMatch(
      /Sen LudenLab Atölye'nin[\s\S]*ÇERÇEVE VE İLKELER[\s\S]*BİÇİM \(Markdown[\s\S]*ETİK SINIR[\s\S]*DİL KURALI[\s\S]*RUMUZ NOTU[\s\S]*JENERİK KALIPLAR/,
    );
  });
  it("dil kuralı artık Atölye'de de geçerli: dışsal ödül maddesi ve 'öğrenci/uzman' bloğu var", () => {
    expect(ATOLYE_SYSTEM).toContain("dışsal ödül sistemi ÖNERME");
    expect(ATOLYE_SYSTEM).toContain('"terapist" yerine "uzman"');
  });
  it("yasak sözcük (hasta/terapist) içermez", () => {
    expect(() => yasakSozcukDenetimi(ATOLYE_SYSTEM)).not.toThrow();
  });
});
