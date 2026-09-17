import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Atölye okunurluk bekçileri (2026-09-17 denetimi).
 *
 *  1. `.p-chip` yüksekliği 32 px'e sabitti; uzun MEB davranış metinleri (en uzunu 180 karakter)
 *     iki-üç satıra kırılıp kutudan taşıyor, komşu çiplerin üstüne biniyordu.
 *  2. Öğrenciler sayfasındaki kademe filtresinde seçili hap, zeminden ayırt edilemiyordu
 *     (açık temada 1,14:1, koyu temada 1,30:1).
 *  3. Gönder düğmesindeki yükleniyor halkası düğmenin kendi rengiyle aynıydı (turuncu üstünde
 *     turuncu), dönen parça görünmüyordu.
 *  4. Profil sayfasının açılır listesinde klavye odağı görünmüyordu.
 */
const DIR = import.meta.dirname;
const atolyeCss = readFileSync(path.resolve(DIR, "../styles/atolye.css"), "utf8");
const posterCss = readFileSync(
  createRequire(import.meta.url).resolve("@ludenlab/ui/styles/poster.css"),
  "utf8",
);
const casesManager = readFileSync(path.join(DIR, "CasesManager.tsx"), "utf8");
const profileUi = readFileSync(path.join(DIR, "profile-ui.tsx"), "utf8");

describe("Atölye okunurluk", () => {
  it("çip yüksekliği içeriğe göre büyür", () => {
    const kural = atolyeCss.match(/\.poster-scope \.p-chip\s*\{([^}]*)\}/);
    expect(kural, ".p-chip kuralı yok").not.toBeNull();
    expect(kural![1]).toMatch(/min-height:\s*32px/);
    expect(kural![1]).not.toMatch(/(^|[;\s])height:\s*32px/);
  });

  it("kademe filtresinde seçili hap basılı çip olarak işaretlenir", () => {
    expect(casesManager).toMatch(/aria-pressed=\{kf === k\}/);
    expect(casesManager).not.toMatch(/var\(--poster-accent-soft\)/);
  });

  it("düğme içindeki yükleniyor halkası düğmenin yazı rengini kullanır", () => {
    expect(posterCss).toMatch(/\.p-btn \.p-spinner\s*\{[^}]*border-top-color:\s*currentColor/);
  });

  it("profil açılır listesinde klavye odağı görünür", () => {
    const pselect = profileUi.slice(profileUi.indexOf("export const PSelect"));
    expect(pselect.slice(0, pselect.indexOf("</select>"))).toMatch(/onFocus=\{/);
  });
});
