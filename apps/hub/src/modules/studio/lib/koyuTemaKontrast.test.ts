import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Araç formlarında seçili/seçilmemiş durum İKİ TEMADA da okunmalı.
 *
 * Düğme stilleri sabit beyaz kullanıyordu: seçilmemişte `background: "#fff"`, seçilide
 * `color: "#fff"`. Koyu temada yazı rengi kreme döndüğü için krem yazı beyaz zemine, beyaz
 * yazı da krem zemine düşüyordu; ölçülen kontrast 1,2:1 (okunaklı metin için 4,5:1 gerekir).
 * Sesletim'de zorunlu "Hedef ses" düğmelerinin hepsi okunmuyordu (2026-09-17 denetimi).
 *
 * PDF stillerindeki beyazlar KAĞIT içindir, onlara dokunulmaz; kural yalnız `active ?`
 * ile yazılan ekran durum stillerini kapsar. Renkli zeminde (turuncu/sarı/yeşil) yazı
 * `--poster-on-color` ile iki temada da koyu kalır.
 */
const SRC = path.resolve(import.meta.dirname, "../../..");
const TOOLS = path.join(SRC, "app/studio/(main)/tools");
const oku = (p: string) => readFileSync(p, "utf8");

const SAYFALAR = [
  "articulation", "comm-board", "goal-tracker", "homework", "matching-game",
  "phonation", "session-summary", "social-story", "weekly-plan",
];
const studioCss = oku(path.join(SRC, "modules/studio/styles/studio.css"));
const goalTracker = oku(path.join(TOOLS, "goal-tracker/page.tsx"));
const sessionSummary = oku(path.join(TOOLS, "session-summary/page.tsx"));
const poster = oku(path.join(SRC, "modules/studio/components/poster/index.tsx"));

describe("koyu temada durum renkleri", () => {
  it.each([...SAYFALAR.map((s) => [s, path.join(TOOLS, `${s}/page.tsx`)] as const),
           ["CardGeneratorForm", path.join(SRC, "modules/studio/components/cards/CardGeneratorForm.tsx")] as const])(
    "%s: seçili/seçilmemiş renkler sabit beyaz kullanmaz",
    (_ad, dosya) => {
      const kacaklar = oku(dosya).split("\n").filter((l) => /active \?/.test(l) && /#fff/i.test(l));
      expect(kacaklar).toEqual([]);
    },
  );

  it("hedef takibinde boş durum ve not düğmesi tema rengini kullanır", () => {
    const statusBlok = goalTracker.slice(goalTracker.indexOf("const STATUS_OPTIONS"), goalTracker.indexOf("];", goalTracker.indexOf("const STATUS_OPTIONS")));
    expect(statusBlok).not.toMatch(/#fff/i);
    const notBtn = goalTracker.split("\n").filter((l) => /progress\?\.notes \?/.test(l) && /#fff/i.test(l));
    expect(notBtn).toEqual([]);
  });

  it("renkli zemin üstü yazı için tema-bağımsız koyu belirteç tanımlı", () => {
    expect(studioCss).toMatch(/--poster-on-color:\s*#0e1e26/i);
  });

  it("seans özetindeki küçük listenin oku iki temada çizilir", () => {
    // Satır içi `background` kısayolu ok görselini sıfırlıyordu; ok artık CSS sınıfında.
    const mini = sessionSummary.slice(sessionSummary.indexOf("const miniSelect"), sessionSummary.indexOf("};", sessionSummary.indexOf("const miniSelect")));
    expect(mini).not.toMatch(/background:\s*`?var\(--poster-panel\) url/);
    expect(studioCss).toMatch(/select\.p-mini-select\s*\{[^}]*background-image:\s*url\(/);
    expect(studioCss).toMatch(/\.dark[^{]*select\.p-mini-select[^{]*\{[^}]*background-image:\s*url\(/);
  });

  it("açılır listede klavye odağı görünür (PInput'taki gibi)", () => {
    const pselect = poster.slice(poster.indexOf("export const PSelect"), poster.indexOf("/* ==================== PCheckbox"));
    expect(pselect).toMatch(/onFocus=\{/);
    expect(pselect).toMatch(/onBlur=\{/);
  });
});
