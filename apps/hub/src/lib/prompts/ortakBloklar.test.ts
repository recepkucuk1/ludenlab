// apps/hub/src/lib/prompts/ortakBloklar.test.ts
import { describe, expect, it } from "vitest";
import { DIL_KURALI, ETIK_SINIR, YASAK_KALIPLAR, yasakKalipBul } from "./ortakBloklar";

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
