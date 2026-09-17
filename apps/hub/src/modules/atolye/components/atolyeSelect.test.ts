import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Atölye açılır listeleri — ok her temada görünür, uzun seçenek okun altına girmez.
 *
 * 2026-09-17'de gerçek bileşenler Atölye CSS yığınıyla (globals + poster + atolye) çizdirilip
 * ölçüldü; üç kusur çıktı:
 *  1. Profil sayfasının PSelect'i (profile-ui) satır içi `background` kısayolu taşıyordu:
 *     kısayol background-image'i sıfırlar, satır içi stil de poster.css'teki ok kuralını ezer.
 *     Ok iki temada da yoktu (Studio PSelect'teki hatanın aynısı).
 *  2. poster.css oku sabit koyu çizgiyle (#18272D) çiziyordu ve koyu tema karşılığı yoktu:
 *     koyu zeminde (#1E1811) ok neredeyse görünmüyordu.
 *  3. atolye.css kompakt dolguyu (`padding: 0 10px`) select'e de uyguluyordu: poster tabanının
 *     ok için bıraktığı 38px sağ boşluk gitti, uzun seçenekler (MEB hedefleri) okun altına
 *     giriyordu.
 *
 * Görsel durum CSS'te yaşadığı için birim testte çizilemez; kilitlenen şey bu üç sözleşme.
 */
const DIR = import.meta.dirname;
const profileUi = readFileSync(path.join(DIR, "profile-ui.tsx"), "utf8");
const atolyeCss = readFileSync(path.resolve(DIR, "../styles/atolye.css"), "utf8");
const posterCss = readFileSync(
  createRequire(import.meta.url).resolve("@ludenlab/ui/styles/poster.css"),
  "utf8",
);

/** CSS `padding` kısayolunun sağ değeri (1 değer: hepsi; 2–4 değer: ikincisi). */
function rightPadding(shorthand: string): number {
  const parts = shorthand.trim().split(/\s+/);
  return parseFloat(parts.length === 1 ? parts[0]! : parts[1]!);
}

describe("Atölye açılır listeleri", () => {
  it("profil PSelect'inin satır içi stili ok görselini sıfırlamaz", () => {
    const component = profileUi.slice(profileUi.indexOf("export const PSelect"));
    const inlineStyle = component.slice(component.indexOf("style={{"), component.indexOf("...style,"));
    expect(inlineStyle, "PSelect satır içi stili bulunamadı").toMatch(/^style=\{\{/);
    expect(inlineStyle).not.toMatch(/\bbackground\s*:/);
    expect(inlineStyle).not.toMatch(/\bbackgroundImage\s*:/);
  });

  it("poster.css koyu temada oku açık renkli çizgiyle çizer", () => {
    const rule = posterCss.match(/\.dark[^{]*\.p-select[^{]*\{([^}]*)\}/);
    expect(rule, "koyu tema .p-select kuralı yok").not.toBeNull();
    expect(rule![1]).toMatch(/background-image:\s*url\([^)]*stroke='%23F5E8C7'/i);
  });

  it("atolye.css select'in sağ boşluğunu okun sığmayacağı kadar daraltmaz", () => {
    const rules = [...atolyeCss.matchAll(/([^{}]*\.p-select[^{}]*)\{([^}]*)\}/g)];
    expect(rules.length, ".p-select kuralı bulunamadı").toBeGreaterThan(0);
    for (const [, selector, body] of rules) {
      const shorthand = body!.match(/(?:^|[;\s])padding\s*:\s*([^;]+);/);
      const longhand = body!.match(/padding-right\s*:\s*([^;]+);/);
      if (shorthand) expect(rightPadding(shorthand[1]!), selector!.trim()).toBeGreaterThanOrEqual(30);
      if (longhand) expect(parseFloat(longhand[1]!), selector!.trim()).toBeGreaterThanOrEqual(30);
    }
  });
});
