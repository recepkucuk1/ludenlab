import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * PSelect — açılır listenin ok işareti görünür olmalı.
 *
 * Ok, studio.css'teki `select.p-select` kuralında background-image olarak çiziliyor. Bileşenin
 * satır içi stilinde `background` kısayolu vardı: kısayol background-image'i de sıfırlar ve
 * satır içi stil her stil sayfası kuralından önceliklidir. Studio'daki açılır listelerin
 * hiçbirinde ok görünmüyordu; gerçek bileşen Studio CSS'iyle çizdirildiğinde hesaplanan
 * background-image "none" çıktı (2026-09-17, onay kutusu incelemesinde bulundu).
 */
const DIR = import.meta.dirname;
const tsx = readFileSync(path.join(DIR, "index.tsx"), "utf8");
const css = readFileSync(path.resolve(DIR, "../../styles/studio.css"), "utf8");

const component = tsx.slice(
  tsx.indexOf("export const PSelect"),
  tsx.indexOf("/* ==================== PCheckbox"),
);
const inlineStyle = component.slice(component.indexOf("style={{"), component.indexOf("...style,"));

describe("PSelect", () => {
  it("bekçi boşa düşmesin: bileşen ve satır içi stil bulunuyor", () => {
    expect(component.length).toBeGreaterThan(0);
    expect(inlineStyle).toMatch(/^style=\{\{/);
  });

  it("studio.css ok işaretini background-image olarak çizer", () => {
    expect(css).toMatch(/select\.p-select\s*\{[^}]*background-image:\s*url\(/);
  });

  it("satır içi stil arka plan görselini sıfırlamaz", () => {
    expect(inlineStyle).not.toMatch(/\bbackground\s*:/);
    expect(inlineStyle).not.toMatch(/\bbackgroundImage\s*:/);
  });
});
