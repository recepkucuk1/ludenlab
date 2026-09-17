import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * PCheckbox — işaretli kutu görünür olmalı.
 *
 * Kutu `appearance: none` ile çiziliyor, yani tarayıcının tik işareti yok. İşaretli görünüm
 * için `accentColor` verilmişti, ama appearance:none iken accent-color etkisiz ve hiçbir
 * :checked kuralı yoktu. Tıklama durumu değiştiriyordu, işaretli kutu ise işaretsizle
 * birebir aynı görünüyordu: haftalık planda odak alanı kutuları "çalışmıyor" sanıldı
 * (2026-09-17). Aynı bileşen seans özeti ve takvimde de kullanılıyor.
 *
 * Görsel durum CSS'te yaşadığı için birim testte çizilemez; kilitlenen şey sözleşmedir:
 * sınıf var, :checked kuralı var ve satır içi stil o kuralı ezmiyor. Satır içi stil her
 * stil sayfası kuralından önceliklidir.
 */
const DIR = import.meta.dirname;
const tsx = readFileSync(path.join(DIR, "index.tsx"), "utf8");
const css = readFileSync(path.resolve(DIR, "../../styles/studio.css"), "utf8");

const component = tsx.slice(
  tsx.indexOf("export const PCheckbox"),
  tsx.indexOf("/* ==================== PSwitch"),
);
const inputStart = component.indexOf("<input");
const inputTag = component.slice(inputStart, component.indexOf("/>", inputStart));

describe("PCheckbox", () => {
  it("bekçi boşa düşmesin: bileşen ve input bulunuyor", () => {
    expect(component.length).toBeGreaterThan(0);
    expect(inputStart).toBeGreaterThan(-1);
  });

  it("input p-checkbox sınıfını taşır", () => {
    expect(inputTag).toMatch(/className=\{`p-checkbox/);
  });

  it("studio.css işaretli kutuyu dolgu ve tik işaretiyle ayırır", () => {
    const rule = css.match(/input\.p-checkbox:checked\s*\{([^}]*)\}/);
    expect(rule, ":checked kuralı yok").not.toBeNull();
    expect(rule![1]).toMatch(/background-color:\s*var\(--poster-accent\)/);
    expect(rule![1]).toMatch(/background-image:\s*url\(/);
  });

  it("satır içi stil arka plan vermez (verirse :checked kuralını ezer)", () => {
    const inlineStyle = inputTag.slice(inputTag.indexOf("style={{"));
    expect(inlineStyle).not.toMatch(/\bbackground\w*\s*:/);
  });
});
