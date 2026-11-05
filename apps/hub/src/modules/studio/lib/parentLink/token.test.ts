import { describe, expect, it } from "vitest";
import { TOKEN_LENGTH, generateToken, isTokenShape } from "./token";

describe("generateToken / isTokenShape", () => {
  it("32 karakter base64url üretir; enjekte rastgelelikle deterministik", () => {
    const sabit = () => Buffer.alloc(24, 7);
    expect(generateToken(sabit)).toBe(generateToken(sabit));
    expect(generateToken(sabit)).toHaveLength(TOKEN_LENGTH);
    expect(isTokenShape(generateToken())).toBe(true);
    expect(generateToken()).not.toBe(generateToken());
  });
  it("biçim: tam 32 karakter [A-Za-z0-9_-]; + / = boş reddedilir", () => {
    expect(isTokenShape("a".repeat(32))).toBe(true);
    expect(isTokenShape("a".repeat(31))).toBe(false);
    expect(isTokenShape("a".repeat(33))).toBe(false);
    expect(isTokenShape("a".repeat(31) + "+")).toBe(false);
    expect(isTokenShape("a".repeat(31) + "/")).toBe(false);
    expect(isTokenShape("")).toBe(false);
  });
});
