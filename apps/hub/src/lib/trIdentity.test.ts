import { describe, expect, it } from "vitest";
import { isValidTckn, isValidVkn, normalizeTrMobile } from "./trIdentity";

describe("isValidTckn", () => {
  it("kontrol haneleri tutan TCKN'yi kabul eder", () => {
    expect(isValidTckn("10000000146")).toBe(true);
  });
  it("hane sayısı doğru ama kontrol hanesi yanlış olanı reddeder", () => {
    expect(isValidTckn("12345678901")).toBe(false);
    expect(isValidTckn("11111111111")).toBe(false);
  });
  it("0 ile başlayanı ve harfliyi reddeder", () => {
    expect(isValidTckn("01234567890")).toBe(false);
    expect(isValidTckn("1000000014a")).toBe(false);
  });
});

describe("isValidVkn", () => {
  it("kontrol hanesi tutan VKN'yi kabul eder", () => {
    expect(isValidVkn("1234567890")).toBe(true);
  });
  it("kontrol hanesi yanlışsa reddeder", () => {
    expect(isValidVkn("1234567891")).toBe(false);
    expect(isValidVkn("123456789")).toBe(false);
  });
});

describe("normalizeTrMobile", () => {
  it("yaygın yazımları +905XXXXXXXXX'e çevirir", () => {
    expect(normalizeTrMobile("0532 123 45 67")).toBe("+905321234567");
    expect(normalizeTrMobile("+90 (532) 123-45-67")).toBe("+905321234567");
    expect(normalizeTrMobile("5321234567")).toBe("+905321234567");
  });
  it("sabit hat ve eksik haneyi reddeder", () => {
    expect(normalizeTrMobile("0212 123 45 67")).toBeNull();
    expect(normalizeTrMobile("0532 123 45")).toBeNull();
  });
});
