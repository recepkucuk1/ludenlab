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
});

describe("ortak bloklar", () => {
  it("liste ve metinler boş değil", () => {
    expect(YASAK_KALIPLAR.length).toBeGreaterThanOrEqual(8);
    expect(ETIK_SINIR).toMatch(/TIBBİ TANI KOYMA/);
    expect(DIL_KURALI).toMatch(/öğrenci/);
  });
});
