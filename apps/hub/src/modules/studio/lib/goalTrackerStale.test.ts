import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Hedef takibi — geç gelen yanıt yanlış öğrencinin verisini göstermemeli.
 *
 * A öğrencisinden hızla B'ye geçilip A'nın yanıtı sonra gelirse başlık B'yi, tablo A'nın
 * hedeflerini gösteriyordu; o tabloda işaretlenen ilerleme B'ye kaydediliyordu
 * (2026-09-17 denetimi). Çözüm: her yeni seçim önceki isteği iptal eder.
 *
 * İstek yarışı birim testte kurulamaz; burada kilitlenen şey kalıptır.
 */
const src = readFileSync(
  path.resolve(import.meta.dirname, "../../../app/studio/(main)/tools/goal-tracker/page.tsx"),
  "utf8",
);

describe("hedef takibi — öğrenci değişimi", () => {
  it("bekçi boşa düşmesin: sayfa okunuyor", () => {
    expect(src).toContain("goal-tracker");
  });

  it("her seçim önceki isteği iptal eder ve iptal sinyali fetch'e geçer", () => {
    expect(src).toMatch(/new AbortController\(\)/);
    expect(src).toMatch(/fetch\(`\/studio\/api\/tools\/goal-tracker\/\$\{sid\}`,\s*\{\s*signal\s*\}/);
    expect(src).toMatch(/return \(\) =>[\s\S]{0,60}\.abort\(\)/);
  });
});
