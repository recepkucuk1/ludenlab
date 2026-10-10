// apps/hub/src/lib/prompts/ortakBloklar.test.ts
import { describe, expect, it } from "vitest";
import { DIL_KURALI, ETIK_SINIR, ORTAK_SON_BLOK, RUMUZ_NOTU, YASAK_KALIPLAR, yasakKalipBul, yasakKalipMetni } from "./ortakBloklar";

describe("yasakKalipBul", () => {
  it("kalıbı büyük/küçük harf ve ek farkına rağmen bulur", () => {
    expect(yasakKalipBul("Çok duyulu yaklaşım kullanın; sabırlı olun.")).toEqual([
      "çok duyulu yaklaşım kullan",
      "sabırlı ol",
    ]);
  });
  it("kalıp yoksa boş dizi döner", () => {
    expect(yasakKalipBul("Ayna karşısında dil ucunu alt dişlerin arkasına yerleştirin.")).toEqual([]);
  });
  it("aynı kalıbı bir kez sayar", () => {
    expect(yasakKalipBul("Sabırlı olun. Sabırlı olmak gerekir.")).toEqual(["sabırlı ol"]);
  });
  it("Türkçe büyük harfleri (İ/I) doğru küçültür ve liste sırasını korur", () => {
    expect(yasakKalipBul("DÜZENLİ TEKRAR ÖNEMLİDİR. SABIRLI OLUN.")).toEqual(["sabırlı ol", "düzenli tekrar önemli"]);
  });
  it("ünsüz yumuşamasıyla çekimli 'edin' biçimini yakalar", () => {
    expect(yasakKalipBul("Gelişimini takip edin.")).toEqual(["gelişimini takip e"]);
  });
  it("satır sonu ve çoklu boşluk kalıbı bozmaz", () => {
    expect(yasakKalipBul("Sabırlı\n  olun.")).toEqual(["sabırlı ol"]);
  });
});

describe("ortak bloklar", () => {
  it("liste ve metinler boş değil", () => {
    expect(YASAK_KALIPLAR.length).toBeGreaterThanOrEqual(8);
    expect(ETIK_SINIR).toMatch(/TIBBİ TANI KOYMA/);
    expect(DIL_KURALI).toMatch(/öğrenci/);
  });
  it("liste girdileri küçük harf, kırpılmış ve tekil", () => {
    for (const k of YASAK_KALIPLAR) {
      expect(k).toBe(k.toLocaleLowerCase("tr-TR").trim());
    }
    expect(new Set(YASAK_KALIPLAR).size).toBe(YASAK_KALIPLAR.length);
  });
});

describe("RUMUZ_NOTU / yasakKalipMetni / ORTAK_SON_BLOK", () => {
  it("RUMUZ_NOTU boş değil, 'verilen ad' içerir, başlıklı ve ETİK SINIR'ın 3. maddesini yinelemez", () => {
    expect(RUMUZ_NOTU.trim().length).toBeGreaterThan(0);
    expect(RUMUZ_NOTU).toContain("verilen ad");
    expect(RUMUZ_NOTU).toContain("rumuz olabilir");
    expect(RUMUZ_NOTU.startsWith("RUMUZ NOTU")).toBe(true);
    expect(ETIK_SINIR).toContain("yalnız sana verilen adıyla bahset");
    expect(RUMUZ_NOTU).not.toContain("yalnız sana verilen");
  });
  it("yasakKalipMetni listedeki her kalıbı tırnak içinde içerir ve 'somut bir eylemle birlikte' der", () => {
    const m = yasakKalipMetni();
    for (const k of YASAK_KALIPLAR) expect(m).toContain(`"${k}`);
    expect(m).toContain("somut bir eylemle birlikte");
    expect(m).toMatch(/yerine/);
  });
  it("yasakKalipMetni tuhaf okunan gövdeyi okunur biçimde gösterir ve çekimli biçimleri kapsadığını söyler", () => {
    const m = yasakKalipMetni();
    expect(m).toContain('"gelişimini takip et"');
    expect(m).not.toContain("takip e\"");
    expect(m).not.toContain("…");
    expect(m).toContain("(çekimli biçimleri dahil)");
  });
  it("yasakKalipMetni kalıpları sayacın tanıdığı gövde biçimiyle anar (liste sırasıyla hepsi bulunur)", () => {
    expect(yasakKalipBul(yasakKalipMetni())).toEqual(YASAK_KALIPLAR.slice());
  });
  it("ORTAK_SON_BLOK sırası: etik sınır → dil kuralı → rumuz notu → yasak kalıplar; boş satırla ayrılır", () => {
    const parcalar = [ETIK_SINIR, DIL_KURALI, RUMUZ_NOTU, yasakKalipMetni()];
    expect(ORTAK_SON_BLOK).toBe(parcalar.join("\n\n"));
    const sira = parcalar.map((b) => ORTAK_SON_BLOK.indexOf(b));
    expect(sira.every((i) => i >= 0)).toBe(true);
    expect([...sira].sort((a, b) => a - b)).toEqual(sira);
  });
});
