import { describe, expect, it } from "vitest";
import { containsWord, countSentences, keepsFinalPosition, runChecks, syllabify } from "./checks";

/* Otomatik kontrollerin kendisi doğru mu? (API yok) — iyi çıktı ≈1, kötü çıktı ≈0 almalı. */

const notes = { title: "Başlık", expertNotes: "Not", cueTypes: ["Görsel"], homeGuidance: "Rehber" };

describe("Türkçe kelime eşleştirme", () => {
  it("ünsüz yumuşaması, ünlü düşmesi ve ekleri yakalar", () => {
    expect(containsWord("Kitabı masaya koydum.", "kitap")).toBe(true);
    expect(containsWord("Ağacın dalları uzun.", "ağaç")).toBe(true);
    expect(containsWord("Burnu kaşınıyor.", "burun")).toBe(true);
    expect(containsWord("Gökkuşağını gördük.", "gökkuşağı")).toBe(true);
    expect(containsWord("Rengini sevdim.", "renk")).toBe(true);
    expect(containsWord("Bahçede top oynadık.", "kalem")).toBe(false);
  });
  it("Türkçe heceler ve sonda pozisyonunu denetler", () => {
    expect(syllabify("kapı")).toEqual(["ka", "pı"]);
    expect(syllabify("Türkçe")).toEqual(["türk", "çe"]);
    expect(syllabify("saat")).toEqual(["sa", "at"]);
    expect(syllabify("ukulele")).toEqual(["u", "ku", "le", "le"]);
    expect(keepsFinalPosition("Duvar çok yüksek.", "duvar")).toBe(true);
    expect(keepsFinalPosition("Duvarı boyadık.", "duvar")).toBe(false);
  });
  it("cümle sayar", () => {
    expect(countSentences("Bir gün parka gittik. Çok eğlendik! Sonra eve döndük.")).toBe(3);
  });
});

describe("runChecks", () => {
  it("doğru hece çıktısı yüksek, hatalı hece çıktısı düşük puan alır", () => {
    const body = { targetSounds: ["/k/"], positions: ["initial", "final"], level: "syllable", itemCount: 4 };
    const good = {
      ...notes,
      items: [
        { word: "ka", syllableType: "açık", exampleWord: "kapı", position: "initial", targetSound: "/k/" },
        { word: "kap", syllableType: "kapalı", exampleWord: "kapkaç", position: "initial", targetSound: "/k/" },
        { word: "bek", syllableType: "kapalı", exampleWord: "bebek", position: "final", targetSound: "/k/" },
        { word: "tak", syllableType: "kapalı", exampleWord: "yatak", position: "final", targetSound: "/k/" },
      ],
    };
    const bad = {
      ...notes,
      items: [
        { word: "ta", syllableType: "kapalı", exampleWord: "tavşan", position: "initial" },
        { word: "kap", syllableType: "açık", exampleWord: "masa", position: "final" },
      ],
    };
    const g = runChecks({ body, drill: good, rawText: JSON.stringify(good), alias: null });
    const b = runChecks({ body, drill: bad, rawText: JSON.stringify(bad), alias: null });
    expect(g.talimat).toBe(1);
    expect(b.talimat).toBeLessThan(0.3);
  });

  it("cümle düzeyinde kelimeyi içermeyen cümleleri yakalar", () => {
    const body = { targetSounds: ["/r/"], positions: ["final"], level: "sentence", itemCount: 2 };
    const good = { ...notes, items: [{ word: "duvar", sentence: "Resmi astığımız yer duvar." }, { word: "motor", sentence: "Babamın aldığı şey motor." }] };
    const bad = { ...notes, items: [{ word: "duvar", sentence: "Evde oturduk." }, { word: "motor", sentence: "" }] };
    expect(runChecks({ body, drill: good, rawText: JSON.stringify(good), alias: null }).talimat).toBe(1);
    expect(runChecks({ body, drill: bad, rawText: JSON.stringify(bad), alias: null }).talimat).toBe(0.5);
  });

  it("kelime düzeyinde items'ı boş bırakmayan modeli ve yasak terimleri yakalar", () => {
    const body = { targetSounds: ["/s/"], positions: ["initial"], level: "word", itemCount: 10 };
    const obeys = { ...notes, items: [] };
    const ignores = { ...notes, expertNotes: "Hasta ile terapist çalışır.", items: [{ word: "sandal" }] };
    const o = runChecks({ body, drill: obeys, rawText: JSON.stringify(obeys), alias: null });
    const i = runChecks({ body, drill: ignores, rawText: JSON.stringify(ignores), alias: null });
    expect(o.talimat).toBe(1);
    expect(i.talimat).toBe(0.5);
    expect(o.dil_kurali).toBe(1);
    expect(i.dil_kurali).toBe(0);
  });

  it("boş ya da çözülemeyen çıktıya 0 verir, rumuz sızıntısını yakalar", () => {
    const body = { targetSounds: ["/ş/"], positions: ["initial"], level: "contextual", itemCount: 1 };
    expect(runChecks({ body, drill: null, rawText: "Bilmiyorum", alias: null }).talimat).toBe(0);
    const leaked = { ...notes, expertNotes: "Deniz için çalışın.", items: [{ word: "şapka", sentence: "Şapkamı taktım. Şimdi çıkıyorum. Şemsiye de aldım." }] };
    const r = runChecks({ body, drill: leaked, rawText: JSON.stringify(leaked), alias: "Deniz" });
    expect(r.rumuz_yok).toBe(0);
    expect(r.talimat).toBe(1);
  });
});
